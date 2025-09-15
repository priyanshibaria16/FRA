@echo off
setlocal enabledelayedexpansion
echo Starting FRA Atlas & DSS in single-port mode...

REM Set environment variables
set PYTHONPATH=.
set FLASK_APP=backend/server.py
set FLASK_ENV=development

REM Create uploads directory if it doesn't exist
if not exist "uploads" mkdir uploads

echo [1/4] Installing Python dependencies...
pip install -r requirements.txt
if !ERRORLEVEL! NEQ 0 (
    echo Failed to install Python dependencies
    pause
    exit /b !ERRORLEVEL!
)

echo [2/4] Installing frontend dependencies...
cd frontend
call npm install
if !ERRORLEVEL! NEQ 0 (
    echo Failed to install frontend dependencies
    cd ..
    pause
    exit /b !ERRORLEVEL!
)

echo [3/4] Building frontend...
call npm run build
if !ERRORLEVEL! NEQ 0 (
    echo Failed to build frontend
    cd ..
    pause
    exit /b !ERRORLEVEL!
)
cd ..

echo [4/4] Starting backend server...
echo.
echo ========================================
echo FRA Atlas & DSS is starting...
echo Frontend will be available at: http://localhost:8000
echo API documentation: http://localhost:8000/api/docs
echo ========================================
echo.

REM Start the backend server (which will serve the frontend)
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload

REM Keep the window open after execution
if %ERRORLEVEL% NEQ 0 pause
