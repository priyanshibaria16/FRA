#!/bin/bash
echo "Starting FRA Atlas & DSS in single-port mode..."

# Set environment variables
export PYTHONPATH=.
export FLASK_APP=backend/server.py
export FLASK_ENV=development

# Create uploads directory if it doesn't exist
mkdir -p uploads

# Install Python dependencies if not already installed
pip install -r requirements.txt

# Build the frontend
cd frontend
npm install
npm run build
cd ..

# Start the backend server (which will serve the frontend)
python -m uvicorn backend.server:app --host 0.0.0.0 --port 8000 --reload
