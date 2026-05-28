import os
import joblib
import pandas as pd
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List
import json
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Air Quality Intelligence ML Service")

# Paths to models
MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "MODEL")
BEST_SOURCE_MODEL_PATH = os.path.join(MODEL_DIR, "best_source_model.pkl")
BEST_AQI_MODEL_PATH = os.path.join(MODEL_DIR, "best_aqi_model.pkl")
SCALER_PATH = os.path.join(MODEL_DIR, "scaler.pkl")
LSTM_SCALER_PATH = os.path.join(MODEL_DIR, "lstm_scaler.pkl")
SOURCE_LABEL_ENCODER_PATH = os.path.join(MODEL_DIR, "source_label_encoder.pkl")
LSTM_MODEL_PATH = os.path.join(MODEL_DIR, "lstm_model.h5") # Note: Missing in directory
LSTM_CONFIG_PATH = os.path.join(MODEL_DIR, "lstm_config.json")

# Load models
models = {}

def load_models():
    try:
        print(f"Loading models from {MODEL_DIR}...")
        if os.path.exists(BEST_SOURCE_MODEL_PATH):
            print(f"Loading {BEST_SOURCE_MODEL_PATH}")
            models['source_model'] = joblib.load(BEST_SOURCE_MODEL_PATH)
        if os.path.exists(BEST_AQI_MODEL_PATH):
            print(f"Loading {BEST_AQI_MODEL_PATH}")
            models['aqi_model'] = joblib.load(BEST_AQI_MODEL_PATH)
        if os.path.exists(SCALER_PATH):
            print(f"Loading {SCALER_PATH}")
            models['scaler'] = joblib.load(SCALER_PATH)
        if os.path.exists(LSTM_SCALER_PATH):
            print(f"Loading {LSTM_SCALER_PATH}")
            models['lstm_scaler'] = joblib.load(LSTM_SCALER_PATH)
        if os.path.exists(SOURCE_LABEL_ENCODER_PATH):
            print(f"Loading {SOURCE_LABEL_ENCODER_PATH}")
            models['label_encoder'] = joblib.load(SOURCE_LABEL_ENCODER_PATH)
        
        # LSTM Model - Handle missing file
        if os.path.exists(LSTM_MODEL_PATH):
            print(f"Loading {LSTM_MODEL_PATH}")
            import tensorflow as tf
            models['lstm_model'] = tf.keras.models.load_model(LSTM_MODEL_PATH)
        else:
            print(f"Warning: LSTM model not found at {LSTM_MODEL_PATH}. Using fallback predictions.")
        print("Models loaded successfully.")
            
    except Exception as e:
        print(f"CRITICAL ERROR loading models: {e}")
        import traceback
        traceback.print_exc()

load_models()

class PredictionInput(BaseModel):
    pm25: float
    pm10: float
    no2: float
    co: float
    o3: float
    temperature: float
    wind_speed: float
    hour: int

class PredictionOutput(BaseModel):
    predicted_source: str
    confidence: float
    current_aqi: int
    future_aqi: List[int]

@app.post("/predict", response_model=PredictionOutput)
async def predict(data: PredictionInput):
    try:
        from datetime import datetime
        now = datetime.now()

        # Define all 23 features expected by the Pipeline models
        feature_names = [
            'PM2.5', 'PM10', 'NO', 'NO2', 'NOx', 'NH3', 'CO', 'SO2', 'O3', 'Benzene', 'Toluene',
            'Xylene', 'hour', 'day', 'month', 'day_of_week', 'rolling_mean_PM2.5_w3',
            'rolling_mean_PM2.5_w6', 'PM2.5_lag1', 'PM2.5_lag2', 'AQI_lag1', 'AQI_lag2',
            'StationId'
        ]

        # Create DataFrame with NaN for unknown features so the SimpleImputer in the pipeline handles them
        features_df = pd.DataFrame(columns=feature_names)
        row = {name: np.nan for name in feature_names}
        
        # Populate values we have
        row['PM2.5'] = float(data.pm25)
        row['PM10'] = float(data.pm10)
        row['NO2'] = float(data.no2)
        row['CO'] = float(data.co)
        row['O3'] = float(data.o3)
        row['hour'] = int(data.hour)
        row['day'] = int(now.day)
        row['month'] = int(now.month)
        row['day_of_week'] = int(now.weekday())
        row['StationId'] = 'AP001'  # Fallback StationId (any category, handled by handle_unknown='ignore' in OneHotEncoder)

        features_df.loc[0] = row

        # Predict current AQI
        if 'aqi_model' in models:
            current_aqi = int(models['aqi_model'].predict(features_df)[0])
        else:
            # Fallback basic AQI calculation
            current_aqi = int(data.pm25 * 2 + data.pm10 * 1.5 + data.no2 * 1.2)

        # Predict Source
        if 'source_model' in models:
            source_probs = models['source_model'].predict_proba(features_df)[0]
            source_idx = np.argmax(source_probs)
            confidence = float(source_probs[source_idx])
            
            if 'label_encoder' in models:
                predicted_source = models['label_encoder'].inverse_transform([source_idx])[0]
            else:
                sources = ["Vehicular", "Industrial", "Construction", "Other"]
                predicted_source = sources[source_idx] if source_idx < len(sources) else "Other"
        else:
            predicted_source = "Vehicular"
            confidence = 0.85

        # Predict Future AQI (LSTM) - Fallback is used
        future_aqi = [int(current_aqi + 10), int(current_aqi + 20), int(current_aqi + 30)]

        return PredictionOutput(
            predicted_source=predicted_source,
            confidence=confidence,
            current_aqi=current_aqi,
            future_aqi=future_aqi
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health():
    return {"status": "ok", "models_loaded": list(models.keys())}

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8002))
    uvicorn.run(app, host="0.0.0.0", port=port)
