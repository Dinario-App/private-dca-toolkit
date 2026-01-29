import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { TOKEN_DECIMALS } from '../types/index';

interface EphemeralWallet {
  keypair: Keypair;
  publicKey: string;
}

interface FundingResult {
  signature: string;
  solAmount: number;
  tokenAmount?: number;
  tokenMint?: string;
}

interface TransferResult {
  signature: string;
  amount: number;
  mint: string;
  destination: string;
}

export class EphemeralService {
  private connection: Connection;

  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Generate a fresh ephemeral wallet for a single transaction
   * This wallet is used once and discarded, breaking on-chain linkability
   */
  generateEphemeralWallet(): EphemeralWallet {
    const keypair = Keypair.generate();
    return {
      keypair,
      publicKey: keypair.publicKey.toBase58(),
    };
  }

  /**
   * Fund the ephemeral wallet with SOL (for fees) and optionally tokens
   *
   * @param userKeypair - The user's main wallet (funding source)
   * @param ephemeralPubkey - The ephemeral wallet to fund
   * @param solAmount - Amount of SOL for transaction fees (recommend 0.005-0.01)
   * @param tokenMint - Optional: SPL token mint to transfer
   * @param tokenAmount - Optional: Amount of tokens to transfer
   */
  async fundEphemeral(
    userKeypair: Keypair,
    ephemeralPubkey: PublicKey,
    solAmount: number,
    tokenMint?: string,
    tokenAmount?: number
  ): Promise<FundingResult> {
    const transaction = new Transaction();

    // Add SOL transfer for fees
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: userKeypair.publicKey,
        toPubkey: ephemeralPubkey,
        lamports: Math.floor(solAmount * LAMPORTS_PER_SOL),
      })
    );

    // If token transfer requested, add those instructions
    if (tokenMint && tokenAmount && tokenAmount > 0) {
      const mintPubkey = new PublicKey(tokenMint);

      // Get or create associated token accounts
      const userAta = await getAssociatedTokenAddress(
        mintPubkey,
        userKeypair.publicKey
      );

      const ephemeralAta = await getAssociatedTokenAddress(
        mintPubkey,
        ephemeralPubkey
      );

      // Check if ephemeral ATA exists, if not create it
      try {
        await getAccount(this.connection, ephemeralAta);
      } catch {
        // ATA doesn't exist, add creation instruction
        transaction.add(
          createAssociatedTokenAccountInstruction(
            userKeypair.publicKey, // payer
            ephemeralAta,          // ata
            ephemeralPubkey,       // owner
            mintPubkey             // mint
          )
        );
      }

      // Get token decimals
      const tokenSymbol = this.getTokenSymbolFromMint(tokenMint);
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;
      const tokenAmountRaw = Math.floor(tokenAmount * Math.pow(10, decimals));

      // Add token transfer
      transaction.add(
        createTransferInstruction(
          userAta,
          ephemeralAta,
          userKeypair.publicKey,
          tokenAmountRaw
        )
      );
    }

    // Send and confirm transaction
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [userKeypair],
      { commitment: 'confirmed' }
    );

    return {
      signature,
      solAmount,
      tokenAmount,
      tokenMint,
    };
  }

  /**
   * Transfer tokens from ephemeral wallet to final destination
   * This is the output side of the privacy flow
   *
   * @param ephemeralKeypair - The ephemeral wallet (source)
   * @param destination - Final destination wallet
   * @param tokenMint - The token to transfer
   * @param amount - Amount to transfer (in token units, not raw)
   */
  async sendToDestination(
    ephemeralKeypair: Keypair,
    destination: PublicKey,
    tokenMint: string,
    amount: number
  ): Promise<TransferResult> {
    const mintPubkey = new PublicKey(tokenMint);
    const transaction = new Transaction();

    // Get ATAs
    const ephemeralAta = await getAssociatedTokenAddress(
      mintPubkey,
      ephemeralKeypair.publicKey
    );

    const destinationAta = await getAssociatedTokenAddress(
      mintPubkey,
      destination
    );

    // Check if destination ATA exists
    try {
      await getAccount(this.connection, destinationAta);
    } catch {
      // Create destination ATA (ephemeral pays for it)
      transaction.add(
        createAssociatedTokenAccountInstruction(
          ephemeralKeypair.publicKey, // payer
          destinationAta,              // ata
          destination,                 // owner
          mintPubkey                   // mint
        )
      );
    }

    // Get token decimals
    const tokenSymbol = this.getTokenSymbolFromMint(tokenMint);
    const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;
    const amountRaw = Math.floor(amount * Math.pow(10, decimals));

    // Add transfer instruction
    transaction.add(
      createTransferInstruction(
        ephemeralAta,
        destinationAta,
        ephemeralKeypair.publicKey,
        amountRaw
      )
    );

    // Send and confirm
    const signature = await sendAndConfirmTransaction(
      this.connection,
      transaction,
      [ephemeralKeypair],
      { commitment: 'confirmed' }
    );

    return {
      signature,
      amount,
      mint: tokenMint,
      destination: destination.toBase58(),
    };
  }

  /**
   * Get remaining SOL balance in ephemeral wallet (for fee recovery)
   */
  async getEphemeralBalance(ephemeralPubkey: PublicKey): Promise<number> {
    const balance = await this.connection.getBalance(ephemeralPubkey);
    return balance / LAMPORTS_PER_SOL;
  }

  /**
   * Get token balance in ephemeral wallet
   */
  async getEphemeralTokenBalance(
    ephemeralPubkey: PublicKey,
    tokenMint: string
  ): Promise<number> {
    try {
      const mintPubkey = new PublicKey(tokenMint);
      const ata = await getAssociatedTokenAddress(mintPubkey, ephemeralPubkey);
      const account = await getAccount(this.connection, ata);

      const tokenSymbol = this.getTokenSymbolFromMint(tokenMint);
      const decimals = TOKEN_DECIMALS[tokenSymbol] || 9;

      return Number(account.amount) / Math.pow(10, decimals);
    } catch {
      return 0;
    }
  }

  /**
   * Recover remaining SOL from ephemeral wallet back to user
   * Call this after the swap is complete to reclaim unused fees
   */
  async recoverSol(
    ephemeralKeypair: Keypair,
    destination: PublicKey
  ): Promise<string | null> {
    const balance = await this.connection.getBalance(ephemeralKeypair.publicKey);

    // Need at least 5000 lamports for the transfer fee
    const minBalance = 5000;
    if (balance <= minBalance) {
      return null; // Not enough to recover
    }

    const transferAmount = balance - minBalance;

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: ephemeralKeypair.publicKey,
        toPubkey: destination,
        lamports: transferAmount,
      })
    );

    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [ephemeralKeypair],
        { commitment: 'confirmed' }
      );
      return signature;
    } catch {
      // Recovery failed, dust left behind
      return null;
    }
  }

  /**
   * Calculate recommended SOL funding amount for ephemeral wallet
   * Covers: ATA creation (if needed) + swap + output transfer + buffer
   */
  getRecommendedSolFunding(): number {
    // 0.002 SOL for source ATA creation (if needed)
    // 0.002 SOL for destination ATA creation (if needed)
    // 0.003 SOL for swap priority fees (Jupiter auto can vary)
    // 0.001 SOL for output transfer
    // 0.002 SOL buffer for safety
    return 0.01;
  }

  /**
   * Display privacy score for the transaction
   */
  getPrivacyScore(useEphemeral: boolean, useScreening: boolean): {
    score: number;
    factors: string[];
  } {
    let score = 0;
    const factors: string[] = [];

    if (useEphemeral) {
      score += 40;
      factors.push('Ephemeral wallet breaks on-chain linkability');
    } else {
      factors.push('Direct wallet exposed in transaction');
    }

    if (useScreening) {
      score += 20;
      factors.push('Range screening ensures compliant counterparties');
    }

    // Base privacy from using non-custodial
    score += 20;
    factors.push('Non-custodial: you control your keys');

    // Future: Arcium confidential transfers would add +20
    // Future: ZK pool (Privacy Cash) would add +20

    return { score, factors };
  }

  private getTokenSymbolFromMint(mint: string): string {
    const TOKEN_MINTS: Record<string, string> = {
      'So11111111111111111111111111111111111111112': 'SOL',
      'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
      'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
      'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
      'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm': 'WIF',
      'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
    };

    return TOKEN_MINTS[mint] || 'UNKNOWN';
  }

  /**
   * Account Pooling: Get or create a reusable ephemeral wallet for a DCA schedule
   * Reusing the same wallet across multiple swaps amortizes rent costs (~0.002 SOL)
   *
   * @param userKeypair - User's main wallet
   * @param scheduleWalletAddress - Stored ephemeral wallet address from schedule
   * @param poolFile - Path to store pooled wallet keys (encrypted in production)
   * @returns Ephemeral wallet to use for this swap
   */
  async getOrCreatePooledWallet(
    userKeypair: Keypair,
    scheduleWalletAddress: string | undefined,
    poolFile: string
  ): Promise<EphemeralWallet> {
    // If schedule already has an ephemeral wallet, regenerate keypair from pool file
    if (scheduleWalletAddress) {
      // In production, this would retrieve from encrypted storage
      // For now, return address indicator
      return {
        keypair: Keypair.generate(), // Placeholder - actual impl would load from pool
        publicKey: scheduleWalletAddress,
      };
    }

    // Create new ephemeral wallet for this schedule
    const ephemeralWallet = this.generateEphemeralWallet();
    // In production, save keypair to encrypted pool file
    // For now, it's stored in memory
    return ephemeralWallet;
  }

  /**
   * Close a pooled ephemeral wallet and recover remaining SOL
   * Call this when DCA schedule is paused, cancelled, or completes
   *
   * @param ephemeralKeypair - Ephemeral wallet keypair
   * @param destination - Where to send recovered SOL
   * @returns Amount recovered (or null if already empty)
   */
  async closePooledWallet(
    ephemeralKeypair: Keypair,
    destination: PublicKey
  ): Promise<number | null> {
    const recovered = await this.recoverSol(ephemeralKeypair, destination);
    if (recovered) {
      console.log(`✓ Recovered ${recovered} from pooled wallet`);
      return parseFloat(recovered);
    }
    return null;
  }
}
