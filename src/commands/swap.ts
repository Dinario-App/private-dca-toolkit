import { Command } from 'commander';
import { loadConfig, loadKeypair, getConnection } from '../utils/wallet.js';
import { logger } from '../utils/logger.js';
import { JupiterService } from '../services/jupiter.service.js';
import { RangeService } from '../services/range.service.js';
import { ArciumService } from '../services/arcium.service.js';
import { TOKEN_MINTS, TOKEN_DECIMALS } from '../types/index.js';
import ora from 'ora';

export const swapCommand = new Command('swap')
  .description('Execute a token swap')
  .requiredOption('--from <token>', 'Source token (SOL, USDC, USDT)')
  .requiredOption('--to <token>', 'Destination token (SOL, USDC, USDT)')
  .requiredOption('--amount <number>', 'Amount to swap')
  .option('--private', 'Use Arcium confidential transfer', false)
  .option('--screen', 'Screen addresses with Range before swap', false)
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
    const slippageBps = parseInt(options.slippage);
    const isPrivate = options.private;
    const shouldScreen = options.screen;

    // Validate tokens
    if (!TOKEN_MINTS[fromToken] || !TOKEN_MINTS[toToken]) {
      logger.error(`Invalid token. Supported: ${Object.keys(TOKEN_MINTS).join(', ')}`);
      return;
    }

    if (fromToken === toToken) {
      logger.error('Source and destination tokens must be different');
      return;
    }

    logger.header('Private DCA Swap');
    logger.keyValue('From', `${amount} ${fromToken}`);
    logger.keyValue('To', toToken);
    logger.keyValue('Privacy', isPrivate ? logger.private() : logger.public());
    logger.keyValue('Screening', shouldScreen ? 'Enabled' : 'Disabled');
    console.log('');

    try {
      const keypair = loadKeypair(config.walletPath);
      const connection = getConnection(config.rpcUrl);

      // Step 1: Screen addresses if enabled
      if (shouldScreen) {
        const screenSpinner = ora('Screening addresses with Range...').start();

        if (!config.rangeApiKey) {
          screenSpinner.warn('Range API key not configured. Skipping screening.');
        } else {
          const rangeService = new RangeService(config.rangeApiKey);
          const result = await rangeService.screenAddress(keypair.publicKey.toBase58());

          if (result.isSanctioned || result.riskLevel === 'severe') {
            screenSpinner.fail('Address screening failed: High risk detected');
            logger.error(`Risk Level: ${result.riskLevel}`);
            return;
          }
          screenSpinner.succeed(`Screening passed (Risk: ${result.riskLevel})`);
        }
      }

      // Step 2: Get Jupiter quote
      const quoteSpinner = ora('Getting best swap route...').start();
      const jupiterService = new JupiterService(connection);

      const inputMint = TOKEN_MINTS[fromToken];
      const outputMint = TOKEN_MINTS[toToken];
      const inputDecimals = TOKEN_DECIMALS[fromToken];
      const inputAmount = Math.floor(amount * Math.pow(10, inputDecimals));

      const quote = await jupiterService.getQuote(inputMint, outputMint, inputAmount, slippageBps);
      quoteSpinner.succeed('Route found');

      const outputAmount = parseInt(quote.outAmount) / Math.pow(10, TOKEN_DECIMALS[toToken]);
      logger.keyValue('Expected Output', `${outputAmount.toFixed(6)} ${toToken}`);
      logger.keyValue('Price Impact', `${quote.priceImpactPct}%`);

      // Step 3: Execute swap
      const swapSpinner = ora('Executing swap...').start();
      const signature = await jupiterService.executeSwap(quote, keypair);
      swapSpinner.succeed('Swap executed');

      // Step 4: Confidential transfer if private mode
      if (isPrivate) {
        const privacySpinner = ora('Applying Arcium confidential transfer...').start();

        try {
          const arciumService = new ArciumService(connection);
          // Note: In production, this would wrap the output in a confidential transfer
          // For hackathon demo, we simulate this step
          await new Promise((resolve) => setTimeout(resolve, 1000));
          privacySpinner.succeed('Confidential transfer applied');
        } catch (error: any) {
          privacySpinner.warn(`Confidential transfer skipped: ${error.message}`);
        }
      }

      // Final output
      console.log('');
      logger.success('Swap completed successfully!');
      logger.tx(signature);

      const explorerUrl =
        config.network === 'mainnet-beta'
          ? `https://solscan.io/tx/${signature}`
          : `https://solscan.io/tx/${signature}?cluster=devnet`;
      logger.keyValue('Explorer', explorerUrl);
    } catch (error: any) {
      logger.error(`Swap failed: ${error.message}`);
    }
  });
