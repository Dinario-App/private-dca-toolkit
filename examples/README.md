# Private DCA SDK Examples

Learn how to use the Private DCA SDK with these practical examples.

## Running Examples

All examples can be run with `ts-node`:

```bash
# Install ts-node if needed
npm install -D ts-node

# Run an example
ts-node examples/basic-schedule.ts
```

## Examples

### 1. Basic Schedule

**File:** `basic-schedule.ts`

Create a simple weekly DCA schedule and list all active schedules.

```bash
ts-node examples/basic-schedule.ts
```

**What it does:**
- Initialize SDK
- Create a weekly DCA schedule (100 USDC → SOL)
- List all schedules
- Show execution history

### 2. Advanced Privacy

**File:** `advanced-privacy.ts`

Create a DCA schedule with maximum privacy features enabled.

```bash
ts-node examples/advanced-privacy.ts
```

**What it does:**
- Create schedule with ALL privacy features:
  - Ephemeral wallets
  - ZK pools (Privacy Cash)
  - ShadowWire encryption
  - Arcium confidential transfers
  - Address screening
- Set it to run for 52 weeks (1 year)
- Explain each privacy feature

### 3. Event Listeners

**File:** `event-listeners.ts`

Monitor DCA executions with event listeners.

```bash
ts-node examples/event-listeners.ts
```

**What it does:**
- Set up event listeners for:
  - `schedule:created` - When a schedule is created
  - `schedule:executed` - When a schedule executes
  - `schedule:failed` - When execution fails
  - `schedule:paused` - When a schedule is paused
  - `schedule:resumed` - When a schedule is resumed
  - `schedule:cancelled` - When a schedule is cancelled
- Demonstrate pause/resume/cancel operations

## SDK Methods

### Core Methods

```typescript
// Create a new DCA schedule
await dca.schedule({
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 100,
  frequency: 'weekly',
  privacy?: {
    ephemeral?: boolean,
    zk?: boolean,
    shadowwire?: boolean,
    arcium?: boolean,
    screenAddresses?: boolean,
  }
});

// List all schedules
await dca.list();

// Get a specific schedule
await dca.get(id);

// Execute a schedule immediately
await dca.execute(id);

// Pause a schedule
await dca.pause(id);

// Resume a paused schedule
await dca.resume(id);

// Cancel a schedule
await dca.cancel(id);

// Get execution history
await dca.history(id?);
```

### Events

```typescript
dca.on('schedule:created', (event) => { /* ... */ });
dca.on('schedule:executed', (event) => { /* ... */ });
dca.on('schedule:failed', (event) => { /* ... */ });
dca.on('schedule:paused', (event) => { /* ... */ });
dca.on('schedule:resumed', (event) => { /* ... */ });
dca.on('schedule:cancelled', (event) => { /* ... */ });
```

## Environment Variables

Set these before running examples:

```bash
# Path to your Solana wallet (default: ~/.solana/id.json)
export SOLANA_WALLET=/path/to/wallet.json

# Range API key for address screening (optional)
export RANGE_API_KEY=your_api_key
```

## Common Patterns

### Monitor schedule execution

```typescript
const dca = new PrivateDCA(config);

dca.on('schedule:executed', (event) => {
  console.log('Swap completed:', event.execution?.signature);
});

const schedule = await dca.schedule({
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 100,
  frequency: 'weekly',
});
```

### Create maximum privacy schedule

```typescript
const schedule = await dca.schedule({
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 100,
  frequency: 'weekly',
  privacy: {
    ephemeral: true,     // Hide main wallet
    zk: true,            // Hide sender identity
    shadowwire: true,    // Hide amount
    arcium: true,        // Confidential transfers
    screenAddresses: true, // Compliance check
  },
});
```

### Handle execution errors

```typescript
dca.on('schedule:failed', (event) => {
  console.error(`Failed: ${event.error}`);
  // Handle error - maybe alert user, retry, etc.
});

try {
  await dca.execute(scheduleId);
} catch (error) {
  console.error('Execution failed:', error);
}
```

## Tips

1. **Initialize before use** - Always call `dca.initialize()` first
2. **Use events** - Listen to events instead of polling
3. **Handle errors** - Wrap SDK calls in try/catch
4. **Test on devnet** - Use devnet RPC for testing before mainnet
5. **Monitor logs** - Set up proper logging for production

## Next Steps

- Read the [SDK documentation](../SDK.md)
- Check the [main README](../README.md) for CLI usage
- Join the [Solana Privacy Hackathon](https://solana.com)

## Support

For issues or questions, open an issue on [GitHub](https://github.com/web3sly/private-dca-toolkit).
