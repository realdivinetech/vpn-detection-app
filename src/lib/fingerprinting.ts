export class BrowserFingerprinting {
  async generateFingerprint() {
    const fingerprint = {
      userAgent: navigator.userAgent,
      language: navigator.language,
      languages: navigator.languages,
      platform: navigator.platform,
      cookieEnabled: navigator.cookieEnabled,
      doNotTrack: navigator.doNotTrack,
      hardwareConcurrency: navigator.hardwareConcurrency,
      maxTouchPoints: navigator.maxTouchPoints,
      screenResolution: `${screen.width}x${screen.height}`,
      screenColorDepth: screen.colorDepth,
      pixelDepth: screen.pixelDepth,
      availableScreenResolution: `${screen.availWidth}x${screen.availHeight}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      timezoneOffset: new Date().getTimezoneOffset(),
      plugins: await this.getPlugins(),
      canvasHash: await this.generateCanvasFingerprint(),
      webglHash: await this.generateWebGLFingerprint(),
      audioHash: await this.generateAudioFingerprint(),
      fontList: await this.detectFonts(),
      hasLocalStorage: this.testLocalStorage(),
      hasSessionStorage: this.testSessionStorage(),
      hasIndexedDB: this.testIndexedDB(),
      hasWebSQL: this.testWebSQL(),
      deviceMemory: (navigator as unknown as { deviceMemory?: number }).deviceMemory,
      connection: this.getConnectionInfo(),
      suspicionScore: 0
    };

    fingerprint.suspicionScore = this.calculateSuspicionScore(fingerprint);
    return fingerprint;
  }

  private async getPlugins(): Promise<string[]> {
    const plugins = [];
    for (let i = 0; i < navigator.plugins.length; i++) {
      plugins.push(navigator.plugins[i].name);
    }
    return plugins;
  }

  private async generateCanvasFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return '';

      canvas.width = 200;
      canvas.height = 50;

      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#f60';
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = '#069';
      ctx.fillText('Hello, world! 🌍', 2, 15);
      ctx.fillStyle = 'rgba(102, 204, 0, 0.7)';
      ctx.fillText('Hello, world! 🌍', 4, 17);

      const imageData = canvas.toDataURL();
      return this.simpleHash(imageData);
    } catch {
      return '';
    }
  }

  private async generateWebGLFingerprint(): Promise<string> {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      if (!gl) return '';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : '';
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
      
      return this.simpleHash(vendor + renderer);
    } catch {
      return '';
    }
  }

  private async generateAudioFingerprint(): Promise<string> {
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const analyser = audioContext.createAnalyser();
      const gainNode = audioContext.createGain();
      const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);

      gainNode.gain.value = 0;
      oscillator.type = 'triangle';
      oscillator.frequency.value = 10000;

      oscillator.connect(analyser);
      analyser.connect(scriptProcessor);
      scriptProcessor.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();

      return new Promise((resolve) => {
        scriptProcessor.onaudioprocess = (event) => {
          const buffer = event.inputBuffer.getChannelData(0);
          let sum = 0;
          for (let i = 0; i < buffer.length; i++) {
            sum += Math.abs(buffer[i]);
          }
          oscillator.stop();
          audioContext.close();
          resolve(this.simpleHash(sum.toString()));
        };
      });
    } catch {
      return '';
    }
  }

  private async detectFonts(): Promise<string[]> {
    const testFonts = [
      'Arial', 'Arial Black', 'Calibri', 'Cambria', 'Cambria Math', 'Comic Sans MS',
      'Consolas', 'Courier', 'Courier New', 'Georgia', 'Helvetica', 'Impact',
      'Lucida Console', 'Lucida Sans Unicode', 'Microsoft Sans Serif', 'Palatino',
      'Tahoma', 'Times', 'Times New Roman', 'Trebuchet MS', 'Verdana'
    ];

    const baseFonts = ['serif', 'sans-serif', 'monospace'];
    const testString = 'mmmmmmmmmmlli';
    const testSize = '72px';

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d')!;

    const baseSizes = baseFonts.map(font => {
      context.font = `${testSize} ${font}`;
      return context.measureText(testString).width;
    });

    const detectedFonts: string[] = [];

    testFonts.forEach(font => {
      const detected = baseFonts.some((baseFont, index) => {
        context.font = `${testSize} ${font}, ${baseFont}`;
        return context.measureText(testString).width !== baseSizes[index];
      });
      
      if (detected) {
        detectedFonts.push(font);
      }
    });

    return detectedFonts;
  }

  private testLocalStorage(): boolean {
    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private testSessionStorage(): boolean {
    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      return true;
    } catch {
      return false;
    }
  }

  private testIndexedDB(): boolean {
    return !!window.indexedDB;
  }

  private testWebSQL(): boolean {
    return !!(window as unknown as { openDatabase?: unknown }).openDatabase;
  }

  private getConnectionInfo() {
    const nav = navigator as unknown as { connection?: unknown; mozConnection?: unknown; webkitConnection?: unknown };
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    if (!connection) return null;

    return {
      effectiveType: (connection as any).effectiveType,
      downlink: (connection as any).downlink,
      rtt: (connection as any).rtt
    };
  }

  private calculateSuspicionScore(fingerprint: Record<string, unknown>): number {
    let score = 0;

    // Check for headless browser indicators
    if (!fingerprint.plugins || (fingerprint.plugins as string[]).length === 0) score += 20;
    if (!fingerprint.languages || (fingerprint.languages as string[]).length === 0) score += 15;
    if (fingerprint.hardwareConcurrency === 0) score += 10;
    if (fingerprint.screenResolution === '0x0') score += 25;
    if (!fingerprint.canvasHash) score += 15;
    if (!fingerprint.webglHash) score += 10;
    if ((fingerprint.fontList as string[]).length < 5) score += 20;

    // Check for automation indicators
    if (navigator.webdriver) score += 30;
    if ((window as unknown as { __nightmare?: unknown }).__nightmare) score += 25;
    if ((window as unknown as { phantom?: unknown }).phantom) score += 25;

    // Check for inconsistencies
    if ((fingerprint.platform as string).includes('Win') && !(fingerprint.userAgent as string).includes('Windows')) score += 15;
    if ((fingerprint.platform as string).includes('Mac') && !(fingerprint.userAgent as string).includes('Mac')) score += 15;
    if ((fingerprint.platform as string).includes('Linux') && !(fingerprint.userAgent as string).includes('Linux')) score += 15;

    return Math.min(100, score);
  }

  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(16);
  }
}