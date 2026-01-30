/**
 * Private DCA SDK
 * TypeScript library for programmatic management of private DCA schedules
 */

import { EventEmitter } from 'events';
import { loadConfig, loadKeypair, getConnection } from '../utils/wallet';
import { SchedulerService } from '../services/scheduler.service';
import { JupiterService } from '../services/jupiter.service';
import { EphemeralService } from '../services/ephemeral.service';
import { ArciumService } from '../services/arcium.service';
import { PrivacyCashService } from '../services/privacy-cash.service';
import { ShadowWireService } from '../services/shadowwire.service';
import { RangeService } from '../services/range.service';
import { DCASchedule, TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index';
import { randomUUID } from 'crypto';

import type {
  DCAConfig,
  ScheduleOptions,
  Schedule,
  Execution,
  ExecutionResult,
  ScheduleHistory,
  ScheduleEvent,
} from './types';

export { DCAConfig, ScheduleOptions, Schedule, Execution, ExecutionResult, ScheduleHistory, ScheduleEvent };

/**
 * Private DCA Toolkit SDK
 * 
 * Easy-to-use TypeScript SDK for managing private DCA schedules on Solana
 * 
 * @example
 * ```typescript
 * import { PrivateDCA } from '@dinario/private-dca-sdk';
 * 
 * const dca = new PrivateDCA({
 *   walletPath: '/path/to/wallet.json',
 *   rpcUrl: 'https://api.mainnet-beta.solana.com'
 * });
 * 
 * const schedule = await dca.schedule({
 *   fromToken: 'USDC',
 *   toToken: 'SOL',
 *   amount: 100,
 *   frequency: 'weekly',
 *   privacy: { zk: true, ephemeral: true }
 * });
 * 
 * schedule.on('executed', (event) => {
 *   console.log('DCA executed:', event.execution.signature);
 * });
 * ```
 */
export class PrivateDCA extends EventEmitter {
  private config: DCAConfig;
  private schedulerService: SchedulerService;
  private jupiterService: JupiterService;
  private initialized = false;

  constructor(config: DCAConfig) {
    super();
    this.config = config;
    this.schedulerService = new SchedulerService();

    // Initialize Jupiter service with dummy connection (will be replaced on actual execution)
    const dummyConnection = getConnection(config.rpcUrl);
    this.jupiterService = new JupiterService(dummyConnection);
  }

  /**
   * Initialize the SDK (validates config)
   */
  async initialize(): Promise<void> {
    try {
      loadKeypair(this.config.walletPath);
      getConnection(this.config.rpcUrl);
      this.initialized = true;
    } catch (error: any) {
      throw new Error(`Failed to initialize SDK: ${error.message}`);
    }
  }

  /**
   * Create a new DCA schedule
   */
  async schedule(options: ScheduleOptions): Promise<Schedule> {
    if (!this.initialized) await this.initialize();

    const fromToken = options.fromToken.toUpperCase();
    const toToken = options.toToken.toUpperCase();

    // Validate tokens
    if (!TOKEN_MINTS[fromToken] || !TOKEN_MINTS[toToken]) {
      throw new Error(`Invalid token. Supported: ${Object.keys(TOKEN_MINTS).join(', ')}`);
    }

    if (fromToken === toToken) {
      throw new Error('Source and destination tokens must be different');
    }

    // Validate frequency
    const validFrequencies = ['hourly', 'daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(options.frequency)) {
      throw new Error(`Invalid frequency. Supported: ${validFrequencies.join(', ')}`);
    }

    // Create schedule
    const schedule: DCASchedule = {
      id: randomUUID(),
      fromToken,
      toToken,
      amountPerExecution: options.amount,
      frequency: options.frequency,
      isPrivate: options.privacy?.arcium ?? false,
      useEphemeral: options.privacy?.ephemeral ?? false,
      useZk: options.privacy?.zk ?? false,
      useShadow: options.privacy?.shadowwire ?? false,
      screenAddresses: options.privacy?.screenAddresses ?? false,
      slippageBps: options.slippageBps ?? 50,
      totalExecutions: options.executions,
      executedCount: 0,
      createdAt: new Date().toISOString(),
      active: true,
    };

    // Register with scheduler
    this.schedulerService.addSchedule(schedule, async (s) => {
      await this.executeSchedule(s);
    });

    // Emit event
    this.emit('schedule:created', {
      type: 'created',
      schedule: this.formatSchedule(schedule),
    } as ScheduleEvent);

    return this.formatSchedule(schedule);
  }

  /**
   * List all DCA schedules
   */
  async list(): Promise<Schedule[]> {
    if (!this.initialized) await this.initialize();

    const schedules = this.schedulerService.loadSchedules();
    return schedules.map(s => this.formatSchedule(s));
  }

  /**
   * Get a specific schedule by ID
   */
  async get(id: string): Promise<Schedule | null> {
    if (!this.initialized) await this.initialize();

    const schedules = this.schedulerService.loadSchedules();
    const schedule = schedules.find(s => s.id.startsWith(id));
    return schedule ? this.formatSchedule(schedule) : null;
  }

  /**
   * Execute a schedule immediately (for testing or manual execution)
   */
  async execute(id: string): Promise<ExecutionResult> {
    if (!this.initialized) await this.initialize();

    const schedules = this.schedulerService.loadSchedules();
    const schedule = schedules.find(s => s.id.startsWith(id));

    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }

    try {
      const result = await this.executeSchedule(schedule);
      
      this.emit('schedule:executed', {
        type: 'executed',
        schedule: this.formatSchedule(schedule),
        execution: result,
      } as ScheduleEvent);

      return result;
    } catch (error: any) {
      const errorMsg = error.message || 'Unknown error';
      
      this.emit('schedule:failed', {
        type: 'failed',
        schedule: this.formatSchedule(schedule),
        error: errorMsg,
      } as ScheduleEvent);

      throw error;
    }
  }

  /**
   * Pause a schedule
   */
  async pause(id: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    const schedules = this.schedulerService.loadSchedules();
    const schedule = schedules.find(s => s.id.startsWith(id));

    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }

    const paused = this.schedulerService.pauseSchedule(schedule.id);
    if (!paused) {
      throw new Error('Failed to pause schedule');
    }

    this.emit('schedule:paused', {
      type: 'paused',
      schedule: this.formatSchedule(schedule),
    } as ScheduleEvent);
  }

  /**
   * Resume a paused schedule
   */
  async resume(id: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    const schedules = this.schedulerService.loadSchedules();
    const schedule = schedules.find(s => s.id.startsWith(id));

    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }

    this.schedulerService.addSchedule(schedule, async (s) => {
      await this.executeSchedule(s);
    });

    const resumed = this.schedulerService.resumeSchedule(schedule.id);
    if (!resumed) {
      throw new Error('Failed to resume schedule');
    }

    this.emit('schedule:resumed', {
      type: 'resumed',
      schedule: this.formatSchedule(schedule),
    } as ScheduleEvent);
  }

  /**
   * Cancel a schedule
   */
  async cancel(id: string): Promise<void> {
    if (!this.initialized) await this.initialize();

    const schedules = this.schedulerService.loadSchedules();
    const schedule = schedules.find(s => s.id.startsWith(id));

    if (!schedule) {
      throw new Error(`Schedule not found: ${id}`);
    }

    const removed = this.schedulerService.removeSchedule(schedule.id);
    if (!removed) {
      throw new Error('Failed to cancel schedule');
    }

    this.emit('schedule:cancelled', {
      type: 'cancelled',
      schedule: this.formatSchedule(schedule),
    } as ScheduleEvent);
  }

  /**
   * Get execution history
   */
  async history(id?: string): Promise<ScheduleHistory[]> {
    if (!this.initialized) await this.initialize();

    const schedules = this.schedulerService.loadSchedules();
    
    const results: ScheduleHistory[] = [];

    if (id) {
      const schedule = schedules.find(s => s.id.startsWith(id));
      if (!schedule) {
        throw new Error(`Schedule not found: ${id}`);
      }

      const executions = this.schedulerService.getExecutions(schedule.id);
      const nextExecution = this.schedulerService.getNextExecution(schedule.id);

      results.push({
        scheduleId: schedule.id,
        status: schedule.active ? 'active' : 'paused',
        totalExecutions: executions.length,
        lastExecution: executions.length > 0 ? executions[executions.length - 1].executedAt : undefined,
        nextExecution: nextExecution?.toISOString(),
        executions: executions.map(e => ({
          scheduleId: e.scheduleId,
          signature: e.signature,
          success: e.success,
          error: e.error,
          executedAt: e.executedAt,
        })),
      });
    } else {
      for (const schedule of schedules) {
        const executions = this.schedulerService.getExecutions(schedule.id);
        const nextExecution = this.schedulerService.getNextExecution(schedule.id);

        results.push({
          scheduleId: schedule.id,
          status: schedule.active ? 'active' : 'paused',
          totalExecutions: executions.length,
          lastExecution: executions.length > 0 ? executions[executions.length - 1].executedAt : undefined,
          nextExecution: nextExecution?.toISOString(),
          executions: executions.map(e => ({
            scheduleId: e.scheduleId,
            signature: e.signature,
            success: e.success,
            error: e.error,
            executedAt: e.executedAt,
          })),
        });
      }
    }

    return results;
  }

  /**
   * Internal: Execute a schedule
   */
  private async executeSchedule(schedule: DCASchedule): Promise<ExecutionResult> {
    try {
      const keypair = loadKeypair(this.config.walletPath);
      const connection = getConnection(this.config.rpcUrl);
      const jupiterService = new JupiterService(connection);
      const ephemeralService = new EphemeralService(connection);

      // Get quote
      const inputMint = TOKEN_MINTS[schedule.fromToken];
      const outputMint = TOKEN_MINTS[schedule.toToken];
      const inputDecimals = TOKEN_DECIMALS[schedule.fromToken];
      const inputAmount = Math.floor(schedule.amountPerExecution * Math.pow(10, inputDecimals));

      const quote = await jupiterService.getQuote(inputMint, outputMint, inputAmount, schedule.slippageBps);
      
      // Execute swap
      let signature: string;
      if (schedule.useEphemeral || schedule.useZk) {
        const ephemeral = ephemeralService.generateEphemeralWallet();
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

        signature = await jupiterService.executeSwap(quote, ephemeral.keypair);

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
        }

        await ephemeralService.recoverSol(ephemeral.keypair, keypair.publicKey);
      } else {
        signature = await jupiterService.executeSwap(quote, keypair);
      }

      const outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[schedule.toToken]);

      return {
        success: true,
        signature,
        amount: outputAmount,
        outputToken: schedule.toToken,
      };
    } catch (error: any) {
      throw new Error(`Execution failed: ${error.message}`);
    }
  }

  /**
   * Format internal schedule to public format
   */
  private formatSchedule(schedule: DCASchedule): Schedule {
    return {
      id: schedule.id,
      fromToken: schedule.fromToken,
      toToken: schedule.toToken,
      amountPerExecution: schedule.amountPerExecution,
      frequency: schedule.frequency,
      useEphemeral: schedule.useEphemeral ?? false,
      useZk: schedule.useZk ?? false,
      useShadow: schedule.useShadow ?? false,
      isPrivate: schedule.isPrivate ?? false,
      screenAddresses: schedule.screenAddresses ?? false,
      slippageBps: schedule.slippageBps,
      totalExecutions: schedule.totalExecutions,
      executedCount: schedule.executedCount,
      active: schedule.active,
      createdAt: schedule.createdAt,
    };
  }
}

export default PrivateDCA;
