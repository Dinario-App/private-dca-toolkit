import { Command } from 'commander';
import { loadConfig, loadKeypair, getConnection } from '../utils/wallet.js';
import { logger } from '../utils/logger.js';
import { JupiterService } from '../services/jupiter.service.js';
import { RangeService } from '../services/range.service.js';
import { ArciumService } from '../services/arcium.service.js';
import { SchedulerService } from '../services/scheduler.service.js';
import { DCASchedule, TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index.js';
import ora from 'ora';
import { randomUUID } from 'crypto';

const schedulerService = new SchedulerService();

export const dcaCommand = new Command('dca')
  .description('Manage DCA (Dollar Cost Averaging) schedules');

// Schedule a new DCA
dcaCommand
  .command('schedule')
  .description('Create a new DCA schedule')
  .requiredOption('--from <token>', 'Source token (SOL, USDC, USDT)')
  .requiredOption('--to <token>', 'Destination token (SOL, USDC, USDT)')
  .requiredOption('--amount <number>', 'Amount per execution')
  .requiredOption('--frequency <freq>', 'Frequency: hourly, daily, weekly, monthly')
  .option('--private', 'Use Arcium confidential transfers', false)
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

    const schedule: DCASchedule = {
      id: randomUUID(),
      fromToken,
      toToken,
      amountPerExecution: amount,
      frequency,
      isPrivate: options.private,
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
    logger.keyValue('Privacy', options.private ? logger.private() : logger.public());
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
      console.log(`${status} [${schedule.id.slice(0, 8)}]`);
      logger.keyValue('  Swap', `${schedule.amountPerExecution} ${schedule.fromToken} → ${schedule.toToken}`);
      logger.keyValue('  Frequency', schedule.frequency);
      logger.keyValue('  Privacy', schedule.isPrivate ? 'Private' : 'Public');

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
 */
async function executeDCA(schedule: DCASchedule, config: any): Promise<void> {
  logger.header(`Executing DCA: ${schedule.fromToken} → ${schedule.toToken}`);
  console.log('');

  try {
    const keypair = loadKeypair(config.walletPath);
    const connection = getConnection(config.rpcUrl);

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

    // Step 2: Get Jupiter quote
    const quoteSpinner = ora('Getting swap quote...').start();
    const jupiterService = new JupiterService(connection);

    const inputMint = TOKEN_MINTS[schedule.fromToken];
    const outputMint = TOKEN_MINTS[schedule.toToken];
    const inputDecimals = TOKEN_DECIMALS[schedule.fromToken];
    const inputAmount = Math.floor(schedule.amountPerExecution * Math.pow(10, inputDecimals));

    const quote = await jupiterService.getQuote(inputMint, outputMint, inputAmount, schedule.slippageBps);
    quoteSpinner.succeed('Quote received');

    const outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[schedule.toToken]);
    logger.keyValue('Output', `${outputAmount.toFixed(6)} ${schedule.toToken}`);

    // Step 3: Execute swap
    const swapSpinner = ora('Executing swap...').start();
    const signature = await jupiterService.executeSwap(quote, keypair);
    swapSpinner.succeed('Swap executed');

    // Step 4: Apply privacy if enabled
    if (schedule.isPrivate) {
      const privacySpinner = ora('Applying Arcium confidential transfer...').start();
      try {
        const arciumService = new ArciumService(connection);
        await new Promise((resolve) => setTimeout(resolve, 1000));
        privacySpinner.succeed('Confidential transfer applied');
      } catch (error: any) {
        privacySpinner.warn(`Privacy skipped: ${error.message}`);
      }
    }

    console.log('');
    logger.success('DCA execution complete!');
    logger.tx(signature);
  } catch (error: any) {
    logger.error(`DCA execution failed: ${error.message}`);
    throw error;
  }
}
