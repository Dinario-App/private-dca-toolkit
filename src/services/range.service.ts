interface ScreeningResult {
  address: string;
  chain: string;
  isSanctioned: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'severe';
  riskScore: number;
  riskFactors: string[];
  screenedAt: string;
}

// Range API response format from /v1/risk/address endpoint
interface RangeRiskResponse {
  riskScore: number; // 1-10
  riskLevel: string; // "CRITICAL RISK (Directly malicious)" | "Very low risk" | etc
  numHops: number;
  maliciousAddressesFound: Array<{
    address: string;
    distance: number;
    name_tag: string | null;
    entity: string | null;
    category: string;
  }>;
  reasoning: string;
  attribution: {
    name_tag: string;
    entity: string;
    category: string;
    address_role: string;
  } | null;
}

export class RangeService {
  private apiKey: string;
  private baseUrl = 'https://api.range.org/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async screenAddress(address: string, chain: string = 'solana'): Promise<ScreeningResult> {
    // Use GET /v1/risk/address with query params
    const url = `${this.baseUrl}/risk/address?address=${encodeURIComponent(address)}&network=${encodeURIComponent(chain)}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Range screening failed: ${error}`);
    }

    const result = (await response.json()) as RangeRiskResponse;

    // Map Range's 1-10 risk score to our risk levels
    // 1-3: low, 4-5: medium, 6-7: high, 8-10: severe
    let riskLevel: ScreeningResult['riskLevel'] = 'low';
    if (result.riskScore >= 8) {
      riskLevel = 'severe';
    } else if (result.riskScore >= 6) {
      riskLevel = 'high';
    } else if (result.riskScore >= 4) {
      riskLevel = 'medium';
    }

    // Check if sanctioned (critical risk or has malicious addresses at distance 0)
    const isSanctioned =
      result.riskLevel.toLowerCase().includes('critical') ||
      result.maliciousAddressesFound.some(m => m.distance === 0);

    // Build risk factors from malicious addresses found
    const riskFactors = result.maliciousAddressesFound.map(m =>
      `${m.category}${m.name_tag ? ` (${m.name_tag})` : ''} - ${m.distance} hops away`
    );

    if (result.reasoning) {
      riskFactors.unshift(result.reasoning);
    }

    return {
      address,
      chain,
      isSanctioned,
      riskLevel,
      riskScore: result.riskScore * 10, // Convert 1-10 to 0-100
      riskFactors,
      screenedAt: new Date().toISOString(),
    };
  }

  async screenMultiple(addresses: string[], chain: string = 'solana'): Promise<ScreeningResult[]> {
    const results = await Promise.all(
      addresses.map((address) => this.screenAddress(address, chain))
    );
    return results;
  }

  isHighRisk(result: ScreeningResult): boolean {
    return result.isSanctioned || result.riskLevel === 'severe' || result.riskLevel === 'high';
  }

  formatRiskReport(result: ScreeningResult): string {
    const lines = [
      `Address: ${result.address}`,
      `Chain: ${result.chain}`,
      `Risk Level: ${result.riskLevel.toUpperCase()}`,
      `Risk Score: ${result.riskScore}/100`,
      `Sanctioned: ${result.isSanctioned ? 'YES' : 'No'}`,
    ];

    if (result.riskFactors.length > 0) {
      lines.push(`Risk Factors:`);
      result.riskFactors.forEach((factor) => {
        lines.push(`  - ${factor}`);
      });
    }

    return lines.join('\n');
  }
}
