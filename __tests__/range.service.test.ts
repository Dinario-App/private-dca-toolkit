// __tests__/range.service.test.ts
// Tests for Range compliance screening service
import { RangeService } from '../src/services/range.service';

// Mock global fetch
const mockFetch = jest.fn();
global.fetch = mockFetch as unknown as typeof fetch;

describe('RangeService', () => {
  let rangeService: RangeService;
  const testApiKey = 'test-range-api-key-12345';

  beforeEach(() => {
    jest.clearAllMocks();
    rangeService = new RangeService(testApiKey);
  });

  // ─── screenAddress: risk level mapping ────────────────────────────────

  describe('screenAddress - risk level mapping', () => {
    const makeRangeResponse = (riskScore: number, overrides: Partial<any> = {}) => ({
      riskScore,
      riskLevel: overrides.riskLevel || 'Some risk level',
      numHops: overrides.numHops || 0,
      maliciousAddressesFound: overrides.maliciousAddressesFound || [],
      reasoning: overrides.reasoning || '',
      attribution: overrides.attribution || null,
    });

    const mockSuccessResponse = (body: any) => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(body),
      });
    };

    it('should map risk score 1 to "low"', async () => {
      mockSuccessResponse(makeRangeResponse(1));

      const result = await rangeService.screenAddress('SomeAddress111');

      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBe(10); // 1 * 10
    });

    it('should map risk score 2 to "low"', async () => {
      mockSuccessResponse(makeRangeResponse(2));

      const result = await rangeService.screenAddress('SomeAddress222');

      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBe(20);
    });

    it('should map risk score 3 to "low"', async () => {
      mockSuccessResponse(makeRangeResponse(3));

      const result = await rangeService.screenAddress('SomeAddress333');

      expect(result.riskLevel).toBe('low');
      expect(result.riskScore).toBe(30);
    });

    it('should map risk score 4 to "medium"', async () => {
      mockSuccessResponse(makeRangeResponse(4));

      const result = await rangeService.screenAddress('SomeAddress444');

      expect(result.riskLevel).toBe('medium');
      expect(result.riskScore).toBe(40);
    });

    it('should map risk score 5 to "medium"', async () => {
      mockSuccessResponse(makeRangeResponse(5));

      const result = await rangeService.screenAddress('SomeAddress555');

      expect(result.riskLevel).toBe('medium');
      expect(result.riskScore).toBe(50);
    });

    it('should map risk score 6 to "high"', async () => {
      mockSuccessResponse(makeRangeResponse(6));

      const result = await rangeService.screenAddress('SomeAddress666');

      expect(result.riskLevel).toBe('high');
      expect(result.riskScore).toBe(60);
    });

    it('should map risk score 7 to "high"', async () => {
      mockSuccessResponse(makeRangeResponse(7));

      const result = await rangeService.screenAddress('SomeAddress777');

      expect(result.riskLevel).toBe('high');
      expect(result.riskScore).toBe(70);
    });

    it('should map risk score 8 to "severe"', async () => {
      mockSuccessResponse(makeRangeResponse(8));

      const result = await rangeService.screenAddress('SomeAddress888');

      expect(result.riskLevel).toBe('severe');
      expect(result.riskScore).toBe(80);
    });

    it('should map risk score 9 to "severe"', async () => {
      mockSuccessResponse(makeRangeResponse(9));

      const result = await rangeService.screenAddress('SomeAddress999');

      expect(result.riskLevel).toBe('severe');
      expect(result.riskScore).toBe(90);
    });

    it('should map risk score 10 to "severe"', async () => {
      mockSuccessResponse(makeRangeResponse(10));

      const result = await rangeService.screenAddress('SomeAddress1010');

      expect(result.riskLevel).toBe('severe');
      expect(result.riskScore).toBe(100);
    });
  });

  // ─── screenAddress: sanctions detection ───────────────────────────────

  describe('screenAddress - sanctions detection', () => {
    it('should detect sanctions when riskLevel contains "critical"', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 10,
          riskLevel: 'CRITICAL RISK (Directly malicious)',
          numHops: 0,
          maliciousAddressesFound: [],
          reasoning: 'This address is directly sanctioned',
          attribution: null,
        }),
      });

      const result = await rangeService.screenAddress('SanctionedAddr');

      expect(result.isSanctioned).toBe(true);
      expect(result.riskLevel).toBe('severe');
    });

    it('should detect sanctions when malicious address found at distance 0', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 9,
          riskLevel: 'Very high risk',
          numHops: 0,
          maliciousAddressesFound: [
            {
              address: 'MaliciousAddr111',
              distance: 0,
              name_tag: 'Lazarus Group',
              entity: 'DPRK',
              category: 'sanctions',
            },
          ],
          reasoning: 'Direct match to sanctioned entity',
          attribution: null,
        }),
      });

      const result = await rangeService.screenAddress('SanctionedAddr2');

      expect(result.isSanctioned).toBe(true);
      expect(result.riskFactors).toEqual(expect.arrayContaining([
        expect.stringContaining('Lazarus Group'),
      ]));
    });

    it('should NOT flag as sanctioned when malicious address is distant', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 5,
          riskLevel: 'Medium risk',
          numHops: 3,
          maliciousAddressesFound: [
            {
              address: 'DistantMalicious',
              distance: 3,
              name_tag: null,
              entity: null,
              category: 'mixing',
            },
          ],
          reasoning: 'Indirect exposure via mixing service',
          attribution: null,
        }),
      });

      const result = await rangeService.screenAddress('IndirectExposure');

      expect(result.isSanctioned).toBe(false);
      expect(result.riskLevel).toBe('medium');
    });

    it('should not flag clean addresses as sanctioned', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 1,
          riskLevel: 'Very low risk',
          numHops: 0,
          maliciousAddressesFound: [],
          reasoning: '',
          attribution: null,
        }),
      });

      const result = await rangeService.screenAddress('CleanAddr');

      expect(result.isSanctioned).toBe(false);
      expect(result.riskLevel).toBe('low');
      expect(result.riskFactors).toEqual([]);
    });
  });

  // ─── screenAddress: API request format ────────────────────────────────

  describe('screenAddress - API request format', () => {
    it('should call Range API with correct URL, auth header, and defaults to solana chain', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 1,
          riskLevel: 'Low',
          numHops: 0,
          maliciousAddressesFound: [],
          reasoning: '',
          attribution: null,
        }),
      });

      await rangeService.screenAddress('TestAddr');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.range.org/v1/risk/address?address=TestAddr&network=solana'),
        expect.objectContaining({
          method: 'GET',
          headers: {
            Authorization: `Bearer ${testApiKey}`,
          },
        })
      );
    });

    it('should pass custom chain parameter', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 1,
          riskLevel: 'Low',
          numHops: 0,
          maliciousAddressesFound: [],
          reasoning: '',
          attribution: null,
        }),
      });

      await rangeService.screenAddress('EthAddr', 'ethereum');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('network=ethereum'),
        expect.any(Object)
      );
    });

    it('should include address and chain in the result', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 2,
          riskLevel: 'Low',
          numHops: 0,
          maliciousAddressesFound: [],
          reasoning: '',
          attribution: null,
        }),
      });

      const result = await rangeService.screenAddress('MyAddr', 'solana');

      expect(result.address).toBe('MyAddr');
      expect(result.chain).toBe('solana');
      expect(result.screenedAt).toBeDefined();
      // screenedAt should be a valid ISO date
      expect(new Date(result.screenedAt).getTime()).not.toBeNaN();
    });
  });

  // ─── screenAddress: error handling ────────────────────────────────────

  describe('screenAddress - API error handling', () => {
    it('should throw on non-OK HTTP response with error text', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Unauthorized: Invalid API key'),
      });

      await expect(rangeService.screenAddress('SomeAddr'))
        .rejects
        .toThrow('Range screening failed: Unauthorized: Invalid API key');
    });

    it('should throw on 500 server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: () => Promise.resolve('Internal Server Error'),
      });

      await expect(rangeService.screenAddress('SomeAddr'))
        .rejects
        .toThrow('Range screening failed: Internal Server Error');
    });

    it('should throw on network failure (fetch rejects)', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network request failed'));

      await expect(rangeService.screenAddress('SomeAddr'))
        .rejects
        .toThrow('Network request failed');
    });

    it('should throw on invalid JSON response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.reject(new SyntaxError('Unexpected token')),
      });

      await expect(rangeService.screenAddress('SomeAddr'))
        .rejects
        .toThrow('Unexpected token');
    });
  });

  // ─── screenAddress: risk factors ──────────────────────────────────────

  describe('screenAddress - risk factors construction', () => {
    it('should include reasoning as first risk factor when present', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 5,
          riskLevel: 'Medium',
          numHops: 2,
          maliciousAddressesFound: [
            {
              address: 'BadAddr',
              distance: 2,
              name_tag: 'Tornado Cash',
              entity: 'Tornado',
              category: 'mixing',
            },
          ],
          reasoning: 'Indirect exposure to mixer',
          attribution: null,
        }),
      });

      const result = await rangeService.screenAddress('TestAddr');

      expect(result.riskFactors[0]).toBe('Indirect exposure to mixer');
      expect(result.riskFactors[1]).toContain('mixing');
      expect(result.riskFactors[1]).toContain('Tornado Cash');
      expect(result.riskFactors[1]).toContain('2 hops away');
    });

    it('should format risk factor without name_tag when null', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 4,
          riskLevel: 'Medium',
          numHops: 1,
          maliciousAddressesFound: [
            {
              address: 'UnknownBad',
              distance: 1,
              name_tag: null,
              entity: null,
              category: 'scam',
            },
          ],
          reasoning: '',
          attribution: null,
        }),
      });

      const result = await rangeService.screenAddress('TestAddr');

      // No reasoning, so first factor is from maliciousAddresses
      expect(result.riskFactors[0]).toBe('scam - 1 hops away');
      // name_tag is null, so no parenthetical
      expect(result.riskFactors[0]).not.toContain('(');
    });
  });

  // ─── screenMultiple ───────────────────────────────────────────────────

  describe('screenMultiple', () => {
    it('should screen multiple addresses and return all results', async () => {
      const makeResponse = (score: number) => ({
        ok: true,
        json: () => Promise.resolve({
          riskScore: score,
          riskLevel: 'Some level',
          numHops: 0,
          maliciousAddressesFound: [],
          reasoning: '',
          attribution: null,
        }),
      });

      mockFetch
        .mockResolvedValueOnce(makeResponse(1))
        .mockResolvedValueOnce(makeResponse(5))
        .mockResolvedValueOnce(makeResponse(9));

      const results = await rangeService.screenMultiple([
        'Addr1', 'Addr2', 'Addr3',
      ]);

      expect(results).toHaveLength(3);
      expect(results[0].riskLevel).toBe('low');
      expect(results[1].riskLevel).toBe('medium');
      expect(results[2].riskLevel).toBe('severe');

      // Should have made 3 fetch calls
      expect(mockFetch).toHaveBeenCalledTimes(3);
    });

    it('should handle empty address list', async () => {
      const results = await rangeService.screenMultiple([]);

      expect(results).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should propagate error if any address screening fails', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({
            riskScore: 1,
            riskLevel: 'Low',
            numHops: 0,
            maliciousAddressesFound: [],
            reasoning: '',
            attribution: null,
          }),
        })
        .mockResolvedValueOnce({
          ok: false,
          text: () => Promise.resolve('Rate limit exceeded'),
        });

      await expect(rangeService.screenMultiple(['Addr1', 'Addr2']))
        .rejects
        .toThrow('Range screening failed: Rate limit exceeded');
    });

    it('should use default chain "solana" for all addresses', async () => {
      const makeResponse = () => ({
        ok: true,
        json: () => Promise.resolve({
          riskScore: 1,
          riskLevel: 'Low',
          numHops: 0,
          maliciousAddressesFound: [],
          reasoning: '',
          attribution: null,
        }),
      });

      mockFetch
        .mockResolvedValueOnce(makeResponse())
        .mockResolvedValueOnce(makeResponse());

      await rangeService.screenMultiple(['A', 'B']);

      expect(mockFetch).toHaveBeenCalledTimes(2);
      for (const call of mockFetch.mock.calls) {
        expect(call[0]).toContain('network=solana');
      }
    });
  });

  // ─── isHighRisk ───────────────────────────────────────────────────────

  describe('isHighRisk', () => {
    it('should return true for sanctioned addresses', () => {
      expect(rangeService.isHighRisk({
        address: 'x', chain: 'solana', isSanctioned: true,
        riskLevel: 'low', riskScore: 10, riskFactors: [], screenedAt: '',
      })).toBe(true);
    });

    it('should return true for severe risk level', () => {
      expect(rangeService.isHighRisk({
        address: 'x', chain: 'solana', isSanctioned: false,
        riskLevel: 'severe', riskScore: 90, riskFactors: [], screenedAt: '',
      })).toBe(true);
    });

    it('should return true for high risk level', () => {
      expect(rangeService.isHighRisk({
        address: 'x', chain: 'solana', isSanctioned: false,
        riskLevel: 'high', riskScore: 70, riskFactors: [], screenedAt: '',
      })).toBe(true);
    });

    it('should return false for medium risk level', () => {
      expect(rangeService.isHighRisk({
        address: 'x', chain: 'solana', isSanctioned: false,
        riskLevel: 'medium', riskScore: 50, riskFactors: [], screenedAt: '',
      })).toBe(false);
    });

    it('should return false for low risk level', () => {
      expect(rangeService.isHighRisk({
        address: 'x', chain: 'solana', isSanctioned: false,
        riskLevel: 'low', riskScore: 10, riskFactors: [], screenedAt: '',
      })).toBe(false);
    });
  });

  // ─── formatRiskReport ─────────────────────────────────────────────────

  describe('formatRiskReport', () => {
    it('should format a complete risk report with factors', () => {
      const report = rangeService.formatRiskReport({
        address: 'TestAddr123',
        chain: 'solana',
        riskLevel: 'high',
        riskScore: 70,
        isSanctioned: false,
        riskFactors: ['Exposure to mixer', 'scam (Phishing) - 2 hops away'],
        screenedAt: '2025-01-01T00:00:00.000Z',
      });

      expect(report).toContain('Address: TestAddr123');
      expect(report).toContain('Chain: solana');
      expect(report).toContain('Risk Level: HIGH');
      expect(report).toContain('Risk Score: 70/100');
      expect(report).toContain('Sanctioned: No');
      expect(report).toContain('- Exposure to mixer');
      expect(report).toContain('- scam (Phishing) - 2 hops away');
    });

    it('should show YES for sanctioned addresses', () => {
      const report = rangeService.formatRiskReport({
        address: 'Bad',
        chain: 'solana',
        riskLevel: 'severe',
        riskScore: 100,
        isSanctioned: true,
        riskFactors: [],
        screenedAt: '',
      });

      expect(report).toContain('Sanctioned: YES');
    });
  });
});
