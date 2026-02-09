import { Command } from 'commander';
import { loadConfig, loadKeypair, getConnection } from '../utils/wallet';
import { logger } from '../utils/logger';
import { PrivacyCashService } from '../services/privacy-cash.service';
import { ShadowWireService } from '../services/shadowwire.service';
import { SchedulerService } from '../services/scheduler.service';
import {
  SwapExecutorService,
  SwapProgressEvent,
} from '../services/swap-executor.service';
import { DCASchedule, TOKEN_MINTS } from '../types/index';
import ora, { type Ora } from 'ora';
import { randomUUID } from 'crypto';

const schedulerService = new SchedulerService();

export const dcaCommand = new Command('dca')
  .description('Manage DCA (Dollar Cost Averaging) schedules');

// Schedule a new DCA
dcaCommand
  .command('schedule')
  .description('Create a new DCA schedule (private by default)')
  .requiredOption('--from <token>', 'Source token (SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA)')
  .requiredOption('--to <token>', 'Destination token (SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA)')
  .requiredOption('--amount <number>', 'Amount per execution')
  .requiredOption('--frequency <freq>', 'Frequency: hourly, daily, weekly, monthly')
  .option('--no-privacy', 'Disable ephemeral wallet privacy', false)
  .option('--zk', 'Use Privacy Cash ZK pool for maximum anonymity (requires Node 24+)', false)
  .option('--shadow', 'Use ShadowWire for encrypted amounts (Bulletproofs via Radr Labs)', false)
  .option('--private', 'Use Arcium confidential transfers for encrypted amounts', false)
  .option('--no-screen', 'Disable Range compliance screening', false)
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
      useEphemeral: options.privacy, // Privacy ON by default (disable with --no-privacy)
      useZk: options.zk,
      useShadow: options.shadow,
      screenAddresses: options.screen, // Screening ON by default (disable with --no-screen)
      slippageBps: parseInt(options.slippage),
      totalExecutions: options.executions ? parseInt(options.executions) : undefined,
      executedCount: 0,
      createdAt: new Date().toISOString(),
      active: true,
    };

    logger.header('Create DCA Schedule', 'Set up automated dollar-cost averaging with privacy');

    // Display configuration panel
    logger.configPanel('Schedule Configuration', [
      { label: 'ID', value: schedule.id.slice(0, 8) },
      { label: 'Swap Amount', value: `${amount} ${fromToken}` },
      { label: 'Buy Asset', value: toToken },
      { label: 'Frequency', value: frequency.toUpperCase() },
      { label: 'Ephemeral Wallet', value: options.privacy, badge: options.privacy ? 'PRIVATE' : 'PUBLIC' },
      { label: 'ZK Privacy', value: options.zk, badge: options.zk ? 'MAXIMUM' : undefined },
      { label: 'ShadowWire', value: options.shadow, badge: options.shadow ? 'ENCRYPTED' : undefined },
      { label: 'Arcium Confidential', value: options.private, badge: options.private ? 'ENCRYPTED' : undefined },
      { label: 'Address Screening', value: options.screen },
      { label: 'Total Executions', value: schedule.totalExecutions?.toString() || 'Unlimited' },
    ]);

    // Save the schedule to disk (CLI exits after; a daemon would run cron)
    const schedules = schedulerService.loadSchedules();
    schedules.push(schedule);
    schedulerService.saveSchedulesToFile(schedules);

    logger.alertBox('DCA schedule created successfully! \u{1F389}', 'success');

    const freqMap: Record<string, string> = {
      hourly: '1 hour', daily: 'tomorrow at 9:00 AM',
      weekly: 'next Monday at 9:00 AM', monthly: '1st of next month at 9:00 AM',
    };
    logger.newline();
    logger.keyValue('Next Execution', freqMap[schedule.frequency] || schedule.frequency, 'green');

    if (options.privacy) {
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

    logger.header('DCA Schedules', 'All active and paused schedules');

    // Build table rows
    const rows = schedules.map((schedule) => {
      const status = schedule.active ? '\uD83D\uDFE2 Active' : '\uD83D\uDD34 Paused';
      const privacyMode = schedule.useZk ? '\uD83D\uDEE1\uFE0F ZK' : (schedule.useShadow ? '\uD83D\uDD10 Shadow' : (schedule.useEphemeral ? '\uD83D\uDD12 Eph' : ''));
      const swap = `${schedule.amountPerExecution} ${schedule.fromToken}\u2192${schedule.toToken}`;
      const executions = schedulerService.getExecutions(schedule.id).length;
      const totalExec = schedule.totalExecutions ? `${executions}/${schedule.totalExecutions}` : `${executions}`;
      const nextExec = schedulerService.getNextExecution(schedule.id);
      const nextTime = nextExec ? nextExec.toLocaleDateString() : 'N/A';

      return [
        status,
        schedule.id.slice(0, 6),
        swap,
        schedule.frequency,
        privacyMode,
        totalExec,
        nextTime,
      ];
    });

    logger.table(
      ['Status', 'ID', 'Swap', 'Freq', 'Privacy', 'Exec', 'Next'],
      rows,
      { colWidths: [10, 8, 20, 8, 10, 10, 14] }
    );

    if (schedules.length > 0) {
      logger.info(`Total: ${schedules.length} schedule${schedules.length !== 1 ? 's' : ''}`);
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

    logger.header('Execution History', 'Last 10 DCA executions');

    // Build execution rows
    const rows = executions.slice(-10).reverse().map((exec) => {
      const status = exec.success ? '\u2705 Success' : '\u274C Failed';
      const schedule = schedules.find((s) => s.id === exec.scheduleId);
      const swapInfo = schedule ? `${schedule.fromToken}\u2192${schedule.toToken}` : '?';
      const time = new Date(exec.executedAt).toLocaleTimeString();
      const txShort = exec.signature ? exec.signature.slice(0, 8) + '...' : '\u2014';

      return [status, time, swapInfo, exec.scheduleId.slice(0, 6), txShort];
    });

    logger.table(
      ['Status', 'Time', 'Swap', 'Schedule', 'Tx'],
      rows,
      { colWidths: [12, 14, 12, 8, 14] }
    );

    logger.info(`${executions.length} total execution${executions.length !== 1 ? 's' : ''}`);

    // Show recent errors if any
    const errors = executions.filter(e => e.error);
    if (errors.length > 0) {
      logger.newline();
      logger.alert(`\u26A0\uFE0F ${errors.length} recent error${errors.length !== 1 ? 's' : ''}`, 'warning');
      errors.slice(-3).forEach(err => {
        if (err.error) {
          logger.keyValue('Error', err.error.slice(0, 50), 'yellow');
        }
      });
    }
  });

/**
 * Execute a single DCA swap using the shared SwapExecutorService.
 *
 * BUG FIX: Previously this function both logged AND re-threw errors,
 * but the caller (the `execute` command action) did not catch.
 * Now errors are only logged here; no re-throw.
 */
async function executeDCA(schedule: DCASchedule, config: any): Promise<void> {
  logger.header(`Execute DCA Swap`, `${schedule.fromToken} \u2192 ${schedule.toToken}`);

  // Show execution plan
  const privacyFeatures: string[] = [];
  if (schedule.useZk) privacyFeatures.push('Privacy Cash ZK Pool');
  if (schedule.useEphemeral) privacyFeatures.push('Ephemeral Wallet');
  if (schedule.useShadow) privacyFeatures.push('ShadowWire');
  if (schedule.isPrivate) privacyFeatures.push('Arcium Confidential');
  if (schedule.screenAddresses) privacyFeatures.push('Address Screening');

  logger.summary('Execution Plan', [
    { label: 'Amount', value: `${schedule.amountPerExecution} ${schedule.fromToken}`, color: 'green' },
    { label: 'Target', value: schedule.toToken, color: 'cyan' },
    { label: 'Privacy Features', value: privacyFeatures.length > 0 ? privacyFeatures.join(' + ') : 'None', color: privacyFeatures.length > 0 ? 'green' : 'yellow' },
    { label: 'Slippage', value: `${schedule.slippageBps} bps`, color: 'cyan' },
  ]);

  logger.newline();

  try {
    const keypair = loadKeypair(config.walletPath);
    const connection = getConnection(config.rpcUrl);
    const executor = new SwapExecutorService(connection);

    // Manage ora spinners driven by progress callbacks
    let currentSpinner: Ora | null = null;

    const result = await executor.execute(
      keypair,
      {
        fromToken: schedule.fromToken,
        toToken: schedule.toToken,
        amount: schedule.amountPerExecution,
        slippageBps: schedule.slippageBps,
        useEphemeral: schedule.useEphemeral ?? false,
        useZk: schedule.useZk ?? false,
        useShadow: schedule.useShadow ?? false,
        isPrivate: schedule.isPrivate,
        shouldScreen: schedule.screenAddresses,
        rangeApiKey: config.rangeApiKey,
      },
      (event: SwapProgressEvent) => {
        if (event.status === 'start') {
          if (currentSpinner) currentSpinner.stop();
          currentSpinner = ora(event.message).start();
        } else if (event.status === 'success') {
          if (currentSpinner) {
            currentSpinner.succeed(event.message);
            currentSpinner = null;
          }
        } else if (event.status === 'warn') {
          if (currentSpinner) {
            currentSpinner.warn(event.message);
            currentSpinner = null;
          }
        } else if (event.status === 'fail') {
          if (currentSpinner) {
            currentSpinner.fail(event.message);
            currentSpinner = null;
          }
        } else if (event.status === 'info') {
          if (event.detail) {
            console.log(`  ${event.detail}`);
          } else {
            console.log(`  ${event.message}`);
          }
        }

        // Print output info when quote succeeds
        if (event.phase === 'quote' && event.status === 'success' && event.detail) {
          const parts = event.detail.split(' | ');
          if (parts.length >= 1) {
            logger.keyValue('Output', parts[0].replace('Expected: ', ''));
          }
        }
      },
    );

    logger.newline();
    logger.alert('DCA execution complete! \uD83C\uDF89', 'success');

    // Build summary items
    const summaryItems = [
      { label: 'Transaction', value: (result.signature ?? '').slice(0, 16) + '...', color: 'cyan' as const },
      { label: 'Output', value: `${(result.outputAmount ?? 0).toFixed(6)} ${schedule.toToken}`, color: 'green' as const },
    ];

    if (schedule.useZk) {
      summaryItems.push({ label: 'ZK Privacy', value: 'Funds through Privacy Cash anonymity set', color: 'green' as const });
    }
    if (schedule.useEphemeral) {
      summaryItems.push({ label: 'Ephemeral', value: 'Main wallet hidden on-chain', color: 'green' as const });
    }
    if (schedule.useShadow) {
      summaryItems.push({ label: 'ShadowWire', value: 'Amount encrypted with Bulletproofs', color: 'green' as const });
    }

    logger.summary('Execution Result', summaryItems);
  } catch (error: any) {
    // BUG FIX: Only log the error, do NOT re-throw.
    // The caller (CLI action) does not catch, so re-throwing caused unhandled rejections.
    logger.error(`DCA execution failed: ${error.message}`);
  }
}
