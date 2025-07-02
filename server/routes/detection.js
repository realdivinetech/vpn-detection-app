const express = require('express');
const router = express.Router();
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const ipClassifier = require('../utils/ipClassifier');
const botDetector = require('../utils/botDetector');
const database = require('../utils/database');

// Get client IP helper
function getClientIp(req) {
  return req.headers['cf-connecting-ip'] ||
         req.headers['x-real-ip'] ||
         req.headers['x-forwarded-for']?.split(',')[0] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
         '127.0.0.1';
}

// Main IP analysis endpoint
router.post('/analyze-ip', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const clientIp = getClientIp(req);
    const userAgent = req.headers['user-agent'] || '';
    const { timestamp } = req.body;

    console.log(`Analyzing IP: ${clientIp}`);

    // Run parallel analysis
    const [
      ipGeoData,
      ipClassification,
      botAnalysis
    ] = await Promise.allSettled([
      getIpGeolocation(clientIp),
      ipClassifier.classifyIp(clientIp),
      botDetector.analyzeRequest(req)
    ]);

    // Combine results
    const ipAnalysisResult = {
      publicIp: clientIp,
      country: ipGeoData.status === 'fulfilled' ? ipGeoData.value.country : 'Unknown',
      city: ipGeoData.status === 'fulfilled' ? ipGeoData.value.city : undefined,
      isp: ipGeoData.status === 'fulfilled' ? ipGeoData.value.isp : 'Unknown',
      asn: ipGeoData.status === 'fulfilled' ? ipGeoData.value.asn : undefined,
      asnOrg: ipGeoData.status === 'fulfilled' ? ipGeoData.value.asnOrg : undefined,
      isDatacenter: ipClassification.status === 'fulfilled' ? ipClassification.value.isDatacenter : false,
      isHosting: ipClassification.status === 'fulfilled' ? ipClassification.value.isHosting : false,
      isTor: ipClassification.status === 'fulfilled' ? ipClassification.value.isTor : false,
      isProxy: ipClassification.status === 'fulfilled' ? ipClassification.value.isProxy : false,
      riskScore: calculateRiskScore({
        isDatacenter: ipClassification.status === 'fulfilled' ? ipClassification.value.isDatacenter : false,
        isHosting: ipClassification.status === 'fulfilled' ? ipClassification.value.isHosting : false,
        isTor: ipClassification.status === 'fulfilled' ? ipClassification.value.isTor : false,
        isProxy: ipClassification.status === 'fulfilled' ? ipClassification.value.isProxy : false,
        geoData: ipGeoData.status === 'fulfilled' ? ipGeoData.value : null
      }),
      threat: ipGeoData.status === 'fulfilled' ? ipGeoData.value.threat : undefined,
      longitude: ipGeoData.status === 'fulfilled' ? ipGeoData.value.longitude : undefined,
      latitude: ipGeoData.status === 'fulfilled' ? ipGeoData.value.latitude : undefined
    };

    const duration = Date.now() - startTime;
    
    console.log(`IP analysis completed in ${duration}ms for ${clientIp}`);
    
    res.json({
      success: true,
      data: ipAnalysisResult,
      duration,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('IP analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'IP analysis failed',
      message: error.message
    });
  }
});

// Log detection results
router.post('/log-detection', async (req, res) => {
  try {
    const clientIp = getClientIp(req);
    const detectionData = req.body;
    
    const logEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ip: clientIp,
      userAgent: req.headers['user-agent'] || '',
      isVpnDetected: detectionData.isVpnDetected || false,
      confidenceScore: detectionData.confidenceScore || 0,
      detectedTypes: detectionData.detectedTypes || [],
      country: detectionData.results?.ipAnalysis?.country || 'Unknown',
      city: detectionData.results?.ipAnalysis?.city || null,
      isp: detectionData.results?.ipAnalysis?.isp || 'Unknown',
      duration: detectionData.duration || 0,
      results: detectionData.results || {}
    };

    await database.logDetection(logEntry);
    
    res.json({
      success: true,
      message: 'Detection logged successfully'
    });

  } catch (error) {
    console.error('Detection logging error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to log detection'
    });
  }
});

// Get IP geolocation data
async function getIpGeolocation(ip) {
  try {
    // Try ip-api.com first (free, 1000 requests/month)
    const response = await axios.get(`http://ip-api.com/json/${ip}?fields=status,message,country,countryCode,region,regionName,city,lat,lon,timezone,isp,org,as,asname,query,proxy,hosting`, {
      timeout: 5000
    });

    if (response.data.status === 'success') {
      return {
        country: response.data.country,
        countryCode: response.data.countryCode,
        region: response.data.regionName,
        city: response.data.city,
        latitude: response.data.lat,
        longitude: response.data.lon,
        timezone: response.data.timezone,
        isp: response.data.isp,
        org: response.data.org,
        asn: response.data.as ? parseInt(response.data.as.split(' ')[0].replace('AS', '')) : null,
        asnOrg: response.data.asname,
        isProxy: response.data.proxy || false,
        isHosting: response.data.hosting || false,
        threat: response.data.proxy ? 'Proxy' : (response.data.hosting ? 'Hosting' : null)
      };
    } else {
      throw new Error(response.data.message || 'IP geolocation failed');
    }
  } catch (error) {
    console.warn(`Primary geolocation failed for ${ip}:`, error.message);
    
    // Fallback to ipapi.co
    try {
      const fallbackResponse = await axios.get(`https://ipapi.co/${ip}/json/`, {
        timeout: 5000
      });
      
      const data = fallbackResponse.data;
      return {
        country: data.country_name,
        countryCode: data.country_code,
        region: data.region,
        city: data.city,
        latitude: data.latitude,
        longitude: data.longitude,
        timezone: data.timezone,
        isp: data.org,
        org: data.org,
        asn: data.asn ? parseInt(data.asn.replace('AS', '')) : null,
        asnOrg: data.org,
        isProxy: false,
        isHosting: false
      };
    } catch (fallbackError) {
      console.warn(`Fallback geolocation failed for ${ip}:`, fallbackError.message);
      throw new Error('All geolocation services failed');
    }
  }
}

// Calculate risk score based on various factors
function calculateRiskScore(factors) {
  let score = 0;
  
  if (factors.isTor) score += 40;
  if (factors.isProxy) score += 35;
  if (factors.isDatacenter) score += 30;
  if (factors.isHosting) score += 25;
  
  // Geographic risk factors
  if (factors.geoData) {
    const highRiskCountries = ['CN', 'RU', 'KP', 'IR'];
    if (highRiskCountries.includes(factors.geoData.countryCode)) {
      score += 10;
    }
  }
  
  return Math.min(100, score);
}

module.exports = router;