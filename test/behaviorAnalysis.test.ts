import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { JSDOM } from 'jsdom';
import { BehaviorAnalysis } from '../src/lib/behaviorAnalysis';

describe('BehaviorAnalysis', () => {
  let dom: JSDOM;

  beforeAll(() => {
    dom = new JSDOM(`<!DOCTYPE html><p>Hello world</p>`, { url: 'http://localhost' });
    (global as any).window = dom.window;
    (global as any).document = dom.window.document;
  });

  afterAll(() => {
    dom.window.close();
    delete (global as any).window;
    delete (global as any).document;
  });

  it('should analyze behavior and return expected properties', () => {
    const behaviorAnalysis = new BehaviorAnalysis();
    behaviorAnalysis.startTracking();

    const result = behaviorAnalysis.analyzeBehavior();
    expect(result).toHaveProperty('overallSuspicionScore');
    expect(typeof result.overallSuspicionScore).toBe('number');

    behaviorAnalysis.stopTracking();
  });
});
