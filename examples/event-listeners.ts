/**
 * Event Listeners Example: Monitor DCA executions
 * 
 * This example shows how to listen to schedule events and react to them.
 */

import { PrivateDCA, ScheduleEvent } from '../src/sdk';

async function main() {
  const dca = new PrivateDCA({
    walletPath: process.env.SOLANA_WALLET || '~/.solana/id.json',
    rpcUrl: 'https://api.mainnet-beta.solana.com',
  });

  try {
    await dca.initialize();

    // Set up event listeners
    console.log('🎧 Setting up event listeners...\n');

    // When a schedule is created
    dca.on('schedule:created', (event: ScheduleEvent) => {
      console.log(`✓ Schedule created: ${event.schedule.id.slice(0, 8)}`);
      console.log(`  Swap: ${event.schedule.amountPerExecution} ${event.schedule.fromToken} → ${event.schedule.toToken}`);
      console.log(`  Frequency: ${event.schedule.frequency}\n`);
    });

    // When a schedule executes successfully
    dca.on('schedule:executed', (event: ScheduleEvent) => {
      const exec = event.execution;
      if (exec) {
        console.log(`✓ Execution successful: ${exec.signature?.slice(0, 16)}...`);
        console.log(`  Status: ${exec.success ? '✓ Success' : '✗ Failed'}`);
        console.log(`  Time: ${new Date(exec.executedAt).toLocaleString()}\n`);
      }
    });

    // When a schedule fails
    dca.on('schedule:failed', (event: ScheduleEvent) => {
      console.error(`✗ Execution failed: ${event.schedule.id.slice(0, 8)}`);
      console.error(`  Error: ${event.error}\n`);
    });

    // When a schedule is paused
    dca.on('schedule:paused', (event: ScheduleEvent) => {
      console.log(`⏸ Schedule paused: ${event.schedule.id.slice(0, 8)}\n`);
    });

    // When a schedule is resumed
    dca.on('schedule:resumed', (event: ScheduleEvent) => {
      console.log(`▶ Schedule resumed: ${event.schedule.id.slice(0, 8)}\n`);
    });

    // When a schedule is cancelled
    dca.on('schedule:cancelled', (event: ScheduleEvent) => {
      console.log(`✕ Schedule cancelled: ${event.schedule.id.slice(0, 8)}\n`);
    });

    // Create a schedule
    console.log('📅 Creating schedule with event monitoring...\n');
    const schedule = await dca.schedule({
      fromToken: 'USDC',
      toToken: 'SOL',
      amount: 100,
      frequency: 'weekly',
      privacy: {
        ephemeral: true,
        zk: true,
      },
    });

    console.log('⏳ Listening for events... (press Ctrl+C to exit)\n');

    // For demo: pause after 5 seconds
    setTimeout(async () => {
      console.log('📌 Pausing schedule...');
      await dca.pause(schedule.id);

      setTimeout(async () => {
        console.log('▶ Resuming schedule...');
        await dca.resume(schedule.id);

        setTimeout(async () => {
          console.log('🗑 Cancelling schedule...');
          await dca.cancel(schedule.id);

          console.log('\n✓ Demo complete!');
          process.exit(0);
        }, 2000);
      }, 2000);
    }, 2000);

  } catch (error) {
    console.error('Error:', (error as Error).message);
    process.exit(1);
  }
}

main();
