# Air Quality Intelligence System (BreathMetrics)

A complete production-ready full-stack web application for real-time pollution monitoring, source detection, and deep-learning-based AQI forecasting.

## 🚀 Features
- **Real-time Monitoring**: Integrates local coordinates and live environmental APIs for pollution and weather data.
- **ML Predictions & Analytics**:
  - Source detection (Vehicular, Industrial, Construction, etc.)
  - Current AQI prediction & classification
  - Future AQI forecasting (Deep Learning based time-series forecasting)
- **Interactive Dashboard**:
  - Beautiful Premium Cool Slate-Blue & Sage Green UI with custom SVG rendering for pristine charts (No external watermarks).
  - Leaflet.js geospatial mapping with dynamic AQI hotspot area highlighting.
  - Smart AI Recommendation engine based on primary pollution sources.
  - Evacuation alert overlay for hazardous AQI levels (>200).

## 🏗️ Tech Stack
- **Frontend**: React.js, Vite, Tailwind CSS, Lucide Icons, Custom SVG Charts, React-Leaflet
- **Backend**: Node.js, Express, MongoDB (Mongoose)
- **ML Service**: Python, FastAPI, Scikit-learn, TensorFlow/Keras, Pandas, Uvicorn

## 📂 Project Structure
- `/frontend`: Modern React application built with Vite
- `/backend`: Node.js Express REST API server
- `/ml-service`: Python FastAPI serving scikit-learn and LSTM models
- `/MODEL`: Directory storing pre-trained models (`.pkl`, `.h5`) and scalers

## 🛠️ Installation & Setup

### Prerequisites
- Node.js & npm (v18+ recommended)
- Python 3.8+
- MongoDB (Running locally on default port `27017` or configured via Atlas)

### Setup Steps
1. **Clone the repository** & navigate into it.
2. **Install all dependencies** (This installs root tools, backend, and frontend packages):
   ```bash
   npm run install-all
   ```
3. **ML Service Setup**:
   ```bash
   cd ml-service
   pip install -r requirements.txt
   ```
4. **Environment Variables Config Details**:
   - Backend (`/backend/.env`):
     ```env
     PORT=5001
     MONGODB_URI=mongodb://localhost:27017/aqi_intelligence
     ML_SERVICE_URL=http://localhost:8002/predict
     OPENAQ_API_KEY= # (Optional, depending on your data fetching logic)
     ```
   - ML Service (`/ml-service/.env`):
     ```env
     PORT=8002
     MODEL_DIR=../MODEL
     ```

### Running the System
You can launch the entire ecosystem (Frontend, Backend, and ML Service) concurrently with one command from the root directory:
```bash
npm run dev
```

Alternatively, run them individually:
- **Backend**: `npm run backend` (Runs on Port `5001`)
- **Frontend**: `npm run frontend` (Runs on Port `5173` or `5174`)
- **ML Service**: `npm run ml-service` (Runs on Port `8002`)

> **Note on Port Conflicts**: If you forcefully close your terminal, orphaned processes might hold ports `5001` or `8002`. Ensure they are killed before restarting.

## 📊 Data Flow Architecture
1. **Backend** fetches or receives localized input parameters from the user.
2. **Backend** routes live environmental variables to the **ML Service**.
3. **ML Service** runs the data through `best_source_model`, `best_aqi_model`, and time-series logic, returning a comprehensive AI payload.
4. **Backend** persists the enriched intelligence feed to **MongoDB** and streams it back to the client.
5. **Frontend** visualizes the complex datasets seamlessly using reactive state, custom SVG graphs, and map overlays.

## 🛡️ Hotspot & Recommendations Context
- **Hotspot Zone**: Automatically triggers a geospatial alert ring if local AQI > 150.
- **Evacuation Protocol**: Persistent overlay warning triggers if local AQI > 200.
- **AI Action Plan**: Actively recommends mitigation strategies based on what the AI detects as the primary pollution source (e.g., advising water sprays for construction dust, or emission filtration for industrial output).
