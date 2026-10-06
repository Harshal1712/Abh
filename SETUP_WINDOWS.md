# Setup Instructions (Windows)

## Prerequisites
- Node.js (v18+)
- Python 3.9+
- MongoDB

## Python ML Service
1. `cd python-ml-service`
2. `pip install -r requirements.txt` (or install rasterio, pandas, joblib, catboost)
3. `python app.py`

## Backend Startup
1. `cd Multimodal_Disaster_Intelligence_system/backend`
2. `npm install`
3. Rename `.env.example` to `.env` and fill in credentials.
4. `npm run dev`

## Frontend Startup
1. `cd Multimodal_Disaster_Intelligence_system/frontend`
2. `npm install`
3. `npm start`
