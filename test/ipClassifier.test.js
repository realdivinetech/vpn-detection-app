import { describe, it, expect } from 'vitest';
import { isDatacenterProvider, isHostingProvider } from '../server/utils/ipClassifier';

describe('IP Classifier', () => {
  it('should detect datacenter providers correctly', () => {
    expect(isDatacenterProvider('Amazon AWS', 'Amazon AWS')).toBe(true);
    expect(isDatacenterProvider('Google Cloud', 'Google Cloud')).toBe(true);
    expect(isDatacenterProvider('Some ISP', 'Some Org')).toBe(false);
  });

  it('should detect hosting providers correctly', () => {
    expect(isHostingProvider('Hosting Company', 'Hosting Company')).toBe(true);
    expect(isHostingProvider('Random ISP', 'Random Org')).toBe(false);
  });
});
