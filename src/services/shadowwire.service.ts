/**
 * ShadowWire Service - Radr Labs Private Transfers
 *
 * Provides encrypted amount transfers using Bulletproofs zero-knowledge proofs.
 * Transaction amounts are hidden on-chain while remaining verifiable.
 *
 * Package: @radr/shadowwire
 * Docs: https://github.com/radrdotfun/ShadowWire
 *
 * Key Features:
 * - Internal transfers: Amount completely hidden (both parties must be ShadowWire users)
 * - External transfers: Sender anonymous, amount visible (works with any wallet)
 * - 1% relayer fee on all transfers
 * - Supports 17 tokens including SOL, USDC, BONK
 *
 * @see docs/ARCHITECTURE.md for integration details
 */

import { TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index';

// ShadowWire SDK types (match real SDK at @radr/shadowwire/dist/types.d.ts)
type TokenSymbol = 'SOL' | 'RADR' | 'USDC' | 'ORE' | 'BONK' | 'JIM' | 'GODL' | 'HUSTLE' | 'ZEC' | 'CRT' | 'BLACKCOIN' | 'GIL' | 'ANON' | 'WLFI' | 'USD1' | 'AOL' | 'IQLABS';

interface ShadowWireClientType {
  getBalance(wallet: string, token?: TokenSymbol): Promise<PoolBalance>;
  deposit(request: DepositRequest): Promise<DepositResponse>;
  withdraw(request: WithdrawRequest): Promise<WithdrawResponse>;
  transfer(request: TransferRequest): Promise<TransferResponse>;
}

interface PoolBalance {
  wallet: string;
  available: number;
  deposited: number;
  withdrawn_to_escrow: number;
  migrated: boolean;
  pool_address: string;
}

interface DepositRequest {
  wallet: string;
  amount: number;
  token_mint?: string;
}

interface DepositResponse {
  success: boolean;
  unsigned_tx_base64: string;
  pool_address: string;
  user_balance_pda: string;
  amount: number;
}

interface WithdrawRequest {
  wallet: string;
  amount: number;
  token_mint?: string;
}

interface WithdrawResponse {
  success: boolean;
  unsigned_tx_base64: string;
  amount_withdrawn: number;
  fee: number;
}

interface TransferRequest {
  sender: string;
  recipient: string;
  amount: number;
  token: TokenSymbol;
  type: 'internal' | 'external';
  wallet?: {
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  };
}

interface TransferResponse {
  success: boolean;
  tx_signature: string;
  amount_sent: number | null;
  amount_hidden: boolean;
  proof_pda: string;
}

interface ShadowWireConfig {
  debug?: boolean;
}

// Supported tokens by ShadowWire (17 total)
const SHADOWWIRE_TOKENS = [
  'SOL', 'RADR', 'USDC', 'ORE', 'BONK', 'JIM', 'GODL', 'HUSTLE',
  'ZEC', 'CRT', 'BLACKCOIN', 'GIL', 'ANON', 'WLFI', 'USD1', 'AOL', 'IQLABS'
];

export class ShadowWireService {
  private client: ShadowWireClientType | null = null;
  private isAvailable: boolean = false;
  private config: ShadowWireConfig;

  constructor(config: ShadowWireConfig = {}) {
    this.config = config;
  }

  /**
   * Check if ShadowWire SDK is available
   */
  async checkAvailability(): Promise<{ available: boolean; error?: string }> {
    try {
      // @ts-ignore - @radr/shadowwire is optional, dynamically imported
      const { ShadowWireClient } = await import('@radr/shadowwire');
      this.client = new ShadowWireClient({
        debug: this.config.debug || false,
      });
      this.isAvailable = true;
      return { available: true };
    } catch (error: any) {
      return {
        available: false,
        error: `ShadowWire SDK not installed: ${error.message}. Run: npm install @radr/shadowwire`,
      };
    }
  }

  /**
   * Get ShadowWire pool balance for a wallet
   */
  async getBalance(
    walletAddress: string,
    tokenSymbol: string = 'SOL'
  ): Promise<{
    success: boolean;
    balance?: number;
    deposited?: number;
    poolAddress?: string;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    try {
      const result = await this.client!.getBalance(walletAddress, tokenSymbol as TokenSymbol);
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;

      return {
        success: true,
        balance: result.available / Math.pow(10, decimals),
        deposited: result.deposited / Math.pow(10, decimals),
        poolAddress: result.pool_address,
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to get balance: ${error.message}`,
      };
    }
  }

  /**
   * Deposit tokens into ShadowWire pool
   * Required before making internal (amount-hidden) transfers
   * Note: Returns unsigned transaction that needs to be signed by wallet
   */
  async deposit(
    walletAddress: string,
    amount: number,
    tokenSymbol: string = 'SOL'
  ): Promise<{
    success: boolean;
    unsignedTx?: string;
    poolAddress?: string;
    amount?: number;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    try {
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

      const result = await this.client!.deposit({
        wallet: walletAddress,
        amount: amountInSmallestUnit,
      });

      return {
        success: result.success,
        unsignedTx: result.unsigned_tx_base64,
        poolAddress: result.pool_address,
        amount: result.amount / Math.pow(10, decimals),
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Deposit failed: ${error.message}`,
      };
    }
  }

  /**
   * Withdraw tokens from ShadowWire pool
   * Note: Returns unsigned transaction that needs to be signed by wallet
   */
  async withdraw(
    walletAddress: string,
    amount: number,
    tokenSymbol: string = 'SOL'
  ): Promise<{
    success: boolean;
    unsignedTx?: string;
    amountWithdrawn?: number;
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
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

      const result = await this.client!.withdraw({
        wallet: walletAddress,
        amount: amountInSmallestUnit,
      });

      return {
        success: result.success,
        unsignedTx: result.unsigned_tx_base64,
        amountWithdrawn: result.amount_withdrawn / Math.pow(10, decimals),
        fee: result.fee / Math.pow(10, decimals),
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Withdraw failed: ${error.message}`,
      };
    }
  }

  /**
   * Execute a private transfer via ShadowWire
   *
   * Internal transfers: Amount completely hidden (both parties must be ShadowWire users)
   * External transfers: Sender anonymous, amount visible (works with any wallet)
   *
   * Note: 1% relayer fee applies to all transfers
   */
  async transfer(
    senderWallet: string,
    recipientWallet: string,
    amount: number,
    tokenSymbol: string = 'SOL',
    type: 'internal' | 'external' = 'internal',
    signMessage?: (message: Uint8Array) => Promise<Uint8Array>
  ): Promise<{
    success: boolean;
    signature?: string;
    amountSent?: number | null;
    amountHidden?: boolean;
    proofPda?: string;
    error?: string;
  }> {
    if (!this.client) {
      const check = await this.checkAvailability();
      if (!check.available) {
        return { success: false, error: check.error };
      }
    }

    try {
      const params: TransferRequest = {
        sender: senderWallet,
        recipient: recipientWallet,
        amount,
        token: tokenSymbol as TokenSymbol,
        type,
      };

      // Wallet signature required for all transfers
      if (signMessage) {
        params.wallet = { signMessage };
      }

      const result = await this.client!.transfer(params);

      return {
        success: result.success,
        signature: result.tx_signature,
        amountSent: result.amount_sent,
        amountHidden: result.amount_hidden,
        proofPda: result.proof_pda,
      };
    } catch (error: any) {
      // Handle specific ShadowWire errors
      if (error.name === 'RecipientNotFoundError') {
        return {
          success: false,
          error: `Recipient ${recipientWallet.slice(0, 8)}... is not a ShadowWire user. Use external transfer instead.`,
        };
      }
      if (error.name === 'InsufficientBalanceError') {
        return {
          success: false,
          error: `Insufficient ShadowWire balance. Deposit more ${tokenSymbol} first.`,
        };
      }

      return {
        success: false,
        error: `Transfer failed: ${error.message}`,
      };
    }
  }

  /**
   * Check if a token is supported by ShadowWire
   */
  static isTokenSupported(tokenSymbol: string): boolean {
    return SHADOWWIRE_TOKENS.includes(tokenSymbol.toUpperCase());
  }

  /**
   * Get list of supported tokens
   */
  static getSupportedTokens(): string[] {
    return [...SHADOWWIRE_TOKENS];
  }

  /**
   * Get privacy description for CLI output
   */
  static getPrivacyDescription(): string {
    return `ShadowWire (Radr Labs):
  - Transaction amounts encrypted with Bulletproofs
  - Internal transfers: Amount completely hidden
  - External transfers: Sender anonymous, amount visible
  - 1% relayer fee on all transfers
  - Supports 17 tokens including SOL, USDC, BONK`;
  }
}

/**
 * Simulated ShadowWire for demo when SDK not available
 */
export class ShadowWireSimulated {
  /**
   * Simulate deposit for demo purposes
   */
  static async simulateDeposit(
    tokenSymbol: string,
    amount: number
  ): Promise<{
    signature: string;
    message: string;
  }> {
    const fakeSignature = `sw_dep_${Buffer.from(`${tokenSymbol}-${amount}-${Date.now()}`).toString('hex').slice(0, 32)}`;

    return {
      signature: fakeSignature,
      message: `[SIMULATED] Deposited ${amount} ${tokenSymbol} to ShadowWire pool`,
    };
  }

  /**
   * Simulate private transfer for demo purposes
   */
  static async simulateTransfer(
    tokenSymbol: string,
    amount: number,
    recipient: string,
    type: 'internal' | 'external'
  ): Promise<{
    signature: string;
    amountHidden: boolean;
    message: string;
  }> {
    const fakeSignature = `sw_tx_${Buffer.from(`${recipient}-${amount}`).toString('hex').slice(0, 32)}`;
    const amountHidden = type === 'internal';

    return {
      signature: fakeSignature,
      amountHidden,
      message: `[SIMULATED] Transferred ${amountHidden ? '[HIDDEN]' : amount} ${tokenSymbol} to ${recipient.slice(0, 8)}... via ShadowWire`,
    };
  }

  /**
   * Simulate withdraw for demo purposes
   */
  static async simulateWithdraw(
    tokenSymbol: string,
    amount: number,
    wallet: string
  ): Promise<{
    signature: string;
    message: string;
  }> {
    const fakeSignature = `sw_wd_${Buffer.from(`${wallet}-${amount}`).toString('hex').slice(0, 32)}`;

    return {
      signature: fakeSignature,
      message: `[SIMULATED] Withdrew ${amount} ${tokenSymbol} from ShadowWire to ${wallet.slice(0, 8)}...`,
    };
  }
}
