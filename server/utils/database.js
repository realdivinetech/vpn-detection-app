const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
  constructor() {
    this.db = null;
    this.dbPath = path.join(__dirname, '..', 'data', 'detection_logs.db');
  }

  async init() {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.dbPath);
      await fs.mkdir(dataDir, { recursive: true });

      return new Promise((resolve, reject) => {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
          if (err) {
            console.error('Database connection error:', err);
            reject(err);
          } else {
            console.log('Connected to SQLite database');
            this.createTables().then(resolve).catch(reject);
          }
        });
      });
    } catch (error) {
      console.error('Database initialization error:', error);
      throw error;
    }
  }

  async createTables() {
    const createDetectionLogsTable = `
      CREATE TABLE IF NOT EXISTS detection_logs (
        id TEXT PRIMARY KEY,
        timestamp TEXT NOT NULL,
        ip TEXT NOT NULL,
        user_agent TEXT,
        is_vpn_detected BOOLEAN NOT NULL,
        confidence_score INTEGER NOT NULL,
        detected_types TEXT,
        country TEXT,
        city TEXT,
        isp TEXT,
        duration INTEGER,
        results TEXT
      )
    `;

    const createIndexes = [
      'CREATE INDEX IF NOT EXISTS idx_timestamp ON detection_logs(timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_ip ON detection_logs(ip)',
      'CREATE INDEX IF NOT EXISTS idx_vpn_detected ON detection_logs(is_vpn_detected)',
      'CREATE INDEX IF NOT EXISTS idx_country ON detection_logs(country)'
    ];

    return new Promise((resolve, reject) => {
      this.db.serialize(() => {
        this.db.run(createDetectionLogsTable, (err) => {
          if (err) {
            reject(err);
            return;
          }
        });

        let completed = 0;
        const total = createIndexes.length;

        createIndexes.forEach((indexQuery) => {
          this.db.run(indexQuery, (err) => {
            if (err) {
              console.warn('Index creation warning:', err.message);
            }
            completed++;
            if (completed === total) {
              resolve();
            }
          });
        });
      });
    });
  }

  async logDetection(logEntry) {
    const query = `
      INSERT INTO detection_logs (
        id, timestamp, ip, user_agent, is_vpn_detected, 
        confidence_score, detected_types, country, city, 
        isp, duration, results
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
      logEntry.id,
      logEntry.timestamp,
      logEntry.ip,
      logEntry.userAgent,
      logEntry.isVpnDetected ? 1 : 0,
      logEntry.confidenceScore,
      JSON.stringify(logEntry.detectedTypes),
      logEntry.country,
      logEntry.city,
      logEntry.isp,
      logEntry.duration,
      JSON.stringify(logEntry.results)
    ];

    return new Promise((resolve, reject) => {
      this.db.run(query, values, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.lastID);
        }
      });
    });
  }

  async getLogs(limit = 20, offset = 0) {
    const query = `
      SELECT * FROM detection_logs 
      ORDER BY timestamp DESC 
      LIMIT ? OFFSET ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [limit, offset], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const processedRows = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            ip: row.ip,
            userAgent: row.user_agent,
            isVpnDetected: Boolean(row.is_vpn_detected),
            confidenceScore: row.confidence_score,
            detectedTypes: JSON.parse(row.detected_types || '[]'),
            country: row.country,
            city: row.city,
            isp: row.isp,
            duration: row.duration,
            results: JSON.parse(row.results || '{}')
          }));
          resolve(processedRows);
        }
      });
    });
  }

  async getLogsCount() {
    const query = 'SELECT COUNT(*) as count FROM detection_logs';

    return new Promise((resolve, reject) => {
      this.db.get(query, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve(row.count);
        }
      });
    });
  }

  async getAllLogs() {
    const query = 'SELECT * FROM detection_logs ORDER BY timestamp DESC';

    return new Promise((resolve, reject) => {
      this.db.all(query, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const processedRows = rows.map(row => ({
            id: row.id,
            timestamp: row.timestamp,
            ip: row.ip,
            userAgent: row.user_agent,
            isVpnDetected: Boolean(row.is_vpn_detected),
            confidenceScore: row.confidence_score,
            detectedTypes: JSON.parse(row.detected_types || '[]'),
            country: row.country,
            city: row.city,
            isp: row.isp,
            duration: row.duration,
            results: JSON.parse(row.results || '{}')
          }));
          resolve(processedRows);
        }
      });
    });
  }

  async getStats() {
    const queries = {
      total: 'SELECT COUNT(*) as count FROM detection_logs',
      vpnDetected: 'SELECT COUNT(*) as count FROM detection_logs WHERE is_vpn_detected = 1',
      avgConfidence: 'SELECT AVG(confidence_score) as avg FROM detection_logs',
      topCountries: `
        SELECT country, COUNT(*) as count 
        FROM detection_logs 
        WHERE country IS NOT NULL AND country != 'Unknown'
        GROUP BY country 
        ORDER BY count DESC 
        LIMIT 10
      `,
      topIsps: `
        SELECT isp, COUNT(*) as count 
        FROM detection_logs 
        WHERE isp IS NOT NULL AND isp != 'Unknown'
        GROUP BY isp 
        ORDER BY count DESC 
        LIMIT 10
      `,
      recentActivity: `
        SELECT 
          DATE(timestamp) as date,
          COUNT(*) as scans,
          SUM(CASE WHEN is_vpn_detected = 1 THEN 1 ELSE 0 END) as vpnDetected
        FROM detection_logs 
        WHERE timestamp >= datetime('now', '-7 days')
        GROUP BY DATE(timestamp)
        ORDER BY date DESC
      `
    };

    try {
      const results = await Promise.all(
        Object.entries(queries).map(([key, query]) => 
          new Promise((resolve, reject) => {
            if (key === 'topCountries' || key === 'topIsps' || key === 'recentActivity') {
              this.db.all(query, (err, rows) => {
                if (err) reject(err);
                else resolve([key, rows]);
              });
            } else {
              this.db.get(query, (err, row) => {
                if (err) reject(err);
                else resolve([key, row]);
              });
            }
          })
        )
      );

      const statsMap = Object.fromEntries(results);
      
      const totalScans = statsMap.total.count;
      const vpnDetected = statsMap.vpnDetected.count;
      
      return {
        totalScans,
        vpnDetected,
        cleanConnections: totalScans - vpnDetected,
        averageConfidence: Math.round(statsMap.avgConfidence.avg || 0),
        topCountries: statsMap.topCountries,
        topIsps: statsMap.topIsps,
        recentActivity: statsMap.recentActivity
      };
    } catch (error) {
      console.error('Stats query error:', error);
      return {
        totalScans: 0,
        vpnDetected: 0,
        cleanConnections: 0,
        averageConfidence: 0,
        topCountries: [],
        topIsps: [],
        recentActivity: []
      };
    }
  }

  async clearLogs() {
    const query = 'DELETE FROM detection_logs';

    return new Promise((resolve, reject) => {
      this.db.run(query, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes);
        }
      });
    });
  }

  async getSummary(period = '24h') {
    let timeCondition;
    
    switch (period) {
      case '24h':
        timeCondition = "timestamp >= datetime('now', '-24 hours')";
        break;
      case '7d':
        timeCondition = "timestamp >= datetime('now', '-7 days')";
        break;
      case '30d':
        timeCondition = "timestamp >= datetime('now', '-30 days')";
        break;
      default:
        timeCondition = "timestamp >= datetime('now', '-24 hours')";
    }

    const query = `
      SELECT 
        COUNT(*) as totalRequests,
        SUM(CASE WHEN is_vpn_detected = 1 THEN 1 ELSE 0 END) as vpnDetected,
        AVG(confidence_score) as avgConfidence,
        MIN(timestamp) as firstRequest,
        MAX(timestamp) as lastRequest
      FROM detection_logs 
      WHERE ${timeCondition}
    `;

    return new Promise((resolve, reject) => {
      this.db.get(query, (err, row) => {
        if (err) {
          reject(err);
        } else {
          resolve({
            period,
            totalRequests: row.totalRequests || 0,
            vpnDetected: row.vpnDetected || 0,
            cleanConnections: (row.totalRequests || 0) - (row.vpnDetected || 0),
            avgConfidence: Math.round(row.avgConfidence || 0),
            firstRequest: row.firstRequest,
            lastRequest: row.lastRequest
          });
        }
      });
    });
  }

  async getTopThreats(limit = 10) {
    const query = `
      SELECT 
        ip,
        country,
        isp,
        COUNT(*) as detectionCount,
        AVG(confidence_score) as avgConfidence,
        MAX(timestamp) as lastSeen,
        detected_types
      FROM detection_logs 
      WHERE is_vpn_detected = 1
      GROUP BY ip
      ORDER BY detectionCount DESC, avgConfidence DESC
      LIMIT ?
    `;

    return new Promise((resolve, reject) => {
      this.db.all(query, [limit], (err, rows) => {
        if (err) {
          reject(err);
        } else {
          const threats = rows.map(row => ({
            ip: row.ip,
            country: row.country,
            isp: row.isp,
            detectionCount: row.detectionCount,
            avgConfidence: Math.round(row.avgConfidence),
            lastSeen: row.lastSeen,
            detectedTypes: JSON.parse(row.detected_types || '[]')
          }));
          resolve(threats);
        }
      });
    });
  }

  async getHealthStatus() {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve({ database: false });
        return;
      }

      this.db.get('SELECT 1', (err) => {
        resolve({ database: !err });
      });
    });
  }

  close() {
    if (this.db) {
      this.db.close((err) => {
        if (err) {
          console.error('Database close error:', err);
        } else {
          console.log('Database connection closed');
        }
      });
    }
  }
}

module.exports = new Database();