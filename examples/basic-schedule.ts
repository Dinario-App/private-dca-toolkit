/**
 * Basic Example: Create and list DCA schedules
 * 
 * This example shows how to use the Private DCA SDK for basic operations.
 */

import { PrivateDCA } from '../src/sdk';

async function main() {
  // Initialize SDK
  const dca = new PrivateDCA({
    walletPath: process.env.SOLANA_WALLET || '~/.solana/id.json',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  });

  try {
    console.log('🔄 Initializing Private DCA SDK...\n');
    await dca.initialize();

    // Create a simple weekly DCA schedule
    console.log('📅 Creating weekly DCA schedule...');
    const schedule = await dca.schedule({
      fromToken: 'USDC',
      toToken: 'SOL',
      amount: 100,
      frequency: 'weekly',
    });

    console.log('✓ Schedule created!');
    console.log(`  ID: ${schedule.id.slice(0, 8)}`);
    console.log(`  Swap: ${schedule.amountPerExecution} ${schedule.fromToken} → ${schedule.toToken}`);
    console.log(`  Frequency: ${schedule.frequency}\n`);

    // List all schedules
    console.log('📋 Listing all schedules...');
    const schedules = await dca.list();
    console.log(`✓ Found ${schedules.length} schedule(s)\n`);

    schedules.forEach(s => {
      console.log(`  • [${s.id.slice(0, 6)}] ${s.amountPerExecution} ${s.fromToken}→${s.toToken} (${s.frequency})`);
    });

    // Get execution history
    console.log('\n📊 Execution history:');
    const history = await dca.history();
    if (history.length > 0) {
      history.forEach(h => {
        console.log(`  • ${h.scheduleId.slice(0, 6)}: ${h.totalExecutions} executions`);
      });
    } else {
      console.log('  • No executions yet');
    }

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
