const express = require('express');
const router = express.Router();
const database = require('../utils/database');

// Get detection logs with pagination
router.get('/logs', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const logs = await database.getLogs(limit, offset);
    const totalCount = await database.getLogsCount();
    
    res.json({
      success: true,
      data: logs,
      pagination: {
        page,
        limit,
        total: totalCount,
        pages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Admin logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logs'
    });
  }
});

// Get system statistics
router.get('/stats', async (req, res) => {
  try {
    const stats = await database.getStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch statistics'
    });
  }
});

// Export logs
router.get('/export-logs', async (req, res) => {
  try {
    const format = req.query.format || 'json';
    const logs = await database.getAllLogs();
    
    if (format === 'csv') {
      const csv = convertToCSV(logs);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=detection-logs.csv');
      res.send(csv);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=detection-logs.json');
      res.json({
        success: true,
        data: logs,
        exportedAt: new Date().toISOString(),
        totalRecords: logs.length
      });
    }
  } catch (error) {
    console.error('Export logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export logs'
    });
  }
});

// Clear all logs
router.delete('/clear-logs', async (req, res) => {
  try {
    const deletedCount = await database.clearLogs();
    
    res.json({
      success: true,
      message: `Successfully cleared ${deletedCount} log entries`,
      deletedCount
    });
  } catch (error) {
    console.error('Clear logs error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear logs'
    });
  }
});

// Get detection summary by time period
router.get('/summary', async (req, res) => {
  try {
    const period = req.query.period || '24h'; // 24h, 7d, 30d
    const summary = await database.getSummary(period);
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch summary'
    });
  }
});

// Get top threats
router.get('/threats', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const threats = await database.getTopThreats(limit);
    
    res.json({
      success: true,
      data: threats
    });
  } catch (error) {
    console.error('Threats error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch threats'
    });
  }
});

// System health check
router.get('/health', async (req, res) => {
  try {
    const health = await database.getHealthStatus();
    
    res.json({
      success: true,
      data: {
        database: health.database ? 'healthy' : 'error',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      error: 'Health check failed'
    });
  }
});

// Convert logs to CSV format
function convertToCSV(logs) {
  if (logs.length === 0) return '';
  
  const headers = [
    'Timestamp',
    'IP Address',
    'Country',
    'ISP',
    'VPN Detected',
    'Confidence Score',
    'Detected Types',
    'User Agent'
  ];
  
  const csvRows = [headers.join(',')];
  
  logs.forEach(log => {
    const row = [
      log.timestamp,
      log.ip,
      log.country,
      log.isp,
      log.isVpnDetected,
      log.confidenceScore,
      `"${log.detectedTypes.join('; ')}"`,
      `"${log.userAgent.replace(/"/g, '""')}"`
    ];
    csvRows.push(row.join(','));
  });
  
  return csvRows.join('\n');
}

module.exports = router;