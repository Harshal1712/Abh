@echo off
echo Starting Python ML Service...
start cmd /k "cd python-ml-service && python -m uvicorn app:app --reload --port 8000"

echo Starting Node Backend...
start cmd /k "cd Multimodal_Disaster_Intelligence_system\backend && npm run dev"

echo Starting React Frontend...
start cmd /k "cd Multimodal_Disaster_Intelligence_system\frontend && npm run dev"

echo All servers are starting in new windows!
