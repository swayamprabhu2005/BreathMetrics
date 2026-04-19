const express = require('express');
const router = express.Router();
const aqiController = require('../controllers/aqiController');

router.get('/live', aqiController.getLiveData);
router.get('/history', aqiController.getHistory);
router.get('/hotspots', aqiController.getHotspots);
router.get('/recommendations', aqiController.getRecommendations);

module.exports = router;
