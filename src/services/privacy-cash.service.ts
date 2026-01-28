/**
 * Privacy Cash Service - ZK Pool Integration
 *
 * Provides zero-knowledge privacy via Privacy Cash pools on Solana.
 * Users can deposit SOL/tokens into a shielded pool and withdraw
 * to any address without on-chain linkability.
 *
 * IMPORTANT: Requires Node.js 24+ due to Privacy Cash SDK dependencies.
 *
 * References:
 * - https://github.com/Privacy-Cash/privacy-cash-sdk
 * - https://www.npmjs.com/package/privacycash
 *
 * @see docs/ARCHITECTURE.md for integration details
 */

import { Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import { TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index.js';

// Privacy Cash SDK types (dynamically imported due to Node 24+ requirement)
// Types match the real SDK at privacycash/dist/index.d.ts
interface PrivacyCashClient {
  deposit(params: { lamports: number }): Promise<{ tx: string }>;
  withdraw(params: { lamports: number; recipientAddress?: string; referrer?: string }): Promise<{
    isPartial: boolean;
    tx: string;
    recipient: string;
    amount_in_lamports: number;
    fee_in_lamports: number;
  }>;
  getPrivateBalance(abortSignal?: AbortSignal): Promise<{ lamports: number }>;
  depositSPL(params: { base_units?: number; amount?: number; mintAddress: PublicKey | string }): Promise<{ tx: string }>;
  withdrawSPL(params: {
    base_units?: number;
    amount?: number;
    mintAddress: PublicKey | string;
    recipientAddress?: string;
    referrer?: string;
  }): Promise<{
    isPartial: boolean;
    tx: string;
    recipient: string;
    base_units: number;
    fee_base_units: number;
  }>;
  getPrivateBalanceSpl(mintAddress: PublicKey | string): Promise<{
    base_units: number;
    amount: number;
    lamports: number;
  }>;
  clearCache(): Promise<any>;
}

// Owner can be string (base58), number[], Uint8Array, or Keypair
type PrivacyCashOwner = string | number[] | Uint8Array | Keypair;

interface PrivacyCashConfig {
  rpcUrl: string;
  owner: PrivacyCashOwner;
}

export class PrivacyCashService {
  private config: PrivacyCashConfig;
  private client: PrivacyCashClient | null = null;
  private isAvailable: boolean = false;

  /**
   * Create Privacy Cash service
   * @param rpcUrl - Solana RPC URL
   * @param owner - Keypair, Uint8Array (secret key), number[] (secret key array), or base58 string
   */
  constructor(rpcUrl: string, owner: PrivacyCashOwner) {
    this.config = { rpcUrl, owner };
  }

  /**
   * Check if Privacy Cash SDK is available (requires Node 24+)
   */
  async checkAvailability(): Promise<{ available: boolean; error?: string }> {
    // Check Node version
    const nodeVersion = parseInt(process.version.slice(1).split('.')[0], 10);
    if (nodeVersion < 24) {
      return {
        available: false,
        error: `Privacy Cash requires Node.js 24+. Current version: ${process.version}`,
      };
    }

    try {
      // Try to dynamically import the SDK
      // @ts-ignore - privacycash is optional, dynamically imported when available
      const privacycashModule = await import('privacycash');
      const PrivacyCash = privacycashModule.PrivacyCash || privacycashModule.default;
      this.client = new PrivacyCash({
        RPC_url: this.config.rpcUrl,
        owner: this.config.owner,
      });
      this.isAvailable = true;
      return { available: true };
    } catch (error: any) {
      return {
        available: false,
        error: `Privacy Cash SDK not installed: ${error.message}. Run: npm install privacycash`,
      };
    }
  }

  /**
   * Deposit SOL into Privacy Cash ZK pool
   * Returns transaction signature
   */
  async depositSol(amount: number): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const result = await this.client!.deposit({ lamports });

      return {
        success: true,
        signature: result.tx,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Deposit failed: ${error.message}`,
      };
    }
  }

  /**
   * Withdraw SOL from Privacy Cash to any address
   * Zero-knowledge proof ensures no link to deposit
   */
  async withdrawSol(
    amount: number,
    recipientAddress: string
  ): Promise<{
    success: boolean;
    signature?: string;
    isPartial?: boolean;
    actualAmount?: number;
    fee?: number;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    try {
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const result = await this.client!.withdraw({
        lamports,
        recipientAddress,
      });

      return {
        success: true,
        signature: result.tx,
        isPartial: result.isPartial,
        actualAmount: result.amount_in_lamports / LAMPORTS_PER_SOL,
        fee: result.fee_in_lamports / LAMPORTS_PER_SOL,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Withdraw failed: ${error.message}`,
      };
    }
  }

  /**
   * Deposit SPL tokens (USDC, USDT) into Privacy Cash
   */
  async depositSpl(
    tokenSymbol: string,
    amount: number
  ): Promise<{
    success: boolean;
    signature?: string;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    const mintAddress = TOKEN_MINTS[tokenSymbol];
    if (!mintAddress) {
      return { success: false, error: `Unsupported token: ${tokenSymbol}` };
    }

    // Only USDC and USDT are supported by Privacy Cash
    if (tokenSymbol !== 'USDC' && tokenSymbol !== 'USDT') {
      return {
        success: false,
        error: `Privacy Cash only supports USDC and USDT. Got: ${tokenSymbol}`,
      };
    }

    try {
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 6;
      const rawAmount = Math.floor(amount * Math.pow(10, decimals));

      const result = await this.client!.depositSPL({
        base_units: rawAmount,
        mintAddress,
      });

      return {
        success: true,
        signature: result.tx,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `SPL deposit failed: ${error.message}`,
      };
    }
  }

  /**
   * Withdraw SPL tokens from Privacy Cash to any address
   */
  async withdrawSpl(
    tokenSymbol: string,
    amount: number,
    recipientAddress: string
  ): Promise<{
    success: boolean;
    signature?: string;
    isPartial?: boolean;
    fee?: number;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    const mintAddress = TOKEN_MINTS[tokenSymbol];
    if (!mintAddress) {
      return { success: false, error: `Unsupported token: ${tokenSymbol}` };
    }

    if (tokenSymbol !== 'USDC' && tokenSymbol !== 'USDT') {
      return {
        success: false,
        error: `Privacy Cash only supports USDC and USDT. Got: ${tokenSymbol}`,
      };
    }

    try {
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 6;
      const rawAmount = Math.floor(amount * Math.pow(10, decimals));

      const result = await this.client!.withdrawSPL({
        mintAddress,
        base_units: rawAmount,
        recipientAddress,
      });

      return {
        success: true,
        signature: result.tx,
        isPartial: result.isPartial,
        fee: result.fee_base_units / Math.pow(10, decimals),
      };
    } catch (error: any) {
      return {
        success: false,
        error: `SPL withdraw failed: ${error.message}`,
      };
    }
  }

  /**
   * Get shielded SOL balance
   */
  async getPrivateBalance(): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    try {
      const result = await this.client!.getPrivateBalance();
      return {
        success: true,
        balance: result.lamports / LAMPORTS_PER_SOL,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get balance: ${error.message}`,
      };
    }
  }

  /**
   * Get shielded SPL token balance
   */
  async getPrivateBalanceSpl(tokenSymbol: string): Promise<{
    success: boolean;
    balance?: number;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    const mintAddress = TOKEN_MINTS[tokenSymbol];
    if (!mintAddress) {
      return { success: false, error: `Unsupported token: ${tokenSymbol}` };
    }

    try {
      const result = await this.client!.getPrivateBalanceSpl(mintAddress);
      return {
        success: true,
        balance: result.amount,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get SPL balance: ${error.message}`,
      };
    }
  }

  /**
   * Clear cached UTXOs (use when balance seems stale)
   */
  clearCache(): void {
    if (this.client) {
      this.client.clearCache();
    }
  }

  /**
   * Get privacy enhancement description for --zk flag
   */
  static getPrivacyDescription(): string {
    return `Privacy Cash ZK Pool:
  - Deposits go into a shielded pool with other users
  - Withdrawals use zero-knowledge proofs
  - No on-chain link between deposit and withdrawal
  - Anonymity set: all pool participants
  - Requires Node.js 24+ and 'npm install privacycash'`;
  }

  /**
   * Check if a token is supported by Privacy Cash
   */
  static isTokenSupported(tokenSymbol: string): boolean {
    return tokenSymbol === 'SOL' || tokenSymbol === 'USDC' || tokenSymbol === 'USDT';
  }
}

/**
 * Simulated Privacy Cash for demo when SDK not available
 * Shows the flow without actual ZK operations
 */
export class PrivacyCashSimulated {
  /**
   * Simulate deposit for demo purposes
   */
  static async simulateDeposit(
    tokenSymbol: string,
    amount: number
  ): Promise<{
    commitment: string;
    message: string;
  }> {
    // Generate a fake commitment hash
    const commitment = `0x${Buffer.from(
      `${tokenSymbol}-${amount}-${Date.now()}`
    )
      .toString('hex')
      .slice(0, 64)}`;

    return {
      commitment,
      message: `[SIMULATED] Deposited ${amount} ${tokenSymbol} to Privacy Cash pool`,
    };
  }

  /**
   * Simulate withdraw for demo purposes
   */
  static async simulateWithdraw(
    tokenSymbol: string,
    amount: number,
    recipient: string
  ): Promise<{
    proof: string;
    message: string;
  }> {
    // Generate a fake ZK proof
    const proof = `zkp_${Buffer.from(`${recipient}-${amount}`).toString('hex').slice(0, 32)}`;

    return {
      proof,
      message: `[SIMULATED] Withdrew ${amount} ${tokenSymbol} to ${recipient.slice(0, 8)}... via ZK proof`,
    };
  }
}
