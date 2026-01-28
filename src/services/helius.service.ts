import { Transaction, VersionedTransaction, ComputeBudgetProgram } from '@solana/web3.js';

export type PriorityLevel = 'Min' | 'Low' | 'Medium' | 'High' | 'VeryHigh' | 'UnsafeMax';

interface PriorityFeeResponse {
  jsonrpc: string;
  id: string;
  result: {
    priorityFeeEstimate: number;
    priorityFeeLevels?: {
      min: number;
      low: number;
      medium: number;
      high: number;
      veryHigh: number;
      unsafeMax: number;
    };
  };
}

export class HeliusService {
  private rpcUrl: string;

  constructor(rpcUrl: string) {
    this.rpcUrl = rpcUrl;
  }

  /**
   * Check if the RPC URL is a Helius endpoint
   */
  static isHeliusRpc(url: string): boolean {
    return url.includes('helius') || url.includes('helius-rpc.com');
  }

  /**
   * Get priority fee estimate for a transaction
   * Uses Helius's getPriorityFeeEstimate method
   *
   * @param serializedTx - Base64 encoded serialized transaction
   * @param priorityLevel - Priority level (Min, Low, Medium, High, VeryHigh, UnsafeMax)
   * @returns Priority fee in microlamports
   */
  async getPriorityFeeEstimate(
    serializedTx: string,
    priorityLevel: PriorityLevel = 'Medium'
  ): Promise<number> {
    if (!HeliusService.isHeliusRpc(this.rpcUrl)) {
      // For non-Helius RPCs, return a default priority fee
      return this.getDefaultPriorityFee(priorityLevel);
    }

    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getPriorityFeeEstimate',
          params: [
            {
              transaction: serializedTx,
              options: {
                priorityLevel,
                recommended: true,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        console.warn(`Helius priority fee API error: ${response.status}`);
        return this.getDefaultPriorityFee(priorityLevel);
      }

      const result = (await response.json()) as PriorityFeeResponse;

      if (result.result?.priorityFeeEstimate) {
        return result.result.priorityFeeEstimate;
      }

      return this.getDefaultPriorityFee(priorityLevel);
    } catch (error) {
      console.warn('Failed to get Helius priority fee, using default');
      return this.getDefaultPriorityFee(priorityLevel);
    }
  }

  /**
   * Get priority fee estimate based on account keys (without transaction)
   */
  async getPriorityFeeByAccounts(
    accountKeys: string[],
    priorityLevel: PriorityLevel = 'Medium'
  ): Promise<number> {
    if (!HeliusService.isHeliusRpc(this.rpcUrl)) {
      return this.getDefaultPriorityFee(priorityLevel);
    }

    try {
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: '1',
          method: 'getPriorityFeeEstimate',
          params: [
            {
              accountKeys,
              options: {
                priorityLevel,
                recommended: true,
              },
            },
          ],
        }),
      });

      if (!response.ok) {
        return this.getDefaultPriorityFee(priorityLevel);
      }

      const result = (await response.json()) as PriorityFeeResponse;
      return result.result?.priorityFeeEstimate || this.getDefaultPriorityFee(priorityLevel);
    } catch {
      return this.getDefaultPriorityFee(priorityLevel);
    }
  }

  /**
   * Add priority fee instructions to a transaction
   */
  addPriorityFeeToTransaction(
    transaction: Transaction,
    priorityFee: number,
    computeUnits: number = 200_000
  ): Transaction {
    // Set compute unit limit
    const computeUnitIx = ComputeBudgetProgram.setComputeUnitLimit({
      units: computeUnits,
    });

    // Set compute unit price (priority fee in microlamports per CU)
    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    });

    // Add instructions at the beginning of the transaction
    transaction.instructions = [computeUnitIx, priorityFeeIx, ...transaction.instructions];

    return transaction;
  }

  /**
   * Get default priority fee for non-Helius RPCs
   * Values in microlamports per compute unit
   */
  private getDefaultPriorityFee(level: PriorityLevel): number {
    const defaults: Record<PriorityLevel, number> = {
      Min: 1,
      Low: 10_000,
      Medium: 100_000,
      High: 500_000,
      VeryHigh: 1_000_000,
      UnsafeMax: 10_000_000,
    };
    return defaults[level];
  }

  /**
   * Calculate total priority fee cost in lamports
   */
  calculatePriorityFeeCost(priorityFee: number, computeUnits: number = 200_000): number {
    // priorityFee is in microlamports per CU
    // Total cost = (priorityFee * computeUnits) / 1_000_000
    return Math.ceil((priorityFee * computeUnits) / 1_000_000);
  }

  /**
   * Format priority fee for display
   */
  formatPriorityFee(priorityFee: number, computeUnits: number = 200_000): string {
    const costLamports = this.calculatePriorityFeeCost(priorityFee, computeUnits);
    const costSol = costLamports / 1_000_000_000;

    if (costSol < 0.000001) {
      return `${costLamports} lamports`;
    }
    return `${costSol.toFixed(6)} SOL`;
  }
}
