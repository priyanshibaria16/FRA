# FRA Atlas & DSS (Forest Rights Act Atlas & Decision Support System)

A comprehensive system for managing Forest Rights Act (FRA) claims with AI-powered decision support.

## Project Structure

```
FRA/
├── backend/               # FastAPI backend
│   └── server.py         # Main FastAPI application
├── frontend/             # React frontend
├── tests/                # Test files
├── uploads/              # Uploaded documents
├── .env                  # Environment variables
├── requirements.txt      # Python dependencies
└── README.md            # This file
```

## Prerequisites

1. Python 3.8+
2. Node.js 16+
3. MongoDB (local or remote)
4. npm or yarn

## Backend Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Set up environment variables in `.env` file.

3. Run the backend server:
   ```bash
   cd backend
   uvicorn server:app --reload --port 8001
   ```
   The API will be available at `http://localhost:8001`

## Frontend Setup

1. Install Node.js dependencies:
   ```bash
   cd frontend
   npm install
   ```

2. Start the development server:
   ```bash
   npm start
   ```
   The frontend will be available at `http://localhost:3000`

## Running Tests

1. Run the backend tests:
   ```bash
   python backend_test.py
   ```

## API Documentation

Once the backend is running, you can access the API documentation at:
- Swagger UI: `http://localhost:8001/docs`
- ReDoc: `http://localhost:8001/redoc`

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
# MongoDB Configuration
MONGO_URL=mongodb://localhost:27017
DB_NAME=fra_atlas_db

# JWT Configuration
JWT_SECRET_KEY=your_secret_key_here
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30

# File Upload Settings
UPLOAD_FOLDER=./uploads
MAX_CONTENT_LENGTH=16777216  # 16MB
ALLOWED_EXTENSIONS={'pdf', 'png', 'jpg', 'jpeg', 'gif'}

# AI Integration (optional)
EMERGENT_LLM_KEY=your_emergent_llm_key_here
```
