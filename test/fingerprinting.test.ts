import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { BrowserFingerprinting } from '../src/lib/fingerprinting';

describe('BrowserFingerprinting', () => {
  beforeAll(() => {
    // Mock navigator object for Node.js environment
    // @ts-ignore
    global.navigator = {
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      language: 'en-US',
      languages: ['en-US', 'en'],
      platform: 'Win32',
      cookieEnabled: true,
      doNotTrack: '1',
      hardwareConcurrency: 4,
      maxTouchPoints: 0,
      plugins: []
    };

    // Mock window and document for canvas and screen
    // @ts-ignore
    global.window = {
      AudioContext: class {},
      webkitAudioContext: class {},
      indexedDB: {},
      openDatabase: null,
      __nightmare: false,
      phantom: false
    };

    // @ts-ignore
    global.document = {
      createElement: (tag: string) => {
        if (tag === 'canvas') {
          return {
            getContext: (type: string) => {
              if (type === '2d') {
                return {
                  fillRect: () => {},
                  clearRect: () => {},
                  getImageData: () => ({ data: [] }),
                  putImageData: () => {},
                  createImageData: () => [],
                  setTransform: () => {},
                  drawImage: () => {},
                  save: () => {},
                  fillText: () => {},
                  restore: () => {},
                  beginPath: () => {},
                  moveTo: () => {},
                  lineTo: () => {},
                  closePath: () => {},
                  stroke: () => {},
                  translate: () => {},
                  scale: () => {},
                  rotate: () => {},
                  arc: () => {},
                  fill: () => {},
                  measureText: () => ({ width: 100 }),
                  font: ''
                };
              }
              if (type === 'webgl' || type === 'experimental-webgl') {
                return {};
              }
              return null;
            },
            toDataURL: () => 'data:image/png;base64,',
            width: 200,
            height: 50
          };
        }
        return {};
      }
    };

    // @ts-ignore
    global.screen = {
      width: 1920,
      height: 1080,
      colorDepth: 24,
      pixelDepth: 24,
      availWidth: 1920,
      availHeight: 1040
    };
  });

  afterAll(() => {
    // @ts-ignore
    delete global.navigator;
    // @ts-ignore
    delete global.window;
    // @ts-ignore
    delete global.document;
    // @ts-ignore
    delete global.screen;
  });

  it('should generate fingerprint with expected properties', async () => {
    const fingerprinting = new BrowserFingerprinting();
    const fingerprint = await fingerprinting.generateFingerprint();

    expect(fingerprint).toHaveProperty('canvasHash');
    expect(fingerprint).toHaveProperty('timezone');
    expect(fingerprint).toHaveProperty('languages');
  });
});
