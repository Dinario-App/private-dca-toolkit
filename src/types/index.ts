import { PublicKey } from '@solana/web3.js';

export interface DCASchedule {
  id: string;
  fromToken: string;
  toToken: string;
  amountPerExecution: number;
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  isPrivate: boolean;
  screenAddresses: boolean;
  slippageBps: number;
  totalExecutions?: number;
  executedCount: number;
  createdAt: string;
  active: boolean;
}

export interface DCAExecution {
  id: string;
  scheduleId: string;
  executedAt: string;
  success: boolean;
  signature?: string;
  inputAmount?: number;
  outputAmount?: number;
  error?: string;
}

export interface SwapParams {
  fromToken: string;
  toToken: string;
  amount: number;
  slippageBps?: number;
  isPrivate?: boolean;
  screenAddresses?: boolean;
}

export interface SwapResult {
  signature: string;
  inputAmount: number;
  outputAmount: number;
  inputToken: string;
  outputToken: string;
  isPrivate: boolean;
  screeningPassed: boolean;
}

export interface RangeScreeningResult {
  address: string;
  riskLevel: 'low' | 'medium' | 'high' | 'severe';
  isSanctioned: boolean;
  riskScore: number;
  details?: string;
}

export interface Config {
  walletPath: string;
  rpcUrl: string;
  network: 'mainnet-beta' | 'devnet';
  rangeApiKey?: string;
}

export const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

export const TOKEN_DECIMALS: Record<string, number> = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
};
