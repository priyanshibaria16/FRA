from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import FileResponse, HTMLResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Union
import jwt
import bcrypt
import os
import uuid
import json
from dotenv import load_dotenv
import asyncio
from pathlib import Path

# Load environment variables
load_dotenv()

# Determine the base directory
BASE_DIR = Path(__file__).parent.parent
FRONTEND_BUILD_DIR = BASE_DIR / "frontend" / "build"

app = FastAPI(title="AI-Powered FRA Atlas & DSS API", docs_url="/api/docs", redoc_url="/api/redoc")

# Serve static files from the React build directory
if FRONTEND_BUILD_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(FRONTEND_BUILD_DIR / "static")), name="static")
    templates = Jinja2Templates(directory=str(FRONTEND_BUILD_DIR))
else:
    print("Warning: Frontend build directory not found. Run 'npm run build' in the frontend directory.")
    templates = None

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Security
security = HTTPBearer()

# Database configuration
MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DB_NAME", "fra_atlas_db")
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "fra_atlas_secret_key_2024")
EMERGENT_LLM_KEY = os.getenv("EMERGENT_LLM_KEY")

# MongoDB client
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

# Pydantic models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role: str  # Community User, NGO, District Officer, Ministry
    phone: Optional[str] = None
    address: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(alias="_id", default_factory=lambda: str(uuid.uuid4()))
    email: str
    full_name: str
    role: str
    phone: Optional[str] = None
    address: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class FRAClaim(BaseModel):
    id: str = Field(alias="_id", default_factory=lambda: str(uuid.uuid4()))
    user_id: Optional[str] = None  # Will be set automatically from current_user
    title: str
    description: str
    location: Dict[str, Any]  # {lat, lng, address, state, district, village}
    status: str = "pending"  # pending, approved, rejected, under_review
    documents: List[str] = []  # file paths
    ai_analysis: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    area_hectares: Optional[float] = None
    forest_type: Optional[str] = None
    community_details: Optional[str] = None

class ClaimUpdate(BaseModel):
    status: str
    officer_notes: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_data: dict) -> str:
    payload = {
        "user_id": user_data.get("_id") or user_data.get("id"),
        "email": user_data["email"],
        "role": user_data["role"],
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return jwt.encode(payload, JWT_SECRET_KEY, algorithm="HS256")

def verify_jwt_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user = await db.users.find_one({"_id": payload["user_id"]})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# AI Integration Functions
async def analyze_document_with_ai(file_path: str, claim_data: dict) -> str:
    """Analyze uploaded documents using Gemini AI"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"doc_analysis_{datetime.utcnow().timestamp()}",
            system_message="You are an AI assistant specialized in analyzing FRA (Forest Rights Act) claim documents. Extract key information and provide insights."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Create file content object
        document_file = FileContentWithMimeType(
            file_path=file_path,
            mime_type="application/pdf" if file_path.endswith('.pdf') else "image/jpeg"
        )
        
        analysis_prompt = f"""
        Analyze this FRA claim document and extract the following information:
        1. Claimant details (name, address, community)
        2. Land details (area, location, forest type)
        3. Evidence of traditional occupation
        4. Document authenticity indicators
        5. Any missing information or red flags
        
        Context: This claim is for {claim_data.get('title', 'Forest Rights')} in {claim_data.get('location', {}).get('address', 'Unknown location')}.
        
        Provide a structured analysis in JSON format.
        """
        
        user_message = UserMessage(
            text=analysis_prompt,
            file_contents=[document_file]
        )
        
        response = await chat.send_message(user_message)
        return response
        
    except Exception as e:
        return f"AI analysis failed: {str(e)}"

async def generate_insights_for_dashboard(claims_data: List[dict]) -> dict:
    """Generate AI insights for the dashboard"""
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        chat = LlmChat(
            api_key=EMERGENT_LLM_KEY,
            session_id=f"dashboard_insights_{datetime.utcnow().timestamp()}",
            system_message="You are an AI assistant specialized in analyzing FRA claims data and providing policy insights."
        ).with_model("gemini", "gemini-2.0-flash")
        
        # Prepare data summary
        total_claims = len(claims_data)
        approved = len([c for c in claims_data if c.get('status') == 'approved'])
        pending = len([c for c in claims_data if c.get('status') == 'pending'])
        rejected = len([c for c in claims_data if c.get('status') == 'rejected'])
        
        prompt = f"""
        Analyze the following FRA claims statistics and provide insights:
        
        Total Claims: {total_claims}
        Approved: {approved}
        Pending: {pending}
        Rejected: {rejected}
        
        Sample claims data: {json.dumps(claims_data[:5], default=str)}
        
        Provide insights on:
        1. Approval patterns and trends
        2. Areas with highest delays
        3. Recommendations for better processing
        4. Potential fraud indicators
        5. Policy recommendations
        
        Return as structured JSON with categories: trends, recommendations, alerts, statistics.
        """
        
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        return {
            "ai_insights": response,
            "generated_at": datetime.utcnow().isoformat()
        }
        
    except Exception as e:
        return {
            "ai_insights": f"Insights generation failed: {str(e)}",
            "generated_at": datetime.utcnow().isoformat()
        }

# API Routes

@app.get("/")
async def root():
    return {"message": "AI-Powered FRA Atlas & DSS API", "status": "running"}

@app.get("/api/")
async def api_root():
    return {"message": "AI-Powered FRA Atlas & DSS API", "status": "running"}

# Authentication routes
@app.post("/api/auth/register")
async def register_user(user_data: UserRegister):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password and create user
    hashed_password = hash_password(user_data.password)
    user_dict = {
        "_id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": hashed_password,
        "full_name": user_data.full_name,
        "role": user_data.role,
        "phone": user_data.phone,
        "address": user_data.address,
        "created_at": datetime.utcnow()
    }
    
    await db.users.insert_one(user_dict)
    
    # Create JWT token
    user_dict_for_response = user_dict.copy()
    user_dict_for_response.pop("password")  # Remove password from response
    token = create_jwt_token(user_dict_for_response)
    
    return {"token": token, "user": user_dict_for_response}

@app.post("/api/auth/login")
async def login_user(login_data: UserLogin):
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user.pop("password")  # Remove password from response
    token = create_jwt_token(user)
    
    return {"token": token, "user": user}

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    current_user.pop("password", None)
    return current_user

# FRA Claims routes
@app.post("/api/claims")
async def create_claim(claim_data: FRAClaim, current_user: dict = Depends(get_current_user)):
    claim_dict = claim_data.dict()
    claim_dict["user_id"] = current_user["_id"]
    claim_dict["_id"] = str(uuid.uuid4())
    claim_dict["created_at"] = datetime.utcnow()
    claim_dict["updated_at"] = datetime.utcnow()
    
    await db.claims.insert_one(claim_dict)
    return claim_dict

@app.get("/api/claims")
async def get_claims(current_user: dict = Depends(get_current_user)):
    # Filter based on user role
    if current_user["role"] in ["Community User"]:
        claims = await db.claims.find({"user_id": current_user["_id"]}).to_list(length=None)
    else:
        claims = await db.claims.find().to_list(length=None)
    
    return claims

@app.get("/api/claims/{claim_id}")
async def get_claim(claim_id: str, current_user: dict = Depends(get_current_user)):
    claim = await db.claims.find_one({"_id": claim_id})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    # Check access permissions
    if current_user["role"] == "Community User" and claim["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    return claim

@app.put("/api/claims/{claim_id}/status")
async def update_claim_status(
    claim_id: str, 
    update_data: ClaimUpdate, 
    current_user: dict = Depends(get_current_user)
):
    # Only officers and ministry can update status
    if current_user["role"] not in ["District Officer", "Ministry"]:
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    
    update_dict = {
        "status": update_data.status,
        "updated_at": datetime.utcnow(),
        "officer_notes": update_data.officer_notes,
        "reviewed_by": current_user["_id"]
    }
    
    result = await db.claims.update_one(
        {"_id": claim_id},
        {"$set": update_dict}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    return {"message": "Claim status updated successfully"}

@app.post("/api/claims/{claim_id}/upload")
async def upload_document(
    claim_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    # Verify claim ownership or officer access
    claim = await db.claims.find_one({"_id": claim_id})
    if not claim:
        raise HTTPException(status_code=404, detail="Claim not found")
    
    if current_user["role"] == "Community User" and claim["user_id"] != current_user["_id"]:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Create uploads directory
    upload_dir = Path("/app/uploads")
    upload_dir.mkdir(exist_ok=True)
    
    # Save file
    file_path = upload_dir / f"{claim_id}_{file.filename}"
    with open(file_path, "wb") as buffer:
        content = await file.read()
        buffer.write(content)
    
    # Run AI analysis on the document
    ai_analysis = await analyze_document_with_ai(str(file_path), claim)
    
    # Update claim with document and AI analysis
    await db.claims.update_one(
        {"_id": claim_id},
        {
            "$push": {"documents": str(file_path)},
            "$set": {
                "ai_analysis": ai_analysis,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    return {
        "message": "Document uploaded and analyzed successfully",
        "file_path": str(file_path),
        "ai_analysis": ai_analysis
    }

# Dashboard and Analytics routes
@app.get("/api/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    # Basic statistics
    total_claims = await db.claims.count_documents({})
    approved_claims = await db.claims.count_documents({"status": "approved"})
    pending_claims = await db.claims.count_documents({"status": "pending"})
    rejected_claims = await db.claims.count_documents({"status": "rejected"})
    
    # Get all claims for AI analysis
    all_claims = await db.claims.find().to_list(length=None)
    
    # Generate AI insights
    ai_insights = await generate_insights_for_dashboard(all_claims)
    
    return {
        "statistics": {
            "total_claims": total_claims,
            "approved_claims": approved_claims,
            "pending_claims": pending_claims,
            "rejected_claims": rejected_claims,
            "approval_rate": (approved_claims / total_claims * 100) if total_claims > 0 else 0
        },
        "ai_insights": ai_insights,
        "last_updated": datetime.utcnow().isoformat()
    }

@app.get("/api/dashboard/map-data")
async def get_map_data(current_user: dict = Depends(get_current_user)):
    claims = await db.claims.find().to_list(length=None)
    
    # Format data for map visualization
    map_data = []
    for claim in claims:
        if claim.get("location"):
            map_data.append({
                "id": claim["_id"],
                "title": claim["title"],
                "status": claim["status"],
                "location": claim["location"],
                "created_at": claim["created_at"].isoformat() if isinstance(claim["created_at"], datetime) else str(claim["created_at"])
            })
    
    return map_data

# Reports routes
@app.get("/api/reports/summary")
async def get_summary_report(current_user: dict = Depends(get_current_user)):
    # Generate summary statistics by region
    pipeline = [
        {
            "$group": {
                "_id": "$location.state",
                "total_claims": {"$sum": 1},
                "approved": {"$sum": {"$cond": [{"$eq": ["$status", "approved"]}, 1, 0]}},
                "pending": {"$sum": {"$cond": [{"$eq": ["$status", "pending"]}, 1, 0]}},
                "rejected": {"$sum": {"$cond": [{"$eq": ["$status", "rejected"]}, 1, 0]}}
            }
        }
    ]
    
    state_summary = await db.claims.aggregate(pipeline).to_list(length=None)
    
    return {
        "report_type": "summary",
        "generated_at": datetime.utcnow().isoformat(),
        "data": state_summary
    }

# Catch-all route for React Router
def serve_react_app(request: Request):
    if templates:
        return templates.TemplateResponse("index.html", {"request": request})
    return {"message": "Frontend not built. Run 'npm run build' in the frontend directory."}

# Add catch-all route for React Router
@app.get("/{full_path:path}", response_class=HTMLResponse)
async def catch_all(full_path: str, request: Request):
    # If the path starts with /api, it's an API endpoint
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API endpoint not found")
    
    # Check if the file exists in the static directory
    static_file = FRONTEND_BUILD_DIR / full_path
    if static_file.exists() and static_file.is_file():
        return FileResponse(static_file)
    
    # If no file found, serve the React app (it will handle 404s)
    return serve_react_app(request)

# Add a root route for the React app
@app.get("/", response_class=HTMLResponse)
async def root(request: Request):
    return serve_react_app(request)

if __name__ == "__main__":
    import uvicorn
    # Run on port 8000 by default
    uvicorn.run("server:app", host="0.0.0.0", port=8000, reload=True)