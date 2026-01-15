import { Keypair, Connection, LAMPORTS_PER_SOL } from '@solana/web3.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.private-dca');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export interface WalletConfig {
  walletPath: string;
  rpcUrl: string;
  network: 'mainnet-beta' | 'devnet';
  rangeApiKey?: string;
}

export function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadConfig(): WalletConfig | null {
  ensureConfigDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    return null;
  }
  const data = fs.readFileSync(CONFIG_FILE, 'utf-8');
  return JSON.parse(data);
}

export function saveConfig(config: WalletConfig): void {
  ensureConfigDir();
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function loadKeypair(walletPath: string): Keypair {
  const resolvedPath = walletPath.replace('~', os.homedir());

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Wallet file not found: ${resolvedPath}`);
  }

  const secretKey = JSON.parse(fs.readFileSync(resolvedPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(secretKey));
}

export function getConnection(rpcUrl: string): Connection {
  return new Connection(rpcUrl, 'confirmed');
}

export async function getBalance(connection: Connection, keypair: Keypair): Promise<number> {
  const balance = await connection.getBalance(keypair.publicKey);
  return balance / LAMPORTS_PER_SOL;
}
