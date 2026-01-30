/**
 * Public SDK Types for Private DCA Toolkit
 */

export interface DCAConfig {
  walletPath: string;
  rpcUrl: string;
  rangeApiKey?: string;
}

export interface ScheduleOptions {
  fromToken: string;
  toToken: string;
  amount: number;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  privacy?: PrivacyOptions;
  executions?: number;
  slippageBps?: number;
}

export interface PrivacyOptions {
  ephemeral?: boolean;
  zk?: boolean;
  shadowwire?: boolean;
  arcium?: boolean;
  screenAddresses?: boolean;
}

export interface Schedule {
  id: string;
  fromToken: string;
  toToken: string;
  amountPerExecution: number;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  useEphemeral: boolean;
  useZk: boolean;
  useShadow: boolean;
  isPrivate: boolean;
  screenAddresses: boolean;
  slippageBps: number;
  totalExecutions?: number;
  executedCount: number;
  active: boolean;
  createdAt: string;
}

export interface Execution {
  scheduleId: string;
  signature?: string;
  success: boolean;
  error?: string;
  executedAt: string;
}

export interface ExecutionResult {
  success: boolean;
  signature?: string;
  error?: string;
  amount?: number;
  outputToken?: string;
}

export interface ScheduleHistory {
  scheduleId: string;
  status: 'active' | 'pending' | 'paused' | 'failed';
  totalExecutions: number;
  lastExecution?: string;
  nextExecution?: string;
  executions: Execution[];
}

export type ScheduleEventType = 'created' | 'executed' | 'paused' | 'resumed' | 'cancelled' | 'failed';

export interface ScheduleEvent {
  type: ScheduleEventType;
  schedule: Schedule;
  execution?: Execution;
  error?: string;
}
