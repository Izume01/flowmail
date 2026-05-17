import * as dns from 'dns/promises';

/**
 * Verifies that a domain has the required TXT record for Flowmail ownership verification.
 * Expected record: _flowmail-challenge.<domain> TXT <verificationToken>
 */
export async function verifyDomainDNS(domain: string, expectedToken: string): Promise<boolean> {
  try {
    const challengeDomain = `_flowmail-challenge.${domain}`;
    const records = await dns.resolveTxt(challengeDomain);
    
    // Flatten and check if any record matches the token
    const flatRecords = records.flat();
    return flatRecords.some(r => r.includes(expectedToken));
  } catch (e) {
    return false;
  }
}
