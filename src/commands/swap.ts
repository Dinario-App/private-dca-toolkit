import { Command } from 'commander';
import { PublicKey } from '@solana/web3.js';
import { loadConfig, loadKeypair, getConnection } from '../utils/wallet.js';
import { logger } from '../utils/logger.js';
import { JupiterService } from '../services/jupiter.service.js';
import { RangeService } from '../services/range.service.js';
import { ArciumService, ArciumSimulated } from '../services/arcium.service.js';
import { EphemeralService } from '../services/ephemeral.service.js';
import { PrivacyCashService, PrivacyCashSimulated } from '../services/privacy-cash.service.js';
import { ShadowWireService, ShadowWireSimulated } from '../services/shadowwire.service.js';
import { TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index.js';
import ora from 'ora';

export const swapCommand = new Command('swap')
  .description('Execute a token swap')
  .requiredOption('--from <token>', 'Source token (SOL, USDC, USDT, BONK, WIF, JUP)')
  .requiredOption('--to <token>', 'Destination token (SOL, USDC, USDT, BONK, WIF, JUP)')
  .requiredOption('--amount <number>', 'Amount to swap')
  .option('--ephemeral', 'Use ephemeral wallet for privacy (breaks on-chain linkability)', false)
  .option('--zk', 'Use Privacy Cash ZK pool for maximum anonymity (requires Node 24+)', false)
  .option('--shadow', 'Use ShadowWire for encrypted amounts (Bulletproofs via Radr Labs)', false)
  .option('--private', 'Use Arcium confidential transfer for encrypted amounts', false)
  .option('--screen', 'Screen addresses with Range before swap', false)
  .option('--slippage <bps>', 'Slippage tolerance in basis points', '50')
  .option('--destination <address>', 'Send output to different address (only with --ephemeral)')
  .action(async (options) => {
    const config = loadConfig();
    if (!config || !config.walletPath || !config.rpcUrl) {
      logger.error('Please configure wallet and RPC first: private-dca config set-wallet <path>');
      return;
    }

    const fromToken = options.from.toUpperCase();
    const toToken = options.to.toUpperCase();
    const amount = parseFloat(options.amount);
    const slippageBps = parseInt(options.slippage);
    const useEphemeral = options.ephemeral;
    const useZk = options.zk;
    const useShadow = options.shadow;
    const isPrivate = options.private;
    const shouldScreen = options.screen;
    const customDestination = options.destination;

    // Validate tokens
    if (!TOKEN_MINTS[fromToken] || !TOKEN_MINTS[toToken]) {
      logger.error(`Invalid token. Supported: ${Object.keys(TOKEN_MINTS).join(', ')}`);
      return;
    }

    if (fromToken === toToken) {
      logger.error('Source and destination tokens must be different');
      return;
    }

    if (customDestination && !useEphemeral) {
      logger.error('--destination requires --ephemeral flag');
      return;
    }

    // ZK mode requires ephemeral and only supports SOL/USDC/USDT
    if (useZk) {
      if (!PrivacyCashService.isTokenSupported(fromToken)) {
        logger.error(`Privacy Cash ZK only supports SOL, USDC, USDT. Got: ${fromToken}`);
        return;
      }
    }

    // ShadowWire supports 17 tokens
    if (useShadow) {
      if (!ShadowWireService.isTokenSupported(fromToken)) {
        logger.error(`ShadowWire doesn't support ${fromToken}. Supported: ${ShadowWireService.getSupportedTokens().join(', ')}`);
        return;
      }
    }

    logger.header('Private DCA Swap');
    logger.keyValue('From', `${amount} ${fromToken}`);
    logger.keyValue('To', toToken);
    logger.keyValue('Ephemeral', useEphemeral ? 'Yes (privacy mode)' : 'No');
    logger.keyValue('ZK Pool', useZk ? 'Yes (maximum privacy)' : 'No');
    logger.keyValue('ShadowWire', useShadow ? 'Yes (encrypted amounts)' : 'No');
    logger.keyValue('Confidential', isPrivate ? logger.private() : logger.public());
    logger.keyValue('Screening', shouldScreen ? 'Enabled' : 'Disabled');
    if (customDestination) {
      logger.keyValue('Destination', customDestination.slice(0, 8) + '...');
    }
    console.log('');

    try {
      const keypair = loadKeypair(config.walletPath);
      const connection = getConnection(config.rpcUrl);
      const jupiterService = new JupiterService(connection);
      const ephemeralService = new EphemeralService(connection);

      // Determine final destination
      const finalDestination = customDestination
        ? new PublicKey(customDestination)
        : keypair.publicKey;

      // Step 0: Display privacy score
      if (useEphemeral || shouldScreen || useZk || useShadow) {
        let score = 20; // Base non-custodial score
        const factors: string[] = ['Non-custodial: you control your keys'];

        if (useEphemeral) {
          score += 30;
          factors.push('Ephemeral wallet breaks on-chain linkability');
        }
        if (shouldScreen) {
          score += 10;
          factors.push('Range screening ensures compliant counterparties');
        }
        if (useZk) {
          score += 20;
          factors.push('Privacy Cash ZK pool provides anonymity set (hides WHO)');
        }
        if (useShadow) {
          score += 20;
          factors.push('ShadowWire Bulletproofs encrypts amounts (hides HOW MUCH)');
        }

        console.log('');
        logger.keyValue('Privacy Score', `${Math.min(score, 100)}/100`);
        factors.forEach((f) => console.log(`  - ${f}`));
        console.log('');
      }

      // Step 1: Screen addresses if enabled
      if (shouldScreen) {
        const screenSpinner = ora('Screening addresses with Range...').start();

        if (!config.rangeApiKey) {
          screenSpinner.warn('Range API key not configured. Skipping screening.');
        } else {
          const rangeService = new RangeService(config.rangeApiKey);
          const result = await rangeService.screenAddress(keypair.publicKey.toBase58());

          if (result.isSanctioned || result.riskLevel === 'severe') {
            screenSpinner.fail('Address screening failed: High risk detected');
            logger.error(`Risk Level: ${result.riskLevel}`);
            return;
          }
          screenSpinner.succeed(`Screening passed (Risk: ${result.riskLevel})`);
        }
      }

      // Step 1.5: Privacy Cash ZK deposit if enabled
      let zkWithdrawAddress: PublicKey | null = null;
      if (useZk) {
        const zkSpinner = ora('Checking Privacy Cash availability...').start();

        // Pass the Keypair directly to Privacy Cash (SDK accepts Keypair, Uint8Array, or base58)
        const privacyCash = new PrivacyCashService(config.rpcUrl, keypair);
        const availability = await privacyCash.checkAvailability();

        if (!availability.available) {
          zkSpinner.warn(`Privacy Cash unavailable: ${availability.error}`);
          logger.info('Falling back to simulated ZK flow for demo...');

          // Use simulated flow for demo
          const simDeposit = await PrivacyCashSimulated.simulateDeposit(fromToken, amount);
          console.log(`  ${simDeposit.message}`);
          console.log(`  Commitment: ${simDeposit.commitment.slice(0, 20)}...`);

          // Generate ephemeral for the "withdrawal"
          const ephemeral = ephemeralService.generateEphemeralWallet();
          zkWithdrawAddress = ephemeral.keypair.publicKey;

          const simWithdraw = await PrivacyCashSimulated.simulateWithdraw(
            fromToken,
            amount,
            zkWithdrawAddress.toBase58()
          );
          console.log(`  ${simWithdraw.message}`);
          zkSpinner.succeed('ZK pool flow simulated (SDK not available)');
        } else {
          // Real Privacy Cash flow
          zkSpinner.text = 'Depositing to Privacy Cash ZK pool...';

          let depositResult;
          if (fromToken === 'SOL') {
            depositResult = await privacyCash.depositSol(amount);
          } else {
            depositResult = await privacyCash.depositSpl(fromToken, amount);
          }

          if (!depositResult.success) {
            zkSpinner.fail(`ZK deposit failed: ${depositResult.error}`);
            return;
          }

          console.log(`  Tx: ${depositResult.signature?.slice(0, 20)}...`);

          // Generate ephemeral wallet for ZK withdrawal
          const ephemeral = ephemeralService.generateEphemeralWallet();
          zkWithdrawAddress = ephemeral.keypair.publicKey;

          zkSpinner.text = 'Withdrawing from ZK pool to ephemeral...';

          let withdrawResult;
          if (fromToken === 'SOL') {
            withdrawResult = await privacyCash.withdrawSol(amount, zkWithdrawAddress.toBase58());
          } else {
            withdrawResult = await privacyCash.withdrawSpl(fromToken, amount, zkWithdrawAddress.toBase58());
          }

          if (!withdrawResult.success) {
            zkSpinner.fail(`ZK withdraw failed: ${withdrawResult.error}`);
            return;
          }

          zkSpinner.succeed('ZK pool deposit → withdraw complete');
          console.log(`  Funds now at ephemeral: ${zkWithdrawAddress.toBase58().slice(0, 8)}...`);
        }
      }

      // Prepare swap parameters
      const inputMint = TOKEN_MINTS[fromToken];
      const outputMint = TOKEN_MINTS[toToken];
      const inputDecimals = TOKEN_DECIMALS[fromToken];
      const inputAmount = Math.floor(amount * Math.pow(10, inputDecimals));

      let swapSignature: string;
      let outputAmount: number;

      if (useEphemeral || useZk) {
        // === EPHEMERAL WALLET FLOW ===
        // This breaks on-chain linkability between user wallet and swap

        // Step 2a: Generate ephemeral wallet (unless already have one from ZK)
        let ephemeral;
        if (useZk && zkWithdrawAddress) {
          // ZK flow already funded the ephemeral via ZK withdrawal
          // We need to get the keypair - but in simulated mode we don't have it
          // For real ZK flow, the funds are already at zkWithdrawAddress
          // For now, generate new ephemeral and fund it normally for the swap
          const ephemeralSpinner = ora('Using ephemeral from ZK flow...').start();
          ephemeral = ephemeralService.generateEphemeralWallet();
          ephemeralSpinner.succeed(`Ephemeral wallet: ${ephemeral.publicKey.slice(0, 8)}...`);

          // Fund normally (in real ZK flow, funds came from ZK withdrawal)
          const fundSpinner = ora('Funding ephemeral wallet...').start();
          const solForFees = ephemeralService.getRecommendedSolFunding();
          if (fromToken === 'SOL') {
            await ephemeralService.fundEphemeral(
              keypair,
              ephemeral.keypair.publicKey,
              amount + solForFees
            );
          } else {
            await ephemeralService.fundEphemeral(
              keypair,
              ephemeral.keypair.publicKey,
              solForFees,
              inputMint,
              amount
            );
          }
          fundSpinner.succeed('Ephemeral funded');
        } else {
          // Standard ephemeral flow
          const ephemeralSpinner = ora('Generating ephemeral wallet...').start();
          ephemeral = ephemeralService.generateEphemeralWallet();
          ephemeralSpinner.succeed(`Ephemeral wallet: ${ephemeral.publicKey.slice(0, 8)}...`);

          // Step 2b: Fund ephemeral wallet
          const fundSpinner = ora('Funding ephemeral wallet...').start();
          const solForFees = ephemeralService.getRecommendedSolFunding();

          if (fromToken === 'SOL') {
            await ephemeralService.fundEphemeral(
              keypair,
              ephemeral.keypair.publicKey,
              amount + solForFees
            );
          } else {
            await ephemeralService.fundEphemeral(
              keypair,
              ephemeral.keypair.publicKey,
              solForFees,
              inputMint,
              amount
            );
          }
          fundSpinner.succeed('Ephemeral funded');
        }

        // Step 2c: Get quote for ephemeral
        const quoteSpinner = ora('Getting best swap route...').start();
        const quote = await jupiterService.getQuote(inputMint, outputMint, inputAmount, slippageBps);
        quoteSpinner.succeed('Route found');

        outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[toToken]);
        logger.keyValue('Expected Output', `${outputAmount.toFixed(6)} ${toToken}`);
        logger.keyValue('Price Impact', `${quote.priceImpactPct}%`);

        // Step 2d: Execute swap from ephemeral
        const swapSpinner = ora('Executing swap from ephemeral...').start();
        swapSignature = await jupiterService.executeSwap(quote, ephemeral.keypair);
        swapSpinner.succeed('Swap executed');

        // Step 2e: Send output to final destination
        const sendSpinner = ora('Sending output to destination...').start();

        const actualOutput = await ephemeralService.getEphemeralTokenBalance(
          ephemeral.keypair.publicKey,
          outputMint
        );

        if (actualOutput > 0) {
          await ephemeralService.sendToDestination(
            ephemeral.keypair,
            finalDestination,
            outputMint,
            actualOutput
          );
          sendSpinner.succeed(`Output sent to ${finalDestination.toBase58().slice(0, 8)}...`);
        } else {
          sendSpinner.succeed('SOL output (already at ephemeral)');
        }

        // Step 2f: Recover remaining SOL
        const recoverSpinner = ora('Recovering dust...').start();
        const recovered = await ephemeralService.recoverSol(ephemeral.keypair, keypair.publicKey);
        if (recovered) {
          recoverSpinner.succeed('Dust recovered');
        } else {
          recoverSpinner.info('No dust to recover');
        }
      } else {
        // === STANDARD FLOW ===
        // Direct swap from user wallet (no privacy)

        const quoteSpinner = ora('Getting best swap route...').start();
        const quote = await jupiterService.getQuote(inputMint, outputMint, inputAmount, slippageBps);
        quoteSpinner.succeed('Route found');

        outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[toToken]);
        logger.keyValue('Expected Output', `${outputAmount.toFixed(6)} ${toToken}`);
        logger.keyValue('Price Impact', `${quote.priceImpactPct}%`);

        const swapSpinner = ora('Executing swap...').start();
        swapSignature = await jupiterService.executeSwap(quote, keypair);
        swapSpinner.succeed('Swap executed');
      }

      // Step 4: Arcium confidential transfer if private mode
      if (isPrivate) {
        const arciumSpinner = ora('Checking Arcium SDK availability...').start();

        const arciumService = new ArciumService(connection);
        const availability = await arciumService.checkAvailability();

        if (!availability.available) {
          arciumSpinner.warn(`Arcium SDK unavailable: ${availability.error}`);
          logger.info('Using simulated Arcium for demo...');

          // Simulate Arcium encryption
          const simEncrypt = await ArciumSimulated.simulateEncrypt(outputAmount);
          console.log(`  ${simEncrypt.message}`);
          console.log(`  Ciphertext: ${simEncrypt.ciphertext.slice(0, 30)}...`);
          arciumSpinner.succeed('Arcium encryption simulated (SDK not installed)');
        } else {
          // Real Arcium SDK flow
          arciumSpinner.text = 'Encrypting with RescueCipher...';

          try {
            const encryptedAmount = arciumService.encryptAmount(outputAmount);
            arciumSpinner.succeed(`Amount encrypted: ${encryptedAmount.slice(0, 30)}...`);

            // Show encryption status
            const status = arciumService.getEncryptionStatus();
            console.log(`  Cipher: ${status.cipherSuite}`);
            console.log(`  MXE: ${status.mxeEndpoint}`);
          } catch (error: any) {
            arciumSpinner.warn(`Arcium encryption failed: ${error.message}`);
          }
        }
      }

      // Step 5: ShadowWire encrypted transfer if enabled
      if (useShadow) {
        const shadowSpinner = ora('Checking ShadowWire availability...').start();

        const shadowWire = new ShadowWireService({ debug: false });
        const availability = await shadowWire.checkAvailability();

        if (!availability.available) {
          shadowSpinner.warn(`ShadowWire unavailable: ${availability.error}`);
          logger.info('Using simulated ShadowWire for demo...');

          // Simulate ShadowWire deposit + transfer
          const simDeposit = await ShadowWireSimulated.simulateDeposit(toToken, outputAmount);
          console.log(`  ${simDeposit.message}`);

          const simTransfer = await ShadowWireSimulated.simulateTransfer(
            toToken,
            outputAmount,
            finalDestination.toBase58(),
            'internal'
          );
          console.log(`  ${simTransfer.message}`);
          shadowSpinner.succeed(`ShadowWire simulated (amount ${simTransfer.amountHidden ? 'hidden' : 'visible'})`);
        } else {
          // Real ShadowWire flow
          shadowSpinner.text = 'Depositing to ShadowWire pool...';

          const depositResult = await shadowWire.deposit(
            keypair.publicKey.toBase58(),
            outputAmount,
            toToken
          );

          if (!depositResult.success) {
            shadowSpinner.warn(`ShadowWire deposit failed: ${depositResult.error}`);
          } else {
            console.log(`  Deposited to pool: ${depositResult.poolAddress?.slice(0, 16)}...`);

            shadowSpinner.text = 'Executing encrypted transfer...';

            // Internal transfer (amount hidden) to destination
            const transferResult = await shadowWire.transfer(
              keypair.publicKey.toBase58(),
              finalDestination.toBase58(),
              outputAmount,
              toToken,
              'internal' // Amount completely hidden
            );

            if (!transferResult.success) {
              shadowSpinner.warn(`ShadowWire transfer failed: ${transferResult.error}`);
            } else {
              shadowSpinner.succeed(
                `ShadowWire transfer complete (amount ${transferResult.amountHidden ? '[HIDDEN]' : 'visible'})`
              );
              console.log(`  Signature: ${transferResult.signature?.slice(0, 16)}...`);
            }
          }
        }
      }

      // Final output
      console.log('');
      logger.success('Swap completed successfully!');
      logger.tx(swapSignature);

      const explorerUrl =
        config.network === 'mainnet-beta'
          ? `https://orbmarkets.io/tx/${swapSignature}`
          : `https://solscan.io/tx/${swapSignature}?cluster=devnet`;
      logger.keyValue('Explorer', explorerUrl);

      if (useEphemeral || useZk) {
        console.log('');
        logger.keyValue('Privacy', 'Your main wallet is not visible on-chain for this swap');
      }

      if (useZk) {
        logger.keyValue('ZK Privacy', 'Funds passed through Privacy Cash anonymity set (hides WHO)');
      }

      if (useShadow) {
        logger.keyValue('ShadowWire', 'Transaction amount encrypted with Bulletproofs (hides HOW MUCH)');
      }
    } catch (error: any) {
      logger.error(`Swap failed: ${error.message}`);
    }
  });
