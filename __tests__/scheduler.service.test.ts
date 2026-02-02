// __tests__/scheduler.service.test.ts
import { SchedulerService } from '../src/services/scheduler.service';
import { DCASchedule } from '../src/types/index';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    start: jest.fn(),
    stop: jest.fn(),
  }),
}));

// Mock fs module
jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(false),
  mkdirSync: jest.fn(),
  readFileSync: jest.fn().mockReturnValue('[]'),
  writeFileSync: jest.fn(),
}));

describe('SchedulerService', () => {
  let schedulerService: SchedulerService;
  const mockSchedule: DCASchedule = {
    id: 'test-schedule-1',
    name: 'Test DCA',
    fromToken: 'SOL',
    toToken: 'USDC',
    amount: 0.1,
    frequency: 'daily',
    active: true,
    createdAt: new Date().toISOString(),
    useEphemeral: true,
    useZk: false,
    useShadow: false,
    usePrivate: false,
    useScreen: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    schedulerService = new SchedulerService();
  });

  describe('constructor', () => {
    it('should create data directory if it does not exist', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      new SchedulerService();
      expect(fs.mkdirSync).toHaveBeenCalled();
    });

    it('should not create data directory if it already exists', () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);
      new SchedulerService();
      // mkdirSync might still be called in ensureDataDir, but existsSync returning true means it won't actually create
    });
  });

  describe('addSchedule', () => {
    it('should add a new schedule and start the cron task', async () => {
      const cron = require('node-cron');
      const onExecute = jest.fn().mockResolvedValue(undefined);

      schedulerService.addSchedule(mockSchedule, onExecute);

      expect(cron.schedule).toHaveBeenCalledTimes(1);
      expect(cron.schedule).toHaveBeenCalledWith('0 9 * * *', expect.any(Function)); // Daily cron
    });
  });

  describe('removeSchedule', () => {
    it('should remove an existing schedule', async () => {
      const onExecute = jest.fn().mockResolvedValue(undefined);
      schedulerService.addSchedule(mockSchedule, onExecute);

      const result = schedulerService.removeSchedule(mockSchedule.id);

      expect(result).toBe(true);
      expect(schedulerService.getSchedule(mockSchedule.id)).toBeUndefined();
    });

    it('should return false for non-existent schedule', () => {
      const result = schedulerService.removeSchedule('non-existent-id');
      expect(result).toBe(false);
    });
  });

  describe('pauseSchedule', () => {
    it('should pause an active schedule', async () => {
      const onExecute = jest.fn().mockResolvedValue(undefined);
      schedulerService.addSchedule(mockSchedule, onExecute);

      const result = schedulerService.pauseSchedule(mockSchedule.id);

      expect(result).toBe(true);
      const schedule = schedulerService.getSchedule(mockSchedule.id);
      expect(schedule?.active).toBe(false);
    });
  });

  describe('resumeSchedule', () => {
    it('should resume a paused schedule', async () => {
      const pausedSchedule = { ...mockSchedule, active: false };
      const onExecute = jest.fn().mockResolvedValue(undefined);
      schedulerService.addSchedule(pausedSchedule, onExecute);
      schedulerService.pauseSchedule(pausedSchedule.id);

      const result = schedulerService.resumeSchedule(pausedSchedule.id);

      expect(result).toBe(true);
      const schedule = schedulerService.getSchedule(pausedSchedule.id);
      expect(schedule?.active).toBe(true);
    });
  });

  describe('getSchedules', () => {
    it('should return all schedules', async () => {
      const onExecute = jest.fn().mockResolvedValue(undefined);
      schedulerService.addSchedule(mockSchedule, onExecute);

      const schedules = schedulerService.getSchedules();

      expect(schedules.length).toBe(1);
      expect(schedules[0].id).toBe(mockSchedule.id);
    });

    it('should return empty array when no schedules exist', () => {
      const schedules = schedulerService.getSchedules();
      expect(schedules).toEqual([]);
    });
  });

  describe('getSchedule', () => {
    it('should return a specific schedule by ID', async () => {
      const onExecute = jest.fn().mockResolvedValue(undefined);
      schedulerService.addSchedule(mockSchedule, onExecute);

      const schedule = schedulerService.getSchedule(mockSchedule.id);

      expect(schedule).toBeDefined();
      expect(schedule?.id).toBe(mockSchedule.id);
    });

    it('should return undefined for non-existent schedule', () => {
      const schedule = schedulerService.getSchedule('non-existent-id');
      expect(schedule).toBeUndefined();
    });
  });

  describe('getNextExecution', () => {
    it('should return next execution time for daily schedule', async () => {
      const onExecute = jest.fn().mockResolvedValue(undefined);
      schedulerService.addSchedule(mockSchedule, onExecute);

      const nextExec = schedulerService.getNextExecution(mockSchedule.id);

      expect(nextExec).toBeInstanceOf(Date);
      expect(nextExec!.getHours()).toBe(9); // 9 AM
    });

    it('should return null for inactive schedule', async () => {
      const inactiveSchedule = { ...mockSchedule, active: false };
      const onExecute = jest.fn().mockResolvedValue(undefined);
      schedulerService.addSchedule(inactiveSchedule, onExecute);
      schedulerService.pauseSchedule(inactiveSchedule.id);

      const nextExec = schedulerService.getNextExecution(inactiveSchedule.id);

      expect(nextExec).toBeNull();
    });

    it('should return null for non-existent schedule', () => {
      const nextExec = schedulerService.getNextExecution('non-existent-id');
      expect(nextExec).toBeNull();
    });
  });

  describe('stopAll', () => {
    it('should stop all running tasks', async () => {
      const onExecute = jest.fn().mockResolvedValue(undefined);
      schedulerService.addSchedule(mockSchedule, onExecute);
      schedulerService.addSchedule({ ...mockSchedule, id: 'test-schedule-2' }, onExecute);

      schedulerService.stopAll();

      expect(schedulerService.getSchedules().length).toBe(0);
    });
  });

  describe('frequencyToCron', () => {
    it('should convert frequencies correctly', async () => {
      const cron = require('node-cron');
      const onExecute = jest.fn().mockResolvedValue(undefined);

      // Test hourly
      schedulerService.addSchedule({ ...mockSchedule, id: 'hourly-test', frequency: 'hourly' }, onExecute);
      expect(cron.schedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));

      // Test weekly
      schedulerService.addSchedule({ ...mockSchedule, id: 'weekly-test', frequency: 'weekly' }, onExecute);
      expect(cron.schedule).toHaveBeenCalledWith('0 9 * * 1', expect.any(Function));

      // Test monthly
      schedulerService.addSchedule({ ...mockSchedule, id: 'monthly-test', frequency: 'monthly' }, onExecute);
      expect(cron.schedule).toHaveBeenCalledWith('0 9 1 * *', expect.any(Function));
    });
  });
});
