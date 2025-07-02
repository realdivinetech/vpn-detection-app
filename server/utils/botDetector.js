class BotDetector {
  constructor() {
    this.suspiciousUserAgents = [
      'HeadlessChrome',
      'PhantomJS',
      'Selenium',
      'WebDriver',
      'bot',
      'crawler',
      'spider',
      'scraper',
      'curl',
      'wget',
      'python-requests',
      'node-fetch'
    ];
    
    this.automationHeaders = [
      'selenium',
      'webdriver',
      'phantomjs',
      'nightmare',
      'puppeteer',
      'playwright'
    ];
  }

  async analyzeRequest(req) {
    const userAgent = req.headers['user-agent'] || '';
    const acceptHeader = req.headers['accept'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    const acceptEncoding = req.headers['accept-encoding'] || '';
    const connection = req.headers['connection'] || '';
    
    const analysis = {
      isBot: false,
      botScore: 0,
      suspiciousIndicators: [],
      userAgentAnalysis: this.analyzeUserAgent(userAgent),
      headerAnalysis: this.analyzeHeaders(req.headers),
      behaviorAnalysis: this.analyzeBehavior(req)
    };

    // Calculate bot score based on various factors
    let score = 0;

    // User Agent Analysis
    if (analysis.userAgentAnalysis.isSuspicious) {
      score += 30;
      analysis.suspiciousIndicators.push('Suspicious User Agent');
    }

    if (analysis.userAgentAnalysis.isHeadless) {
      score += 40;
      analysis.suspiciousIndicators.push('Headless Browser');
    }

    // Header Analysis
    if (analysis.headerAnalysis.missingCommonHeaders) {
      score += 20;
      analysis.suspiciousIndicators.push('Missing Common Headers');
    }

    if (analysis.headerAnalysis.hasAutomationHeaders) {
      score += 35;
      analysis.suspiciousIndicators.push('Automation Headers');
    }

    if (analysis.headerAnalysis.invalidAcceptHeader) {
      score += 15;
      analysis.suspiciousIndicators.push('Invalid Accept Header');
    }

    // Behavior Analysis
    if (analysis.behaviorAnalysis.tooFastRequests) {
      score += 25;
      analysis.suspiciousIndicators.push('Too Fast Requests');
    }

    if (analysis.behaviorAnalysis.noJavaScript) {
      score += 20;
      analysis.suspiciousIndicators.push('No JavaScript Support');
    }

    analysis.botScore = Math.min(100, score);
    analysis.isBot = analysis.botScore >= 60;

    return analysis;
  }

  analyzeUserAgent(userAgent) {
    const analysis = {
      isSuspicious: false,
      isHeadless: false,
      detectedFramework: null,
      browserInfo: null
    };

    if (!userAgent || userAgent.length === 0) {
      analysis.isSuspicious = true;
      return analysis;
    }

    // Check for suspicious patterns
    const lowerUA = userAgent.toLowerCase();
    
    for (const suspicious of this.suspiciousUserAgents) {
      if (lowerUA.includes(suspicious.toLowerCase())) {
        analysis.isSuspicious = true;
        analysis.detectedFramework = suspicious;
        break;
      }
    }

    // Check for headless browsers
    if (lowerUA.includes('headless') || 
        lowerUA.includes('phantomjs') ||
        lowerUA.includes('selenium') ||
        userAgent.includes('HeadlessChrome')) {
      analysis.isHeadless = true;
    }

    // Analyze browser information
    analysis.browserInfo = this.parseBrowserInfo(userAgent);

    return analysis;
  }

  analyzeHeaders(headers) {
    const analysis = {
      missingCommonHeaders: false,
      hasAutomationHeaders: false,
      invalidAcceptHeader: false,
      suspiciousHeaders: []
    };

    // Check for common headers that browsers usually send
    const commonHeaders = ['accept', 'accept-language', 'accept-encoding', 'user-agent'];
    const missingHeaders = commonHeaders.filter(header => !headers[header]);
    
    if (missingHeaders.length > 1) {
      analysis.missingCommonHeaders = true;
      analysis.suspiciousHeaders.push(`Missing headers: ${missingHeaders.join(', ')}`);
    }

    // Check for automation-specific headers
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      const lowerValue = value.toString().toLowerCase();
      
      if (this.automationHeaders.some(auto => 
          lowerKey.includes(auto) || lowerValue.includes(auto))) {
        analysis.hasAutomationHeaders = true;
        analysis.suspiciousHeaders.push(`Automation header: ${key}`);
      }
    }

    // Check Accept header
    const accept = headers['accept'];
    if (accept && !accept.includes('text/html')) {
      analysis.invalidAcceptHeader = true;
      analysis.suspiciousHeaders.push('No HTML accept type');
    }

    return analysis;
  }

  analyzeBehavior(req) {
    const analysis = {
      tooFastRequests: false,
      noJavaScript: false,
      suspiciousTiming: false
    };

    // Check if request came too fast (this would need session tracking)
    const timestamp = Date.now();
    const clientIp = this.getClientIp(req);
    
    if (this.requestTracker && this.requestTracker[clientIp]) {
      const lastRequest = this.requestTracker[clientIp];
      const timeDiff = timestamp - lastRequest;
      
      if (timeDiff < 1000) { // Less than 1 second between requests
        analysis.tooFastRequests = true;
      }
    }

    // Initialize request tracker if not exists
    if (!this.requestTracker) {
      this.requestTracker = {};
    }
    this.requestTracker[clientIp] = timestamp;

    // Clean old entries (older than 5 minutes)
    if (Math.random() < 0.1) { // Clean 10% of the time to avoid performance issues
      const fiveMinutesAgo = timestamp - 5 * 60 * 1000;
      for (const [ip, time] of Object.entries(this.requestTracker)) {
        if (time < fiveMinutesAgo) {
          delete this.requestTracker[ip];
        }
      }
    }

    return analysis;
  }

  parseBrowserInfo(userAgent) {
    const info = {
      browser: 'Unknown',
      version: 'Unknown',
      os: 'Unknown',
      isValid: true
    };

    try {
      // Simple browser detection
      if (userAgent.includes('Chrome')) {
        info.browser = 'Chrome';
        const match = userAgent.match(/Chrome\/([0-9.]+)/);
        if (match) info.version = match[1];
      } else if (userAgent.includes('Firefox')) {
        info.browser = 'Firefox';
        const match = userAgent.match(/Firefox\/([0-9.]+)/);
        if (match) info.version = match[1];
      } else if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) {
        info.browser = 'Safari';
        const match = userAgent.match(/Version\/([0-9.]+)/);
        if (match) info.version = match[1];
      } else if (userAgent.includes('Edge')) {
        info.browser = 'Edge';
        const match = userAgent.match(/Edge\/([0-9.]+)/);
        if (match) info.version = match[1];
      }

      // OS detection
      if (userAgent.includes('Windows')) {
        info.os = 'Windows';
      } else if (userAgent.includes('Mac OS')) {
        info.os = 'macOS';
      } else if (userAgent.includes('Linux')) {
        info.os = 'Linux';
      } else if (userAgent.includes('Android')) {
        info.os = 'Android';
      } else if (userAgent.includes('iOS')) {
        info.os = 'iOS';
      }

      // Validate user agent structure
      if (!userAgent.includes('Mozilla') && !userAgent.includes('Opera')) {
        info.isValid = false;
      }

    } catch (error) {
      info.isValid = false;
    }

    return info;
  }

  getClientIp(req) {
    return req.headers['cf-connecting-ip'] ||
           req.headers['x-real-ip'] ||
           req.headers['x-forwarded-for']?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           (req.connection.socket ? req.connection.socket.remoteAddress : null) ||
           '127.0.0.1';
  }

  // Static method to check for common bot patterns
  static isKnownBot(userAgent) {
    const knownBots = [
      'googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider',
      'yandexbot', 'facebookexternalhit', 'twitterbot', 'linkedinbot',
      'whatsapp', 'telegrambot', 'applebot', 'ia_archiver'
    ];

    const lowerUA = userAgent.toLowerCase();
    return knownBots.some(bot => lowerUA.includes(bot));
  }
}

module.exports = new BotDetector();