import { describe, it, expect, vi, mock } from 'bun:test';
import { verifyDomainDNS } from './dns';
import * as dns from 'dns/promises';

mock.module('dns/promises', () => ({
  resolveTxt: vi.fn(),
}));

describe('dns service', () => {
  it('should return true if verification token is found in TXT records', async () => {
    const { resolveTxt } = await import('dns/promises');
    (resolveTxt as any).mockResolvedValue([['fm_verification_token_123']]);
    
    const result = await verifyDomainDNS('example.com', 'fm_verification_token_123');
    
    expect(resolveTxt).toHaveBeenCalledWith('_flowmail-challenge.example.com');
    expect(result).toBe(true);
  });

  it('should return false if verification token is not found', async () => {
    const { resolveTxt } = await import('dns/promises');
    (resolveTxt as any).mockResolvedValue([['wrong_token']]);
    
    const result = await verifyDomainDNS('example.com', 'fm_verification_token_123');
    
    expect(result).toBe(false);
  });

  it('should return false if dns resolution fails', async () => {
    const { resolveTxt } = await import('dns/promises');
    (resolveTxt as any).mockRejectedValue(new Error('DNS Error'));
    
    const result = await verifyDomainDNS('example.com', 'fm_verification_token_123');
    
    expect(result).toBe(false);
  });
});
