import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DCASchedule, DCAExecution } from '../types/index.js';

interface ScheduledTask {
  id: string;
  schedule: DCASchedule;
  task: cron.ScheduledTask;
}

export class SchedulerService {
  private tasks: Map<string, ScheduledTask> = new Map();
  private dataDir: string;
  private schedulesFile: string;
  private executionsFile: string;

  constructor() {
    this.dataDir = path.join(os.homedir(), '.private-dca');
    this.schedulesFile = path.join(this.dataDir, 'schedules.json');
    this.executionsFile = path.join(this.dataDir, 'executions.json');
    this.ensureDataDir();
  }

  private ensureDataDir(): void {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
  }

  /**
   * Convert frequency to cron expression
   */
  private frequencyToCron(frequency: DCASchedule['frequency']): string {
    switch (frequency) {
      case 'hourly':
        return '0 * * * *';
      case 'daily':
        return '0 9 * * *'; // 9 AM daily
      case 'weekly':
        return '0 9 * * 1'; // 9 AM Monday
      case 'monthly':
        return '0 9 1 * *'; // 9 AM 1st of month
      default:
        return '0 9 * * *'; // Default to daily
    }
  }

  /**
   * Add a new DCA schedule
   */
  addSchedule(schedule: DCASchedule, onExecute: (schedule: DCASchedule) => Promise<void>): void {
    const cronExpression = this.frequencyToCron(schedule.frequency);

    const task = cron.schedule(cronExpression, async () => {
      if (!schedule.active) return;

      // Check if we've reached total executions limit
      const executions = this.getExecutions(schedule.id);
      if (schedule.totalExecutions && executions.length >= schedule.totalExecutions) {
        this.pauseSchedule(schedule.id);
        return;
      }

      try {
        await onExecute(schedule);
        this.recordExecution(schedule.id, true);
      } catch (error: any) {
        this.recordExecution(schedule.id, false, error.message);
      }
    });

    this.tasks.set(schedule.id, { id: schedule.id, schedule, task });
    this.saveSchedules();
  }

  /**
   * Remove a DCA schedule (works in CLI mode via file)
   */
  removeSchedule(scheduleId: string): boolean {
    // Stop in-memory task if running
    const scheduledTask = this.tasks.get(scheduleId);
    if (scheduledTask) {
      scheduledTask.task.stop();
      this.tasks.delete(scheduleId);
    }

    // Remove from file
    const schedules = this.loadSchedules();
    const index = schedules.findIndex((s) => s.id === scheduleId);
    if (index !== -1) {
      schedules.splice(index, 1);
      this.saveSchedulesToFile(schedules);
      return true;
    }
    return false;
  }

  /**
   * Pause a DCA schedule (works in CLI mode via file)
   */
  pauseSchedule(scheduleId: string): boolean {
    // Stop in-memory task if running
    const scheduledTask = this.tasks.get(scheduleId);
    if (scheduledTask) {
      scheduledTask.schedule.active = false;
      scheduledTask.task.stop();
    }

    // Update in file
    const schedules = this.loadSchedules();
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (schedule) {
      schedule.active = false;
      this.saveSchedulesToFile(schedules);
      return true;
    }
    return false;
  }

  /**
   * Resume a DCA schedule (works in CLI mode via file)
   */
  resumeSchedule(scheduleId: string): boolean {
    // Start in-memory task if exists
    const scheduledTask = this.tasks.get(scheduleId);
    if (scheduledTask) {
      scheduledTask.schedule.active = true;
      scheduledTask.task.start();
    }

    // Update in file
    const schedules = this.loadSchedules();
    const schedule = schedules.find((s) => s.id === scheduleId);
    if (schedule) {
      schedule.active = true;
      this.saveSchedulesToFile(schedules);
      return true;
    }
    return false;
  }

  /**
   * Get all schedules
   */
  getSchedules(): DCASchedule[] {
    return Array.from(this.tasks.values()).map((t) => t.schedule);
  }

  /**
   * Get a specific schedule
   */
  getSchedule(scheduleId: string): DCASchedule | undefined {
    return this.tasks.get(scheduleId)?.schedule;
  }

  /**
   * Record an execution
   */
  private recordExecution(scheduleId: string, success: boolean, error?: string): void {
    const executions = this.loadExecutions();
    const execution: DCAExecution = {
      id: `exec-${Date.now()}`,
      scheduleId,
      executedAt: new Date().toISOString(),
      success,
      error,
    };
    executions.push(execution);
    this.saveExecutions(executions);
  }

  /**
   * Get executions for a schedule
   */
  getExecutions(scheduleId: string): DCAExecution[] {
    const executions = this.loadExecutions();
    return executions.filter((e) => e.scheduleId === scheduleId);
  }

  /**
   * Load schedules from disk
   */
  loadSchedules(): DCASchedule[] {
    try {
      if (fs.existsSync(this.schedulesFile)) {
        const data = fs.readFileSync(this.schedulesFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load schedules:', error);
    }
    return [];
  }

  /**
   * Save schedules to disk (from in-memory tasks)
   */
  private saveSchedules(): void {
    const schedules = this.getSchedules();
    fs.writeFileSync(this.schedulesFile, JSON.stringify(schedules, null, 2));
  }

  /**
   * Save schedules array directly to disk
   */
  saveSchedulesToFile(schedules: DCASchedule[]): void {
    fs.writeFileSync(this.schedulesFile, JSON.stringify(schedules, null, 2));
  }

  /**
   * Load executions from disk
   */
  private loadExecutions(): DCAExecution[] {
    try {
      if (fs.existsSync(this.executionsFile)) {
        const data = fs.readFileSync(this.executionsFile, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load executions:', error);
    }
    return [];
  }

  /**
   * Save executions to disk
   */
  private saveExecutions(executions: DCAExecution[]): void {
    fs.writeFileSync(this.executionsFile, JSON.stringify(executions, null, 2));
  }

  /**
   * Restore schedules from disk on startup
   */
  restoreSchedules(onExecute: (schedule: DCASchedule) => Promise<void>): void {
    const schedules = this.loadSchedules();
    for (const schedule of schedules) {
      if (schedule.active) {
        this.addSchedule(schedule, onExecute);
      }
    }
  }

  /**
   * Stop all running tasks
   */
  stopAll(): void {
    for (const [, scheduledTask] of this.tasks) {
      scheduledTask.task.stop();
    }
    this.tasks.clear();
  }

  /**
   * Calculate next execution time
   */
  getNextExecution(scheduleId: string): Date | null {
    const schedule = this.getSchedule(scheduleId);
    if (!schedule || !schedule.active) return null;

    const now = new Date();
    switch (schedule.frequency) {
      case 'hourly':
        return new Date(now.getTime() + 60 * 60 * 1000);
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(9, 0, 0, 0);
        return tomorrow;
      case 'weekly':
        const nextWeek = new Date(now);
        nextWeek.setDate(nextWeek.getDate() + (7 - nextWeek.getDay() + 1) % 7 || 7);
        nextWeek.setHours(9, 0, 0, 0);
        return nextWeek;
      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(1);
        nextMonth.setHours(9, 0, 0, 0);
        return nextMonth;
      default:
        return null;
    }
  }
}
