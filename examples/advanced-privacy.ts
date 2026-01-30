/**
 * Advanced Example: Create DCA with privacy features
 * 
 * This example demonstrates the full privacy feature set of Private DCA.
 */

import { PrivateDCA } from '../src/sdk';

async function main() {
  // Initialize SDK
  const dca = new PrivateDCA({
    walletPath: process.env.SOLANA_WALLET || '~/.solana/id.json',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
    rangeApiKey: process.env.RANGE_API_KEY,
  });

  try {
    console.log('🔐 Private DCA - Maximum Privacy Example\n');
    await dca.initialize();

    // Create schedule with ALL privacy features enabled
    console.log('Creating maximum privacy DCA schedule...\n');

    const schedule = await dca.schedule({
      fromToken: 'USDC',
      toToken: 'SOL',
      amount: 250,
      frequency: 'weekly',
      privacy: {
        // Ephemeral wallets: Each swap uses a fresh wallet not linked to your main wallet
        ephemeral: true,
        
        // ZK Pool: Privacy Cash pools hide the sender identity
        zk: true,
        
        // ShadowWire: Bulletproof encryption hides the amount
        shadowwire: true,
        
        // Arcium: Confidential transfers encrypt amounts on-chain
        arcium: true,
        
        // Address screening: Compliance check for sanctioned addresses
        screenAddresses: true,
      },
      executions: 52, // Run for 1 year (52 weeks)
    });

    console.log('✓ Maximum privacy schedule created!\n');
    console.log('Privacy Features Enabled:');
    console.log('  🔒 Ephemeral wallets    - Main wallet hidden on-chain');
    console.log('  🛡️  ZK pools            - Sender identity hidden');
    console.log('  🔐 ShadowWire           - Amount encrypted (Bulletproofs)');
    console.log('  🔐 Arcium               - Confidential transfers');
    console.log('  ✓ Range screening       - Compliance checked\n');

    console.log(`Schedule Details:`);
    console.log(`  ID: ${schedule.id.slice(0, 8)}`);
    console.log(`  Amount: ${schedule.amountPerExecution} ${schedule.fromToken}`);
    console.log(`  Target: ${schedule.toToken}`);
    console.log(`  Frequency: ${schedule.frequency}`);
    console.log(`  Duration: ${schedule.totalExecutions} executions (1 year)\n`);

    // Listen for execution events
    console.log('Setting up event listeners...\n');

    dca.on('schedule:executed', (event) => {
      if (event.execution?.signature) {
        console.log(`✓ Execution completed: ${event.execution.signature.slice(0, 16)}...`);
      }
    });

    dca.on('schedule:failed', (event) => {
      console.error(`✗ Execution failed: ${event.error}`);
    });

    console.log('💡 Tip: This schedule will automatically execute every week');
    console.log('💡 Each swap is completely private - no wallet linking\n');

    // Get schedule info
    const schedules = await dca.list();
    console.log(`Active schedules: ${schedules.length}`);

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
