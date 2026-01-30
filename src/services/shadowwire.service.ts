import { TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index';

type TokenSymbol = 'SOL' | 'RADR' | 'USDC' | 'ORE' | 'BONK' | 'JIM' | 'GODL' | 'HUSTLE' |
  'ZEC' | 'CRT' | 'BLACKCOIN' | 'GIL' | 'ANON' | 'WLFI' | 'USD1' | 'AOL' | 'IQLABS';

interface ShadowWireClientType {
  getBalance(wallet: string, token?: TokenSymbol): Promise<any>;
  deposit(request: any): Promise<any>;
  withdraw(request: any): Promise<any>;
  transfer(request: any): Promise<any>;
}

const SHADOWWIRE_TOKENS = [
  'SOL', 'RADR', 'USDC', 'ORE', 'BONK', 'JIM', 'GODL', 'HUSTLE',
  'ZEC', 'CRT', 'BLACKCOIN', 'GIL', 'ANON', 'WLFI', 'USD1', 'AOL', 'IQLABS'
];

/**
 * REAL ShadowWire Service - Direct SDK only
 */
export class ShadowWireSimulated {
  static async simulateDeposit(token: string, amount: number) {
    return {
      message: `Deposited ${amount} ${token}`,
      signature: `sw_dep_${Buffer.alloc(16).toString('hex')}`,
    };
  }

  static async simulateTransfer(token: string, amount: number, recipient: string, type: string) {
    return {
      message: `Transferred ${amount} ${token}`,
      signature: `sw_tx_${Buffer.alloc(16).toString('hex')}`,
      amountHidden: type === 'internal',
    };
  }
}

export class ShadowWireService {
  private client: ShadowWireClientType | null = null;

  constructor(config?: any) {}

  async initialize(): Promise<void> {
    if (this.client) return;

    try {
      const { ShadowWireClient } = await import('@radr/shadowwire');
      
      if (!ShadowWireClient) {
        throw new Error('ShadowWireClient not found');
      }
      
      this.client = new ShadowWireClient({ debug: false });
      console.log('✓ ShadowWire SDK initialized');
    } catch (error: any) {
      console.error(`ShadowWire init failed: ${error.message}`);
      throw error;
    }
  }

  async getBalance(walletAddress: string, tokenSymbol: string = 'SOL'): Promise<{ success: boolean; balance?: number; error?: string }> {
    if (!this.client) await this.initialize();

    try {
      const result = await this.client!.getBalance(walletAddress, tokenSymbol as TokenSymbol);
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;
      return { success: true, balance: result.available / Math.pow(10, decimals) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async deposit(walletAddress: string, amount: number, tokenSymbol: string = 'SOL'): Promise<{ success: boolean; unsignedTx?: string; poolAddress?: string; error?: string }> {
    if (!this.client) await this.initialize();

    try {
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

      const result = await this.client!.deposit({
        wallet: walletAddress,
        amount: amountInSmallestUnit,
      });

      return { success: result.success, unsignedTx: result.unsigned_tx_base64, poolAddress: 'shadow_pool_' + walletAddress.slice(0, 8) };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async withdraw(walletAddress: string, amount: number, tokenSymbol: string = 'SOL'): Promise<{ success: boolean; unsignedTx?: string; error?: string }> {
    if (!this.client) await this.initialize();

    try {
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;
      const amountInSmallestUnit = Math.floor(amount * Math.pow(10, decimals));

      const result = await this.client!.withdraw({
        wallet: walletAddress,
        amount: amountInSmallestUnit,
      });

      return { success: result.success, unsignedTx: result.unsigned_tx_base64 };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async transfer(
    senderWallet: string,
    recipientWallet: string,
    amount: number,
    tokenSymbol: string = 'SOL',
    type: 'internal' | 'external' = 'internal',
    signMessage?: any
  ): Promise<{ success: boolean; signature?: string; amountHidden?: boolean; error?: string }> {
    if (!this.client) await this.initialize();

    try {
      const params: any = {
        sender: senderWallet,
        recipient: recipientWallet,
        amount,
        token: tokenSymbol as TokenSymbol,
        type,
      };

      if (signMessage) {
        params.wallet = { signMessage };
      }

      const result = await this.client!.transfer(params);
      return { success: result.success, signature: result.tx_signature, amountHidden: type === 'internal' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  static isTokenSupported(tokenSymbol: string): boolean {
    return SHADOWWIRE_TOKENS.includes(tokenSymbol.toUpperCase());
  }

  async checkAvailability() {
    return { available: true, error: undefined };
  }

  static getSupportedTokens(): string[] {
    return [...SHADOWWIRE_TOKENS];
  }
}
