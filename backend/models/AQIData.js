const mongoose = require('mongoose');

const AQIDataSchema = new mongoose.Schema({
  location: {
    name: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  },
  pm25: Number,
  pm10: Number,
  no2: Number,
  co: Number,
  o3: Number,
  temperature: Number,
  wind_speed: Number,
  timestamp: {
    type: Date,
    default: Date.now
  },
  prediction: {
    predicted_source: String,
    confidence: Number,
    current_aqi: Number,
    future_aqi: [Number]
  },
  is_hotspot: Boolean,
  recommendation: String
});

module.exports = mongoose.model('AQIData', AQIDataSchema);
