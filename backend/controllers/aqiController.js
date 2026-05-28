const axios = require('axios');
const AQIData = require('../models/AQIData');

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8002/predict';
const OPENAQ_API_URL = 'https://api.openaq.org/v2/latest';
const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

const getRecommendation = (source) => {
  if (source === "Vehicular") return "Traffic control: Implement vehicle rotation, promote public transport, and restrict heavy trucks.";
  if (source === "Industrial") return "Emission regulation: Enforce strict factory output monitoring and apply filtration systems.";
  if (source === "Construction") return "Water spraying: Use dust suppression techniques and install physical barriers.";
  return "General precautions: Wear masks and avoid outdoor exercise if AQI is high.";
};

exports.getLiveData = async (req, res) => {
  try {
    const { city = 'Local Area', lat = 28.6139, lon = 77.2090 } = req.query;

    let measurements = {};
    try {
      const pollutionRes = await axios.get(`https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,ozone`);
      const pt = pollutionRes.data.current || {};
      measurements = {
        pm25: pt.pm2_5,
        pm10: pt.pm10,
        co: pt.carbon_monoxide,
        no2: pt.nitrogen_dioxide,
        o3: pt.ozone
      };
    } catch (err) {
      console.warn("OpenAQ API warning, using fallback data:", err.message);
      // Fallback measurements
    }

    let weather = { temperature: 31, windspeed: 3 };
    try {
      const weatherRes = await axios.get(`${OPEN_METEO_URL}?latitude=${lat}&longitude=${lon}&current_weather=true&hourly=temperature_2m,windspeed_10m`);
      weather = weatherRes.data.current_weather;
    } catch (err) {
      console.warn("Open-Meteo API warning, using fallback data:", err.message);
    }

    const dataPayload = {
      pm25: measurements.pm25 || 85, // Fallback for demo
      pm10: measurements.pm10 || 120,
      no2: measurements.no2 || 45,
      co: measurements.co || 0.8,
      o3: measurements.o3 || 60,
      temperature: weather.temperature,
      wind_speed: weather.windspeed,
      hour: new Date().getHours()
    };

    // Call ML Service
    let prediction;
    try {
      const predictionRes = await axios.post(ML_SERVICE_URL, dataPayload);
      prediction = predictionRes.data;
    } catch (mlError) {
      console.error("ML Service error:", mlError.message);
      // Mocked prediction if ML service is down
      prediction = {
        predicted_source: "Vehicular",
        confidence: 0.88,
        current_aqi: Math.floor(dataPayload.pm25 * 2),
        future_aqi: [180, 190, 210]
      };
    }

    const aqiData = new AQIData({
      location: {
        name: city,
        coordinates: { latitude: lat, longitude: lon }
      },
      ...dataPayload,
      prediction,
      is_hotspot: prediction.current_aqi > 150,
      recommendation: getRecommendation(prediction.predicted_source)
    });

    try {
      await aqiData.save();
    } catch (saveError) {
      console.warn("MongoDB save failed, but returning data anyway:", saveError.message);
    }
    res.json(aqiData);

  } catch (error) {
    console.error("Error in getLiveData:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.getHistory = async (req, res) => {
  try {
    const history = await AQIData.find().sort({ timestamp: -1 }).limit(20);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getHotspots = async (req, res) => {
  try {
    const hotspots = await AQIData.find({ is_hotspot: true }).sort({ timestamp: -1 }).limit(10);
    res.json(hotspots);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getRecommendations = async (req, res) => {
  try {
    const latest = await AQIData.findOne().sort({ timestamp: -1 });
    res.json({
      source: latest?.prediction?.predicted_source || "Unknown",
      recommendation: latest?.recommendation || "Maintain healthy air quality awareness."
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
