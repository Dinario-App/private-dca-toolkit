interface ScreeningResult {
  address: string;
  chain: string;
  isSanctioned: boolean;
  riskLevel: 'low' | 'medium' | 'high' | 'severe';
  riskScore: number;
  riskFactors: string[];
  screenedAt: string;
}

interface RangeResponse {
  data: {
    address: string;
    chain: string;
    risk_level: string;
    risk_score: number;
    is_sanctioned: boolean;
    risk_factors: string[];
  };
}

export class RangeService {
  private apiKey: string;
  private baseUrl = 'https://api.range.org/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async screenAddress(address: string, chain: string = 'solana'): Promise<ScreeningResult> {
    const response = await fetch(`${this.baseUrl}/screen`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        address,
        chain,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Range screening failed: ${error}`);
    }

    const result = (await response.json()) as RangeResponse;

    return {
      address: result.data.address,
      chain: result.data.chain,
      isSanctioned: result.data.is_sanctioned,
      riskLevel: result.data.risk_level as ScreeningResult['riskLevel'],
      riskScore: result.data.risk_score,
      riskFactors: result.data.risk_factors,
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
