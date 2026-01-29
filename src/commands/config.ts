import { Command } from 'commander';
import { loadConfig, saveConfig, loadKeypair, getConnection, getBalance } from '../utils/wallet';
import { logger } from '../utils/logger';
import ora from 'ora';

export const configCommand = new Command('config')
  .description('Configure wallet and RPC settings');

configCommand
  .command('set-wallet <path>')
  .description('Set the wallet keypair path')
  .action((walletPath: string) => {
    try {
      // Verify wallet can be loaded
      const keypair = loadKeypair(walletPath);
      const config = loadConfig() || {
        walletPath: '',
        rpcUrl: 'https://api.devnet.solana.com',
        network: 'devnet' as const,
      };
      config.walletPath = walletPath;
      saveConfig(config);
      logger.success(`Wallet set to: ${walletPath}`);
      logger.keyValue('Public Key', keypair.publicKey.toBase58());
    } catch (error: any) {
      logger.error(`Failed to set wallet: ${error.message}`);
    }
  });

configCommand
  .command('set-rpc <url>')
  .description('Set the Solana RPC URL')
  .action((rpcUrl: string) => {
    const config = loadConfig() || {
      walletPath: '',
      rpcUrl: '',
      network: 'devnet' as const,
    };
    config.rpcUrl = rpcUrl;

    // Auto-detect network from URL
    if (rpcUrl.includes('mainnet')) {
      config.network = 'mainnet-beta';
    } else {
      config.network = 'devnet';
    }

    saveConfig(config);
    logger.success(`RPC URL set to: ${rpcUrl}`);
    logger.keyValue('Network', config.network);
  });

configCommand
  .command('set-range-key <apiKey>')
  .description('Set the Range API key for compliance screening')
  .action((apiKey: string) => {
    const config = loadConfig();
    if (!config) {
      logger.error('Please configure wallet and RPC first');
      return;
    }
    config.rangeApiKey = apiKey;
    saveConfig(config);
    logger.success('Range API key configured');
  });

configCommand
  .command('show')
  .description('Show current configuration')
  .action(async () => {
    const config = loadConfig();
    if (!config) {
      logger.warning('No configuration found. Run `private-dca config set-wallet` first.');
      return;
    }

    logger.header('Private DCA Configuration');
    logger.keyValue('Wallet Path', config.walletPath || 'Not set');
    logger.keyValue('RPC URL', config.rpcUrl || 'Not set');
    logger.keyValue('Network', config.network || 'Not set');
    logger.keyValue('Range API', config.rangeApiKey ? '✓ Configured' : '✗ Not configured');

    // Show wallet balance if configured
    if (config.walletPath && config.rpcUrl) {
      const spinner = ora('Fetching balance...').start();
      try {
        const keypair = loadKeypair(config.walletPath);
        const connection = getConnection(config.rpcUrl);
        const balance = await getBalance(connection, keypair);
        spinner.stop();
        logger.keyValue('Public Key', keypair.publicKey.toBase58());
        logger.keyValue('SOL Balance', `${balance.toFixed(4)} SOL`);
      } catch (error: any) {
        spinner.fail(`Failed to fetch balance: ${error.message}`);
      }
    }
  });
