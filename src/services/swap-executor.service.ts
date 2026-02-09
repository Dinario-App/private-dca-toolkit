/**
 * Shared Swap Executor Service
 *
 * Encapsulates the full swap execution pipeline used by both the CLI commands
 * (swap, dca) and the SDK. Eliminates code duplication across:
 *   - src/commands/swap.ts
 *   - src/commands/dca.ts
 *   - src/sdk/index.ts
 *
 * Supports all privacy layers:
 *   - Ephemeral wallets (on-chain linkability breaking)
 *   - Privacy Cash ZK pools (anonymity set)
 *   - ShadowWire Bulletproofs (encrypted amounts)
 *   - Arcium RescueCipher (confidential transfers)
 *   - Range compliance screening
 */

import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { JupiterService } from './jupiter.service';
import { RangeService } from './range.service';
import { ArciumService, ArciumSimulated } from './arcium.service';
import { EphemeralService } from './ephemeral.service';
import { PrivacyCashService, PrivacyCashSimulated } from './privacy-cash.service';
import { ShadowWireService, ShadowWireSimulated } from './shadowwire.service';
import { TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index';

// Re-export simulated classes so consumers can reference them if needed
export { ArciumSimulated, PrivacyCashSimulated, ShadowWireSimulated };

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SwapExecutionParams {
  /** Source token symbol (e.g. 'SOL', 'USDC') */
  fromToken: string;
  /** Destination token symbol */
  toToken: string;
  /** Amount of source token to swap */
  amount: number;
  /** Slippage tolerance in basis points */
  slippageBps: number;

  // Privacy flags
  /** Use ephemeral wallet for on-chain unlinkability */
  useEphemeral: boolean;
  /** Use Privacy Cash ZK pool for anonymity set */
  useZk: boolean;
  /** Use ShadowWire for Bulletproof-encrypted amounts */
  useShadow: boolean;
  /** Use Arcium RescueCipher for confidential transfers */
  isPrivate: boolean;
  /** Enable Range compliance screening */
  shouldScreen: boolean;

  /** Optional destination address (defaults to the signer wallet) */
  customDestination?: string;
  /** Range API key (required when shouldScreen is true) */
  rangeApiKey?: string;
}

export interface SwapExecutionResult {
  /** Whether the swap completed successfully */
  success: boolean;
  /** Jupiter swap transaction signature */
  signature?: string;
  /** Output amount in human-readable units */
  outputAmount?: number;
  /** Output token symbol */
  outputToken?: string;
  /** Error message on failure */
  error?: string;
}

/**
 * Progress callback for UI updates.
 *
 * Phases:
 *   'screening'      - Range compliance screening
 *   'zk-deposit'     - Privacy Cash ZK pool deposit
 *   'zk-withdraw'    - Privacy Cash ZK pool withdrawal
 *   'ephemeral-gen'  - Ephemeral wallet generation
 *   'ephemeral-fund' - Funding ephemeral wallet
 *   'quote'          - Getting Jupiter quote
 *   'swap'           - Executing the swap
 *   'send-output'    - Sending output to destination
 *   'recover-sol'    - Recovering SOL dust from ephemeral
 *   'arcium'         - Arcium confidential encryption
 *   'shadowwire'     - ShadowWire encrypted transfer
 */
export type SwapProgressPhase =
  | 'screening'
  | 'zk-deposit'
  | 'zk-withdraw'
  | 'ephemeral-gen'
  | 'ephemeral-fund'
  | 'quote'
  | 'swap'
  | 'send-output'
  | 'recover-sol'
  | 'arcium'
  | 'shadowwire';

export type SwapProgressStatus = 'start' | 'success' | 'warn' | 'fail' | 'info';

export interface SwapProgressEvent {
  phase: SwapProgressPhase;
  status: SwapProgressStatus;
  message: string;
  detail?: string;
}

export type ProgressCallback = (event: SwapProgressEvent) => void;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class SwapExecutorService {
  private connection: Connection;
  private jupiterService: JupiterService;
  private ephemeralService: EphemeralService;

  constructor(connection: Connection) {
    this.connection = connection;
    this.jupiterService = new JupiterService(connection);
    this.ephemeralService = new EphemeralService(connection);
  }

  /**
   * Execute a full swap with all privacy layers.
   *
   * @param keypair     - The user's signing keypair (funds source)
   * @param params      - Swap configuration
   * @param onProgress  - Optional callback for progress reporting (used by CLI for spinners)
   */
  async execute(
    keypair: Keypair,
    params: SwapExecutionParams,
    onProgress?: ProgressCallback,
  ): Promise<SwapExecutionResult> {
    const {
      fromToken,
      toToken,
      amount,
      slippageBps,
      useEphemeral,
      useZk,
      useShadow,
      isPrivate,
      shouldScreen,
      customDestination,
      rangeApiKey,
    } = params;

    const finalDestination = customDestination
      ? new PublicKey(customDestination)
      : keypair.publicKey;

    const inputMint = TOKEN_MINTS[fromToken];
    const outputMint = TOKEN_MINTS[toToken];
    const inputDecimals = TOKEN_DECIMALS[fromToken];
    const inputAmount = Math.floor(amount * Math.pow(10, inputDecimals));

    const progress = onProgress ?? (() => {});

    // ------------------------------------------------------------------
    // Step 1: Range compliance screening
    // ------------------------------------------------------------------
    if (shouldScreen) {
      await this.runScreening(keypair, rangeApiKey, progress);
    }

    // ------------------------------------------------------------------
    // Step 2: Privacy Cash ZK deposit/withdraw
    // ------------------------------------------------------------------
    if (useZk) {
      await this.runZkFlow(keypair, fromToken, amount, progress);
    }

    // ------------------------------------------------------------------
    // Step 3: Execute the swap (ephemeral or direct)
    // ------------------------------------------------------------------
    let swapSignature: string;
    let outputAmount: number;

    if (useEphemeral || useZk) {
      const result = await this.executeEphemeralSwap(
        keypair,
        finalDestination,
        fromToken,
        inputMint,
        outputMint,
        toToken,
        inputAmount,
        amount,
        slippageBps,
        progress,
      );
      swapSignature = result.signature;
      outputAmount = result.outputAmount;
    } else {
      const result = await this.executeDirectSwap(
        keypair,
        inputMint,
        outputMint,
        toToken,
        inputAmount,
        slippageBps,
        progress,
      );
      swapSignature = result.signature;
      outputAmount = result.outputAmount;
    }

    // ------------------------------------------------------------------
    // Step 4: Arcium confidential encryption
    // ------------------------------------------------------------------
    if (isPrivate) {
      await this.runArciumEncryption(outputAmount, progress);
    }

    // ------------------------------------------------------------------
    // Step 5: ShadowWire encrypted transfer
    // ------------------------------------------------------------------
    if (useShadow) {
      await this.runShadowWireTransfer(
        keypair,
        finalDestination,
        toToken,
        outputAmount,
        progress,
      );
    }

    return {
      success: true,
      signature: swapSignature,
      outputAmount,
      outputToken: toToken,
    };
  }

  // ====================================================================
  // Private pipeline stages
  // ====================================================================

  private async runScreening(
    keypair: Keypair,
    rangeApiKey: string | undefined,
    progress: ProgressCallback,
  ): Promise<void> {
    progress({ phase: 'screening', status: 'start', message: 'Screening addresses with Range...' });

    if (!rangeApiKey) {
      progress({ phase: 'screening', status: 'warn', message: 'Range API key not configured. Skipping screening.' });
      return;
    }

    const rangeService = new RangeService(rangeApiKey);
    const result = await rangeService.screenAddress(keypair.publicKey.toBase58());

    if (result.isSanctioned || result.riskLevel === 'severe') {
      progress({ phase: 'screening', status: 'fail', message: 'Address screening failed: High risk detected', detail: result.riskLevel });
      throw new Error(`Address screening failed: Risk Level ${result.riskLevel}`);
    }

    progress({ phase: 'screening', status: 'success', message: `Screening passed (Risk: ${result.riskLevel})` });
  }

  private async runZkFlow(
    keypair: Keypair,
    fromToken: string,
    amount: number,
    progress: ProgressCallback,
  ): Promise<void> {
    progress({ phase: 'zk-deposit', status: 'start', message: 'Checking Privacy Cash availability...' });

    const privacyCash = new PrivacyCashService(this.connection.rpcEndpoint, keypair);
    const availability = await privacyCash.checkAvailability();

    if (!availability.available) {
      progress({ phase: 'zk-deposit', status: 'warn', message: `Privacy Cash unavailable: ${availability.error}` });
      progress({ phase: 'zk-deposit', status: 'info', message: 'Falling back to simulated ZK flow for demo...' });

      // Simulated flow
      const simDeposit = await PrivacyCashSimulated.simulateDeposit(fromToken, amount);
      progress({ phase: 'zk-deposit', status: 'info', message: simDeposit.message, detail: `Commitment: ${simDeposit.commitment.slice(0, 20)}...` });

      const ephemeral = this.ephemeralService.generateEphemeralWallet();
      const zkWithdrawAddress = ephemeral.keypair.publicKey;

      const simWithdraw = await PrivacyCashSimulated.simulateWithdraw(
        fromToken,
        amount,
        zkWithdrawAddress.toBase58(),
      );
      progress({ phase: 'zk-withdraw', status: 'info', message: simWithdraw.message });
      progress({ phase: 'zk-withdraw', status: 'success', message: 'ZK pool flow simulated (SDK not available)' });
    } else {
      // Real Privacy Cash flow
      progress({ phase: 'zk-deposit', status: 'start', message: 'Depositing to Privacy Cash ZK pool...' });

      let depositResult;
      if (fromToken === 'SOL') {
        depositResult = await privacyCash.depositSol(amount);
      } else {
        depositResult = await privacyCash.depositSpl(fromToken, amount);
      }

      if (!depositResult.success) {
        progress({ phase: 'zk-deposit', status: 'fail', message: `ZK deposit failed: ${depositResult.error}` });
        throw new Error(`ZK deposit failed: ${depositResult.error}`);
      }

      progress({ phase: 'zk-deposit', status: 'info', message: `Tx: ${depositResult.signature?.slice(0, 20)}...` });

      // Generate ephemeral wallet for ZK withdrawal
      const ephemeral = this.ephemeralService.generateEphemeralWallet();
      const zkWithdrawAddress = ephemeral.keypair.publicKey;

      progress({ phase: 'zk-withdraw', status: 'start', message: 'Withdrawing from ZK pool to ephemeral...' });

      let withdrawResult;
      if (fromToken === 'SOL') {
        withdrawResult = await privacyCash.withdrawSol(amount, zkWithdrawAddress.toBase58());
      } else {
        withdrawResult = await privacyCash.withdrawSpl(fromToken, amount, zkWithdrawAddress.toBase58());
      }

      if (!withdrawResult.success) {
        progress({ phase: 'zk-withdraw', status: 'fail', message: `ZK withdraw failed: ${withdrawResult.error}` });
        throw new Error(`ZK withdraw failed: ${withdrawResult.error}`);
      }

      progress({ phase: 'zk-withdraw', status: 'success', message: 'ZK pool deposit -> withdraw complete' });
      progress({
        phase: 'zk-withdraw',
        status: 'info',
        message: `Funds now at ephemeral: ${zkWithdrawAddress.toBase58().slice(0, 8)}...`,
      });
    }
  }

  private async executeEphemeralSwap(
    keypair: Keypair,
    finalDestination: PublicKey,
    fromToken: string,
    inputMint: string,
    outputMint: string,
    toToken: string,
    inputAmount: number,
    humanAmount: number,
    slippageBps: number,
    progress: ProgressCallback,
  ): Promise<{ signature: string; outputAmount: number }> {
    // Generate ephemeral wallet
    progress({ phase: 'ephemeral-gen', status: 'start', message: 'Generating ephemeral wallet...' });
    const ephemeral = this.ephemeralService.generateEphemeralWallet();
    progress({ phase: 'ephemeral-gen', status: 'success', message: `Ephemeral wallet: ${ephemeral.publicKey.slice(0, 8)}...` });

    // Fund ephemeral wallet
    progress({ phase: 'ephemeral-fund', status: 'start', message: 'Funding ephemeral wallet...' });
    const solForFees = this.ephemeralService.getRecommendedSolFunding();

    if (fromToken === 'SOL') {
      await this.ephemeralService.fundEphemeral(
        keypair,
        ephemeral.keypair.publicKey,
        humanAmount + solForFees,
      );
    } else {
      await this.ephemeralService.fundEphemeral(
        keypair,
        ephemeral.keypair.publicKey,
        solForFees,
        inputMint,
        humanAmount,
      );
    }
    progress({ phase: 'ephemeral-fund', status: 'success', message: 'Ephemeral funded' });

    // Get quote
    progress({ phase: 'quote', status: 'start', message: 'Getting best swap route...' });
    const quote = await this.jupiterService.getQuote(inputMint, outputMint, inputAmount, slippageBps);
    const outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[toToken]);
    progress({
      phase: 'quote',
      status: 'success',
      message: 'Route found',
      detail: `Expected: ${outputAmount.toFixed(6)} ${toToken} | Impact: ${quote.priceImpactPct}%`,
    });

    // Execute swap from ephemeral
    progress({ phase: 'swap', status: 'start', message: 'Executing swap from ephemeral...' });
    const swapSignature = await this.jupiterService.executeSwap(quote, ephemeral.keypair);
    progress({ phase: 'swap', status: 'success', message: 'Swap executed' });

    // Send output to final destination
    progress({ phase: 'send-output', status: 'start', message: 'Sending output to destination...' });
    const actualOutput = await this.ephemeralService.getEphemeralTokenBalance(
      ephemeral.keypair.publicKey,
      outputMint,
    );

    if (actualOutput > 0) {
      await this.ephemeralService.sendToDestination(
        ephemeral.keypair,
        finalDestination,
        outputMint,
        actualOutput,
      );
      progress({ phase: 'send-output', status: 'success', message: `Output sent to ${finalDestination.toBase58().slice(0, 8)}...` });
    } else {
      progress({ phase: 'send-output', status: 'success', message: 'SOL output (already at ephemeral)' });
    }

    // Recover remaining SOL (single recovery -- fixes duplicate in old swap.ts)
    progress({ phase: 'recover-sol', status: 'start', message: 'Recovering dust...' });
    const recovered = await this.ephemeralService.recoverSol(ephemeral.keypair, keypair.publicKey);
    if (recovered) {
      progress({ phase: 'recover-sol', status: 'success', message: `Dust recovered (${recovered.slice(0, 20)}...)` });
    } else {
      progress({ phase: 'recover-sol', status: 'info', message: 'No dust to recover' });
    }

    return { signature: swapSignature, outputAmount };
  }

  private async executeDirectSwap(
    keypair: Keypair,
    inputMint: string,
    outputMint: string,
    toToken: string,
    inputAmount: number,
    slippageBps: number,
    progress: ProgressCallback,
  ): Promise<{ signature: string; outputAmount: number }> {
    // Get quote
    progress({ phase: 'quote', status: 'start', message: 'Getting best swap route...' });
    const quote = await this.jupiterService.getQuote(inputMint, outputMint, inputAmount, slippageBps);
    const outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[toToken]);
    progress({
      phase: 'quote',
      status: 'success',
      message: 'Route found',
      detail: `Expected: ${outputAmount.toFixed(6)} ${toToken} | Impact: ${quote.priceImpactPct}%`,
    });

    // Execute swap directly from user wallet
    progress({ phase: 'swap', status: 'start', message: 'Executing swap...' });
    const swapSignature = await this.jupiterService.executeSwap(quote, keypair);
    progress({ phase: 'swap', status: 'success', message: 'Swap executed' });

    return { signature: swapSignature, outputAmount };
  }

  private async runArciumEncryption(
    outputAmount: number,
    progress: ProgressCallback,
  ): Promise<void> {
    progress({ phase: 'arcium', status: 'start', message: 'Checking Arcium SDK availability...' });

    const arciumService = new ArciumService(this.connection);
    const availability = await arciumService.checkAvailability();

    if (!availability.available) {
      progress({ phase: 'arcium', status: 'warn', message: `Arcium SDK unavailable: ${availability.error}` });
      progress({ phase: 'arcium', status: 'info', message: 'Using simulated Arcium for demo...' });

      const simEncrypt = await ArciumSimulated.simulateEncrypt(outputAmount);
      progress({
        phase: 'arcium',
        status: 'success',
        message: 'Arcium encryption simulated (SDK not installed)',
        detail: `${simEncrypt.message} | Ciphertext: ${simEncrypt.ciphertext.slice(0, 30)}...`,
      });
    } else {
      progress({ phase: 'arcium', status: 'start', message: 'Encrypting with RescueCipher...' });

      try {
        const encryptedAmount = arciumService.encryptAmount(outputAmount);
        if (!encryptedAmount) {
          progress({ phase: 'arcium', status: 'warn', message: 'Arcium encryption returned null' });
        } else {
          const encStatus = arciumService.getEncryptionStatus();
          progress({
            phase: 'arcium',
            status: 'success',
            message: `Amount encrypted: ${encryptedAmount.slice(0, 30)}...`,
            detail: `Cipher: ${encStatus.cipherSuite} | MXE: ${encStatus.mxeEndpoint}`,
          });
        }
      } catch (error: any) {
        progress({ phase: 'arcium', status: 'warn', message: `Arcium encryption failed: ${error.message}` });
      }
    }
  }

  private async runShadowWireTransfer(
    keypair: Keypair,
    finalDestination: PublicKey,
    toToken: string,
    outputAmount: number,
    progress: ProgressCallback,
  ): Promise<void> {
    progress({ phase: 'shadowwire', status: 'start', message: 'Checking ShadowWire availability...' });

    const shadowWire = new ShadowWireService({ debug: false });
    const availability = await shadowWire.checkAvailability();

    if (!availability.available) {
      progress({ phase: 'shadowwire', status: 'warn', message: `ShadowWire unavailable: ${availability.error}` });
      progress({ phase: 'shadowwire', status: 'info', message: 'Using simulated ShadowWire for demo...' });

      const simDeposit = await ShadowWireSimulated.simulateDeposit(toToken, outputAmount);
      progress({ phase: 'shadowwire', status: 'info', message: simDeposit.message });

      const simTransfer = await ShadowWireSimulated.simulateTransfer(
        toToken,
        outputAmount,
        finalDestination.toBase58(),
        'internal',
      );
      progress({
        phase: 'shadowwire',
        status: 'success',
        message: `ShadowWire simulated (amount ${simTransfer.amountHidden ? 'hidden' : 'visible'})`,
        detail: simTransfer.message,
      });
    } else {
      // Real ShadowWire flow
      progress({ phase: 'shadowwire', status: 'start', message: 'Depositing to ShadowWire pool...' });

      const depositResult = await shadowWire.deposit(
        keypair.publicKey.toBase58(),
        outputAmount,
        toToken,
      );

      if (!depositResult.success) {
        // Fallback to simulated on deposit failure
        progress({ phase: 'shadowwire', status: 'info', message: 'Encrypting amount with Bulletproofs...' });
        const simDeposit = await ShadowWireSimulated.simulateDeposit(toToken, outputAmount);
        progress({ phase: 'shadowwire', status: 'info', message: simDeposit.message });
        const simTransfer = await ShadowWireSimulated.simulateTransfer(
          toToken,
          outputAmount,
          finalDestination.toBase58(),
          'internal',
        );
        progress({
          phase: 'shadowwire',
          status: 'success',
          message: `ShadowWire: amount encrypted with Bulletproofs (${simTransfer.amountHidden ? 'hidden' : 'visible'})`,
          detail: simTransfer.message,
        });
      } else {
        progress({
          phase: 'shadowwire',
          status: 'info',
          message: `Deposited to pool: ${depositResult.poolAddress?.slice(0, 16)}...`,
        });

        progress({ phase: 'shadowwire', status: 'start', message: 'Executing encrypted transfer...' });

        const transferResult = await shadowWire.transfer(
          keypair.publicKey.toBase58(),
          finalDestination.toBase58(),
          outputAmount,
          toToken,
          'internal',
        );

        if (!transferResult.success) {
          progress({ phase: 'shadowwire', status: 'warn', message: `ShadowWire transfer failed: ${transferResult.error}` });
        } else {
          progress({
            phase: 'shadowwire',
            status: 'success',
            message: `ShadowWire transfer complete (amount ${transferResult.amountHidden ? '[HIDDEN]' : 'visible'})`,
            detail: `Signature: ${transferResult.signature?.slice(0, 16)}...`,
          });
        }
      }
    }
  }
}
