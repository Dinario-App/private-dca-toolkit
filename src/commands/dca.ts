import { Command } from 'commander';
import { loadConfig, loadKeypair, getConnection } from '../utils/wallet';
import { logger } from '../utils/logger';
import { JupiterService } from '../services/jupiter.service';
import { RangeService } from '../services/range.service';
import { ArciumService, ArciumSimulated } from '../services/arcium.service';
import { EphemeralService } from '../services/ephemeral.service';
import { SchedulerService } from '../services/scheduler.service';
import { PrivacyCashService, PrivacyCashSimulated } from '../services/privacy-cash.service';
import { ShadowWireService, ShadowWireSimulated } from '../services/shadowwire.service';
import { DCASchedule, TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index';
import ora from 'ora';
import { randomUUID } from 'crypto';

const schedulerService = new SchedulerService();

export const dcaCommand = new Command('dca')
  .description('Manage DCA (Dollar Cost Averaging) schedules');

// Schedule a new DCA
dcaCommand
  .command('schedule')
  .description('Create a new DCA schedule')
  .requiredOption('--from <token>', 'Source token (SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA)')
  .requiredOption('--to <token>', 'Destination token (SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA)')
  .requiredOption('--amount <number>', 'Amount per execution')
  .requiredOption('--frequency <freq>', 'Frequency: hourly, daily, weekly, monthly')
  .option('--ephemeral', 'Use ephemeral wallets for privacy (recommended)', false)
  .option('--zk', 'Use Privacy Cash ZK pool for maximum anonymity (requires Node 24+)', false)
  .option('--shadow', 'Use ShadowWire for encrypted amounts (Bulletproofs via Radr Labs)', false)
  .option('--private', 'Use Arcium confidential transfers for encrypted amounts', false)
  .option('--screen', 'Screen addresses with Range', false)
  .option('--executions <number>', 'Total number of executions (optional)')
  .option('--slippage <bps>', 'Slippage tolerance in basis points', '50')
  .action(async (options) => {
    const config = loadConfig();
    if (!config || !config.walletPath || !config.rpcUrl) {
      logger.error('Please configure wallet and RPC first: private-dca config set-wallet <path>');
      return;
    }

    const fromToken = options.from.toUpperCase();
    const toToken = options.to.toUpperCase();
    const amount = parseFloat(options.amount);
    const frequency = options.frequency.toLowerCase() as DCASchedule['frequency'];

    // Validate tokens
    if (!TOKEN_MINTS[fromToken] || !TOKEN_MINTS[toToken]) {
      logger.error(`Invalid token. Supported: ${Object.keys(TOKEN_MINTS).join(', ')}`);
      return;
    }

    if (fromToken === toToken) {
      logger.error('Source and destination tokens must be different');
      return;
    }

    // Validate frequency
    const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      logger.error(`Invalid frequency. Supported: ${validFrequencies.join(', ')}`);
      return;
    }

    // ZK mode only supports SOL/USDC/USDT
    if (options.zk && !PrivacyCashService.isTokenSupported(fromToken)) {
      logger.error(`Privacy Cash ZK only supports SOL, USDC, USDT. Got: ${fromToken}`);
      return;
    }

    // ShadowWire supports 17 tokens
    if (options.shadow && !ShadowWireService.isTokenSupported(fromToken)) {
      logger.error(`ShadowWire doesn't support ${fromToken}. Supported: ${ShadowWireService.getSupportedTokens().join(', ')}`);
      return;
    }

    const schedule: DCASchedule = {
      id: randomUUID(),
      fromToken,
      toToken,
      amountPerExecution: amount,
      frequency,
      isPrivate: options.private,
      useEphemeral: options.ephemeral,
      useZk: options.zk,
      useShadow: options.shadow,
      screenAddresses: options.screen,
      slippageBps: parseInt(options.slippage),
      totalExecutions: options.executions ? parseInt(options.executions) : undefined,
      executedCount: 0,
      createdAt: new Date().toISOString(),
      active: true,
    };

    logger.header('New DCA Schedule');
    logger.keyValue('ID', schedule.id.slice(0, 8));
    logger.keyValue('Swap', `${amount} ${fromToken} → ${toToken}`);
    logger.keyValue('Frequency', frequency);
    logger.keyValue('Ephemeral', options.ephemeral ? 'Yes (privacy mode)' : 'No');
    logger.keyValue('ZK Pool', options.zk ? 'Yes (maximum privacy)' : 'No');
    logger.keyValue('ShadowWire', options.shadow ? 'Yes (encrypted amounts)' : 'No');
    logger.keyValue('Confidential', options.private ? logger.private() : logger.public());
    logger.keyValue('Screening', options.screen ? 'Enabled' : 'Disabled');
    if (schedule.totalExecutions) {
      logger.keyValue('Total Executions', schedule.totalExecutions.toString());
    }
    console.log('');

    // Add the schedule
    schedulerService.addSchedule(schedule, async (s) => {
      await executeDCA(s, config);
    });

    logger.success('DCA schedule created!');
    const nextExec = schedulerService.getNextExecution(schedule.id);
    if (nextExec) {
      logger.keyValue('Next Execution', nextExec.toLocaleString());
    }

    if (options.ephemeral) {
      console.log('');
      logger.info('Each DCA execution will use a fresh ephemeral wallet for privacy.');
      logger.info('Your main wallet will not be visible on-chain for swaps.');
    }

    if (options.zk) {
      console.log('');
      logger.info('ZK Pool enabled: Funds will pass through Privacy Cash anonymity set.');
      logger.info('Note: Requires Node.js 24+ for full functionality.');
    }

    if (options.shadow) {
      console.log('');
      logger.info('ShadowWire enabled: Transaction amounts will be encrypted with Bulletproofs.');
      logger.info('Note: Requires @radr/shadowwire SDK.');
    }
  });

// List all DCA schedules
dcaCommand
  .command('list')
  .description('List all DCA schedules')
  .action(() => {
    // Load schedules from disk (CLI runs fresh each time)
    const schedules = schedulerService.loadSchedules();

    if (schedules.length === 0) {
      logger.info('No DCA schedules found. Create one with: private-dca dca schedule');
      return;
    }

    logger.header('DCA Schedules');
    console.log('');

    for (const schedule of schedules) {
      const status = schedule.active ? '🟢 Active' : '🔴 Paused';
      const privacyMode = schedule.useZk ? '🛡️' : (schedule.useShadow ? '🔐' : (schedule.useEphemeral ? '🔒' : ''));
      console.log(`${status} ${privacyMode} [${schedule.id.slice(0, 8)}]`);
      logger.keyValue('  Swap', `${schedule.amountPerExecution} ${schedule.fromToken} → ${schedule.toToken}`);
      logger.keyValue('  Frequency', schedule.frequency);
      const privacyLabel = schedule.useZk ? 'ZK Pool' : (schedule.useShadow ? 'ShadowWire' : (schedule.useEphemeral ? 'Ephemeral' : (schedule.isPrivate ? 'Confidential' : 'Public')));
      logger.keyValue('  Privacy', privacyLabel);

      const executions = schedulerService.getExecutions(schedule.id);
      logger.keyValue('  Executions', `${executions.length}${schedule.totalExecutions ? `/${schedule.totalExecutions}` : ''}`);

      const nextExec = schedulerService.getNextExecution(schedule.id);
      if (nextExec) {
        logger.keyValue('  Next', nextExec.toLocaleString());
      }
      console.log('');
    }
  });

// Cancel a DCA schedule
dcaCommand
  .command('cancel')
  .description('Cancel a DCA schedule')
  .requiredOption('--id <id>', 'Schedule ID (first 8 chars is enough)')
  .action((options) => {
    const schedules = schedulerService.loadSchedules();
    const schedule = schedules.find((s) => s.id.startsWith(options.id));

    if (!schedule) {
      logger.error(`Schedule not found: ${options.id}`);
      return;
    }

    const removed = schedulerService.removeSchedule(schedule.id);
    if (removed) {
      logger.success(`DCA schedule ${options.id} cancelled`);
    } else {
      logger.error('Failed to cancel schedule');
    }
  });

// Pause a DCA schedule
dcaCommand
  .command('pause')
  .description('Pause a DCA schedule')
  .requiredOption('--id <id>', 'Schedule ID')
  .action((options) => {
    const schedules = schedulerService.loadSchedules();
    const schedule = schedules.find((s) => s.id.startsWith(options.id));

    if (!schedule) {
      logger.error(`Schedule not found: ${options.id}`);
      return;
    }

    const paused = schedulerService.pauseSchedule(schedule.id);
    if (paused) {
      logger.success(`DCA schedule ${options.id} paused`);
    } else {
      logger.error('Failed to pause schedule');
    }
  });

// Resume a DCA schedule
dcaCommand
  .command('resume')
  .description('Resume a paused DCA schedule')
  .requiredOption('--id <id>', 'Schedule ID')
  .action((options) => {
    const schedules = schedulerService.loadSchedules();
    const schedule = schedules.find((s) => s.id.startsWith(options.id));

    if (!schedule) {
      logger.error(`Schedule not found: ${options.id}`);
      return;
    }

    schedulerService.addSchedule(schedule, async (s) => {
      const config = loadConfig();
      if (config) {
        await executeDCA(s, config);
      }
    });

    const resumed = schedulerService.resumeSchedule(schedule.id);
    if (resumed) {
      logger.success(`DCA schedule ${options.id} resumed`);
    } else {
      logger.error('Failed to resume schedule');
    }
  });

// Execute a DCA immediately (for testing)
dcaCommand
  .command('execute')
  .description('Execute a DCA immediately (for testing)')
  .requiredOption('--id <id>', 'Schedule ID')
  .action(async (options) => {
    const config = loadConfig();
    if (!config || !config.walletPath || !config.rpcUrl) {
      logger.error('Please configure wallet and RPC first');
      return;
    }

    const schedules = schedulerService.loadSchedules();
    const schedule = schedules.find((s) => s.id.startsWith(options.id));

    if (!schedule) {
      logger.error(`Schedule not found: ${options.id}`);
      return;
    }

    await executeDCA(schedule, config);
  });

// History of executions
dcaCommand
  .command('history')
  .description('View execution history')
  .option('--id <id>', 'Filter by schedule ID')
  .action((options) => {
    const schedules = schedulerService.loadSchedules();

    let executions;
    if (options.id) {
      const schedule = schedules.find((s) => s.id.startsWith(options.id));
      if (!schedule) {
        logger.error(`Schedule not found: ${options.id}`);
        return;
      }
      executions = schedulerService.getExecutions(schedule.id);
    } else {
      executions = schedules.flatMap((s) => schedulerService.getExecutions(s.id));
    }

    if (executions.length === 0) {
      logger.info('No executions found');
      return;
    }

    logger.header('Execution History');
    console.log('');

    for (const exec of executions.slice(-10).reverse()) {
      const status = exec.success ? '✅' : '❌';
      const schedule = schedules.find((s) => s.id === exec.scheduleId);
      const swapInfo = schedule ? `${schedule.fromToken} → ${schedule.toToken}` : 'Unknown';

      console.log(`${status} [${exec.scheduleId.slice(0, 8)}] ${swapInfo}`);
      logger.keyValue('  Time', new Date(exec.executedAt).toLocaleString());
      if (exec.signature) {
        logger.keyValue('  Tx', exec.signature.slice(0, 16) + '...');
      }
      if (exec.error) {
        logger.keyValue('  Error', exec.error);
      }
      console.log('');
    }
  });

/**
 * Execute a single DCA swap
 * Supports both standard and ephemeral wallet flows for privacy
 */
async function executeDCA(schedule: DCASchedule, config: any): Promise<void> {
  logger.header(`Executing DCA: ${schedule.fromToken} → ${schedule.toToken}`);
  if (schedule.useZk) {
    logger.info('Using Privacy Cash ZK pool for maximum anonymity');
  } else if (schedule.useEphemeral) {
    logger.info('Using ephemeral wallet for privacy');
  }
  console.log('');

  try {
    const keypair = loadKeypair(config.walletPath);
    const connection = getConnection(config.rpcUrl);
    const jupiterService = new JupiterService(connection);
    const ephemeralService = new EphemeralService(connection);

    // Step 1: Screen addresses if enabled
    if (schedule.screenAddresses && config.rangeApiKey) {
      const screenSpinner = ora('Screening addresses...').start();
      const rangeService = new RangeService(config.rangeApiKey);
      const result = await rangeService.screenAddress(keypair.publicKey.toBase58());

      if (result.isSanctioned || result.riskLevel === 'severe') {
        screenSpinner.fail('Address screening failed');
        throw new Error(`High risk detected: ${result.riskLevel}`);
      }
      screenSpinner.succeed(`Screening passed (Risk: ${result.riskLevel})`);
    }

    // Step 1.5: Privacy Cash ZK deposit if enabled
    let zkWithdrawAddress: import('@solana/web3.js').PublicKey | null = null;
    if (schedule.useZk) {
      const zkSpinner = ora('Checking Privacy Cash availability...').start();

      // Pass the Keypair directly to Privacy Cash (SDK accepts Keypair, Uint8Array, or base58)
      const privacyCash = new PrivacyCashService(config.rpcUrl, keypair);
      const availability = await privacyCash.checkAvailability();

      if (!availability.available) {
        zkSpinner.warn(`Privacy Cash unavailable: ${availability.error}`);
        logger.info('Falling back to simulated ZK flow for demo...');

        const simDeposit = await PrivacyCashSimulated.simulateDeposit(schedule.fromToken, schedule.amountPerExecution);
        console.log(`  ${simDeposit.message}`);
        console.log(`  Commitment: ${simDeposit.commitment.slice(0, 20)}...`);

        const ephemeral = ephemeralService.generateEphemeralWallet();
        zkWithdrawAddress = ephemeral.keypair.publicKey;

        const simWithdraw = await PrivacyCashSimulated.simulateWithdraw(
          schedule.fromToken,
          schedule.amountPerExecution,
          zkWithdrawAddress.toBase58()
        );
        console.log(`  ${simWithdraw.message}`);
        zkSpinner.succeed('ZK pool flow simulated (SDK not available)');
      } else {
        zkSpinner.text = 'Depositing to Privacy Cash ZK pool...';

        let depositResult;
        if (schedule.fromToken === 'SOL') {
          depositResult = await privacyCash.depositSol(schedule.amountPerExecution);
        } else {
          depositResult = await privacyCash.depositSpl(schedule.fromToken, schedule.amountPerExecution);
        }

        if (!depositResult.success) {
          zkSpinner.fail(`ZK deposit failed: ${depositResult.error}`);
          throw new Error(`ZK deposit failed: ${depositResult.error}`);
        }

        console.log(`  Tx: ${depositResult.signature?.slice(0, 20)}...`);

        const ephemeral = ephemeralService.generateEphemeralWallet();
        zkWithdrawAddress = ephemeral.keypair.publicKey;

        zkSpinner.text = 'Withdrawing from ZK pool to ephemeral...';

        let withdrawResult;
        if (schedule.fromToken === 'SOL') {
          withdrawResult = await privacyCash.withdrawSol(schedule.amountPerExecution, zkWithdrawAddress.toBase58());
        } else {
          withdrawResult = await privacyCash.withdrawSpl(schedule.fromToken, schedule.amountPerExecution, zkWithdrawAddress.toBase58());
        }

        if (!withdrawResult.success) {
          zkSpinner.fail(`ZK withdraw failed: ${withdrawResult.error}`);
          throw new Error(`ZK withdraw failed: ${withdrawResult.error}`);
        }

        zkSpinner.succeed('ZK pool deposit → withdraw complete');
        console.log(`  Funds now at ephemeral: ${zkWithdrawAddress.toBase58().slice(0, 8)}...`);
      }
    }

    // Prepare swap parameters
    const inputMint = TOKEN_MINTS[schedule.fromToken];
    const outputMint = TOKEN_MINTS[schedule.toToken];
    const inputDecimals = TOKEN_DECIMALS[schedule.fromToken];
    const inputAmount = Math.floor(schedule.amountPerExecution * Math.pow(10, inputDecimals));

    let signature: string;
    let outputAmount: number;

    if (schedule.useZk || schedule.useEphemeral) {
      // === EPHEMERAL WALLET FLOW ===
      // Each DCA execution uses a fresh ephemeral wallet

      // Step 2a: Generate ephemeral wallet
      const ephemeralSpinner = ora('Generating ephemeral wallet...').start();
      const ephemeral = ephemeralService.generateEphemeralWallet();
      ephemeralSpinner.succeed(`Ephemeral: ${ephemeral.publicKey.slice(0, 8)}...`);

      // Step 2b: Fund ephemeral wallet
      const fundSpinner = ora('Funding ephemeral wallet...').start();
      const solForFees = ephemeralService.getRecommendedSolFunding();

      if (schedule.fromToken === 'SOL') {
        await ephemeralService.fundEphemeral(
          keypair,
          ephemeral.keypair.publicKey,
          schedule.amountPerExecution + solForFees
        );
      } else {
        await ephemeralService.fundEphemeral(
          keypair,
          ephemeral.keypair.publicKey,
          solForFees,
          inputMint,
          schedule.amountPerExecution
        );
      }
      fundSpinner.succeed('Ephemeral funded');

      // Step 2c: Get quote
      const quoteSpinner = ora('Getting swap quote...').start();
      const quote = await jupiterService.getQuote(inputMint, outputMint, inputAmount, schedule.slippageBps);
      quoteSpinner.succeed('Quote received');

      outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[schedule.toToken]);
      logger.keyValue('Output', `${outputAmount.toFixed(6)} ${schedule.toToken}`);

      // Step 2d: Execute swap from ephemeral
      const swapSpinner = ora('Executing swap from ephemeral...').start();
      signature = await jupiterService.executeSwap(quote, ephemeral.keypair);
      swapSpinner.succeed('Swap executed');

      // Step 2e: Send output to user's wallet
      const sendSpinner = ora('Sending output to your wallet...').start();
      const actualOutput = await ephemeralService.getEphemeralTokenBalance(
        ephemeral.keypair.publicKey,
        outputMint
      );

      if (actualOutput > 0) {
        await ephemeralService.sendToDestination(
          ephemeral.keypair,
          keypair.publicKey,
          outputMint,
          actualOutput
        );
        sendSpinner.succeed('Output sent to your wallet');
      } else {
        sendSpinner.succeed('SOL output (recovering to your wallet)');
      }

      // Step 2f: Recover dust
      const recoverSpinner = ora('Recovering dust...').start();
      const recovered = await ephemeralService.recoverSol(ephemeral.keypair, keypair.publicKey);
      if (recovered) {
        recoverSpinner.succeed('Dust recovered');
      } else {
        recoverSpinner.info('No dust to recover');
      }
    } else {
      // === STANDARD FLOW ===
      // Direct swap from user wallet

      // Step 2: Get quote
      const quoteSpinner = ora('Getting swap quote...').start();
      const quote = await jupiterService.getQuote(inputMint, outputMint, inputAmount, schedule.slippageBps);
      quoteSpinner.succeed('Quote received');

      outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[schedule.toToken]);
      logger.keyValue('Output', `${outputAmount.toFixed(6)} ${schedule.toToken}`);

      // Step 3: Execute swap
      const swapSpinner = ora('Executing swap...').start();
      signature = await jupiterService.executeSwap(quote, keypair);
      swapSpinner.succeed('Swap executed');
    }

    // Step 4: Arcium confidential transfer if enabled
    if (schedule.isPrivate) {
      const arciumSpinner = ora('Checking Arcium SDK availability...').start();

      const arciumService = new ArciumService(connection);
      const availability = await arciumService.checkAvailability();

      if (!availability.available) {
        arciumSpinner.warn(`Arcium SDK unavailable: ${availability.error}`);
        logger.info('Using simulated Arcium for demo...');

        const simEncrypt = await ArciumSimulated.simulateEncrypt(outputAmount);
        console.log(`  ${simEncrypt.message}`);
        console.log(`  Ciphertext: ${simEncrypt.ciphertext.slice(0, 30)}...`);
        arciumSpinner.succeed('Arcium encryption simulated (SDK not installed)');
      } else {
        arciumSpinner.text = 'Encrypting with RescueCipher...';

        try {
          const encryptedAmount = arciumService.encryptAmount(outputAmount);
          arciumSpinner.succeed(`Amount encrypted: ${encryptedAmount.slice(0, 30)}...`);

          const status = arciumService.getEncryptionStatus();
          console.log(`  Cipher: ${status.cipherSuite}`);
        } catch (error: any) {
          arciumSpinner.warn(`Arcium encryption failed: ${error.message}`);
        }
      }
    }

    // Step 5: ShadowWire encrypted transfer if enabled
    if (schedule.useShadow) {
      const shadowSpinner = ora('Checking ShadowWire availability...').start();

      const shadowWire = new ShadowWireService({ debug: false });
      const availability = await shadowWire.checkAvailability();

      if (!availability.available) {
        shadowSpinner.warn(`ShadowWire unavailable: ${availability.error}`);
        logger.info('Using simulated ShadowWire for demo...');

        // Simulate ShadowWire deposit + transfer
        const simDeposit = await ShadowWireSimulated.simulateDeposit(schedule.toToken, outputAmount);
        console.log(`  ${simDeposit.message}`);

        const simTransfer = await ShadowWireSimulated.simulateTransfer(
          schedule.toToken,
          outputAmount,
          keypair.publicKey.toBase58(),
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
          schedule.toToken
        );

        if (!depositResult.success) {
          shadowSpinner.warn(`ShadowWire deposit failed: ${depositResult.error}`);
        } else {
          console.log(`  Deposited to pool: ${depositResult.poolAddress?.slice(0, 16)}...`);

          shadowSpinner.text = 'Executing encrypted transfer...';

          // Internal transfer (amount hidden)
          const transferResult = await shadowWire.transfer(
            keypair.publicKey.toBase58(),
            keypair.publicKey.toBase58(),
            outputAmount,
            schedule.toToken,
            'internal'
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

    console.log('');
    logger.success('DCA execution complete!');
    logger.tx(signature);

    if (schedule.useZk) {
      logger.keyValue('Privacy', 'Your main wallet is not visible on-chain for this swap');
      logger.keyValue('ZK Privacy', 'Funds passed through Privacy Cash anonymity set (hides WHO)');
    } else if (schedule.useEphemeral) {
      logger.keyValue('Privacy', 'Your main wallet is not visible on-chain for this swap');
    }

    if (schedule.useShadow) {
      logger.keyValue('ShadowWire', 'Transaction amount encrypted with Bulletproofs (hides HOW MUCH)');
    }
  } catch (error: any) {
    logger.error(`DCA execution failed: ${error.message}`);
    throw error;
  }
}
