import { Command } from 'commander';
import { loadConfig, loadKeypair, getConnection } from '../utils/wallet';
import { logger } from '../utils/logger';
import { PrivacyCashService } from '../services/privacy-cash.service';
import { ShadowWireService } from '../services/shadowwire.service';
import {
  SwapExecutorService,
  SwapProgressEvent,
} from '../services/swap-executor.service';
import { TOKEN_MINTS } from '../types/index';
import ora, { type Ora } from 'ora';

export const swapCommand = new Command('swap')
  .description('Execute a token swap (private by default)')
  .requiredOption('--from <token>', 'Source token (SOL, USDC, USDT, BONK, WIF, JUP)')
  .requiredOption('--to <token>', 'Destination token (SOL, USDC, USDT, BONK, WIF, JUP)')
  .requiredOption('--amount <number>', 'Amount to swap')
  .option('--no-privacy', 'Disable ephemeral wallet (expose your wallet on-chain)', false)
  .option('--zk', 'Use Privacy Cash ZK pool for maximum anonymity (requires Node 24+)', false)
  .option('--shadow', 'Use ShadowWire for encrypted amounts (Bulletproofs via Radr Labs)', false)
  .option('--private', 'Use Arcium confidential transfer for encrypted amounts', false)
  .option('--no-screen', 'Disable Range compliance screening', false)
  .option('--slippage <bps>', 'Slippage tolerance in basis points', '50')
  .option('--destination <address>', 'Send output to different address (requires privacy enabled)')
  .action(async (options) => {
    const config = loadConfig();
    if (!config || !config.walletPath || !config.rpcUrl) {
      logger.error('Please configure wallet and RPC first: private-dca config set-wallet <path>');
      return;
    }

    const fromToken = options.from.toUpperCase();
    const toToken = options.to.toUpperCase();
    const amount = parseFloat(options.amount);
    const slippageBps = parseInt(options.slippage);
    const useEphemeral = options.privacy; // Privacy ON by default (disable with --no-privacy)
    const useZk = options.zk;
    const useShadow = options.shadow;
    const isPrivate = options.private;
    const shouldScreen = options.screen; // Screening ON by default (disable with --no-screen)
    const customDestination = options.destination;

    // Validate amount and slippage
    if (isNaN(amount) || amount <= 0) {
      logger.error('Amount must be a positive number');
      return;
    }

    if (isNaN(slippageBps) || slippageBps < 1 || slippageBps > 1000) {
      logger.error('Slippage must be between 1 and 1000 basis points');
      return;
    }

    // Validate tokens
    if (!TOKEN_MINTS[fromToken] || !TOKEN_MINTS[toToken]) {
      logger.error(`Invalid token. Supported: ${Object.keys(TOKEN_MINTS).join(', ')}`);
      return;
    }

    if (fromToken === toToken) {
      logger.error('Source and destination tokens must be different');
      return;
    }

    if (customDestination && !useEphemeral) {
      logger.error('--destination requires privacy to be enabled (remove --no-privacy)');
      return;
    }

    // ZK mode requires ephemeral and only supports SOL/USDC/USDT
    if (useZk) {
      if (!PrivacyCashService.isTokenSupported(fromToken)) {
        logger.error(`Privacy Cash ZK only supports SOL, USDC, USDT. Got: ${fromToken}`);
        return;
      }
    }

    // ShadowWire supports 17 tokens
    if (useShadow) {
      if (!ShadowWireService.isTokenSupported(fromToken)) {
        logger.error(`ShadowWire doesn't support ${fromToken}. Supported: ${ShadowWireService.getSupportedTokens().join(', ')}`);
        return;
      }
    }

    logger.header('Private DCA Swap');
    logger.keyValue('From', `${amount} ${fromToken}`);
    logger.keyValue('To', toToken);
    logger.keyValue('Ephemeral', useEphemeral ? 'Yes (privacy mode)' : 'No');
    logger.keyValue('ZK Pool', useZk ? 'Yes (maximum privacy)' : 'No');
    logger.keyValue('ShadowWire', useShadow ? 'Yes (encrypted amounts)' : 'No');
    logger.keyValue('Confidential', isPrivate ? logger.private() : logger.public());
    logger.keyValue('Screening', shouldScreen ? 'Enabled' : 'Disabled');
    if (customDestination) {
      logger.keyValue('Destination', customDestination.slice(0, 8) + '...');
    }
    console.log('');

    try {
      const keypair = loadKeypair(config.walletPath);
      const connection = getConnection(config.rpcUrl);

      // Step 0: Display privacy score
      if (useEphemeral || shouldScreen || useZk || useShadow) {
        let score = 20; // Base non-custodial score
        const factors: string[] = ['Non-custodial: you control your keys'];

        if (useEphemeral) {
          score += 30;
          factors.push('Ephemeral wallet breaks on-chain linkability');
        }
        if (shouldScreen) {
          score += 10;
          factors.push('Range screening ensures compliant counterparties');
        }
        if (useZk) {
          score += 20;
          factors.push('Privacy Cash ZK pool provides anonymity set (hides WHO)');
        }
        if (useShadow) {
          score += 20;
          factors.push('ShadowWire Bulletproofs encrypts amounts (hides HOW MUCH)');
        }

        console.log('');
        logger.keyValue('Privacy Score', `${Math.min(score, 100)}/100`);
        factors.forEach((f) => console.log(`  - ${f}`));
        console.log('');
      }

      // Display ZK pool anonymity information if enabled
      if (useZk) {
        const zkInfo = PrivacyCashService.getAnonymitySetInfo(fromToken);
        console.log('\uD83D\uDD10 ZK Pool Anonymity Set:');
        console.log(`   Hidden among: ${zkInfo.minAnonymitySet}+ other users`);
        console.log(`   Pool value: ~${zkInfo.estimatedPoolValue}`);
        console.log(`   Privacy: WHO you are is hidden in the anonymity set`);
        console.log('');
      }

      // Execute swap via shared service
      const executor = new SwapExecutorService(connection);

      // Manage ora spinners driven by progress callbacks
      let currentSpinner: Ora | null = null;

      const result = await executor.execute(
        keypair,
        {
          fromToken,
          toToken,
          amount,
          slippageBps,
          useEphemeral,
          useZk,
          useShadow,
          isPrivate,
          shouldScreen,
          customDestination,
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

          // Print quote detail inline when quote phase succeeds
          if (event.phase === 'quote' && event.status === 'success' && event.detail) {
            const parts = event.detail.split(' | ');
            if (parts.length === 2) {
              logger.keyValue('Expected Output', parts[0].replace('Expected: ', ''));
              logger.keyValue('Price Impact', parts[1].replace('Impact: ', ''));
            }
          }
        },
      );

      // Final output
      console.log('');
      logger.success('Swap completed successfully!');
      logger.tx(result.signature!);

      const explorerUrl =
        config.network === 'mainnet-beta'
          ? `https://orbmarkets.io/tx/${result.signature}`
          : `https://solscan.io/tx/${result.signature}?cluster=devnet`;
      logger.keyValue('Explorer', explorerUrl);

      if (useEphemeral || useZk) {
        console.log('');
        logger.keyValue('Privacy', 'Your main wallet is not visible on-chain for this swap');
      }

      if (useZk) {
        logger.keyValue('ZK Privacy', 'Funds passed through Privacy Cash anonymity set (hides WHO)');
      }

      if (useShadow) {
        logger.keyValue('ShadowWire', 'Transaction amount encrypted with Bulletproofs (hides HOW MUCH)');
      }
    } catch (error: any) {
      logger.error(`Swap failed: ${error.message}`);
    }
  });
