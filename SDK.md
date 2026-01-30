# Private DCA SDK Documentation

Complete TypeScript SDK for programmatic management of private DCA schedules on Solana.

## Installation

```bash
npm install @dinario/private-dca-sdk
```

## Quick Start

```typescript
import { PrivateDCA } from '@dinario/private-dca-sdk';

// Initialize SDK
const dca = new PrivateDCA({
  walletPath: '~/.solana/id.json',
  rpcUrl: 'https://api.mainnet-beta.solana.com'
});

// Create a DCA schedule
const schedule = await dca.schedule({
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 100,
  frequency: 'weekly',
  privacy: {
    ephemeral: true,
    zk: true,
    shadowwire: true,
    arcium: true
  }
});

console.log(`Schedule created: ${schedule.id}`);

// Listen to executions
dca.on('schedule:executed', (event) => {
  console.log(`Executed: ${event.execution?.signature}`);
});
```

## API Reference

### Constructor

```typescript
new PrivateDCA(config: DCAConfig)
```

**Parameters:**
- `config.walletPath` (string) - Path to Solana wallet keypair file
- `config.rpcUrl` (string) - Solana RPC endpoint
- `config.rangeApiKey?` (string) - Optional Range API key for address screening

### Methods

#### initialize()

```typescript
await dca.initialize(): Promise<void>
```

Initialize and validate the SDK configuration. Must be called before other operations.

**Throws:** Error if wallet or RPC is invalid

---

#### schedule()

```typescript
await dca.schedule(options: ScheduleOptions): Promise<Schedule>
```

Create a new DCA schedule.

**Parameters:**

```typescript
interface ScheduleOptions {
  fromToken: string;           // Source token (USDC, SOL, USDT, etc.)
  toToken: string;             // Target token
  amount: number;              // Amount per execution
  frequency: 'hourly' | 'daily' | 'weekly' | 'monthly';
  privacy?: {
    ephemeral?: boolean;       // Use ephemeral wallets (default: false)
    zk?: boolean;              // Use Privacy Cash ZK pools (default: false)
    shadowwire?: boolean;      // Use ShadowWire encryption (default: false)
    arcium?: boolean;          // Use Arcium confidential transfers (default: false)
    screenAddresses?: boolean; // Enable address screening (default: false)
  };
  executions?: number;         // Total executions (unlimited if omitted)
  slippageBps?: number;        // Slippage tolerance in basis points (default: 50)
}
```

**Returns:** `Promise<Schedule>`

**Emits:** `schedule:created` event

**Example:**
```typescript
const schedule = await dca.schedule({
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 250,
  frequency: 'monthly',
  privacy: { zk: true, shadowwire: true }
});
```

---

#### list()

```typescript
await dca.list(): Promise<Schedule[]>
```

Get all DCA schedules.

**Returns:** `Promise<Schedule[]>` - Array of all schedules

**Example:**
```typescript
const schedules = await dca.list();
schedules.forEach(s => {
  console.log(`${s.id}: ${s.amountPerExecution} ${s.fromToken}→${s.toToken}`);
});
```

---

#### get()

```typescript
await dca.get(id: string): Promise<Schedule | null>
```

Get a specific schedule by ID (partial ID matching supported).

**Parameters:**
- `id` (string) - Schedule ID or partial ID (first 8 chars sufficient)

**Returns:** `Promise<Schedule | null>` - Schedule or null if not found

**Example:**
```typescript
const schedule = await dca.get('abc12345');
```

---

#### execute()

```typescript
await dca.execute(id: string): Promise<ExecutionResult>
```

Execute a schedule immediately (for testing or manual execution).

**Parameters:**
- `id` (string) - Schedule ID

**Returns:** `Promise<ExecutionResult>`

**Emits:** `schedule:executed` or `schedule:failed` event

**Throws:** Error if execution fails

**Example:**
```typescript
try {
  const result = await dca.execute('abc12345');
  console.log(`Executed: ${result.signature}`);
} catch (error) {
  console.error('Failed:', error);
}
```

---

#### pause()

```typescript
await dca.pause(id: string): Promise<void>
```

Pause a schedule.

**Parameters:**
- `id` (string) - Schedule ID

**Emits:** `schedule:paused` event

**Throws:** Error if schedule not found

**Example:**
```typescript
await dca.pause('abc12345');
```

---

#### resume()

```typescript
await dca.resume(id: string): Promise<void>
```

Resume a paused schedule.

**Parameters:**
- `id` (string) - Schedule ID

**Emits:** `schedule:resumed` event

**Throws:** Error if schedule not found

**Example:**
```typescript
await dca.resume('abc12345');
```

---

#### cancel()

```typescript
await dca.cancel(id: string): Promise<void>
```

Cancel and delete a schedule.

**Parameters:**
- `id` (string) - Schedule ID

**Emits:** `schedule:cancelled` event

**Throws:** Error if schedule not found

**Example:**
```typescript
await dca.cancel('abc12345');
```

---

#### history()

```typescript
await dca.history(id?: string): Promise<ScheduleHistory[]>
```

Get execution history.

**Parameters:**
- `id?` (string) - Optional schedule ID to filter history

**Returns:** `Promise<ScheduleHistory[]>` - Execution history

**Example:**
```typescript
// Get history for all schedules
const allHistory = await dca.history();

// Get history for specific schedule
const history = await dca.history('abc12345');
history.forEach(h => {
  console.log(`${h.totalExecutions} executions`);
  h.executions.forEach(e => {
    console.log(`  ${e.signature}: ${e.success ? 'OK' : 'FAILED'}`);
  });
});
```

---

### Events

The SDK extends `EventEmitter`. Listen to these events:

#### schedule:created

```typescript
dca.on('schedule:created', (event: ScheduleEvent) => {
  console.log('Created:', event.schedule.id);
});
```

Emitted when a new schedule is created.

---

#### schedule:executed

```typescript
dca.on('schedule:executed', (event: ScheduleEvent) => {
  console.log('Executed:', event.execution?.signature);
});
```

Emitted when a schedule executes successfully.

---

#### schedule:failed

```typescript
dca.on('schedule:failed', (event: ScheduleEvent) => {
  console.error('Failed:', event.error);
});
```

Emitted when a schedule execution fails.

---

#### schedule:paused

```typescript
dca.on('schedule:paused', (event: ScheduleEvent) => {
  console.log('Paused:', event.schedule.id);
});
```

Emitted when a schedule is paused.

---

#### schedule:resumed

```typescript
dca.on('schedule:resumed', (event: ScheduleEvent) => {
  console.log('Resumed:', event.schedule.id);
});
```

Emitted when a schedule is resumed.

---

#### schedule:cancelled

```typescript
dca.on('schedule:cancelled', (event: ScheduleEvent) => {
  console.log('Cancelled:', event.schedule.id);
});
```

Emitted when a schedule is cancelled.

---

## Types

### Schedule

```typescript
interface Schedule {
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
```

### ExecutionResult

```typescript
interface ExecutionResult {
  success: boolean;
  signature?: string;
  error?: string;
  amount?: number;
  outputToken?: string;
}
```

### ScheduleHistory

```typescript
interface ScheduleHistory {
  scheduleId: string;
  status: 'active' | 'pending' | 'paused' | 'failed';
  totalExecutions: number;
  lastExecution?: string;
  nextExecution?: string;
  executions: Execution[];
}
```

## Error Handling

All methods throw descriptive errors:

```typescript
try {
  const schedule = await dca.schedule({
    fromToken: 'INVALID',
    toToken: 'SOL',
    amount: 100,
    frequency: 'weekly'
  });
} catch (error) {
  console.error(error.message); // "Invalid token. Supported: ..."
}
```

## Best Practices

### 1. Always initialize first

```typescript
const dca = new PrivateDCA(config);
await dca.initialize(); // Required!
```

### 2. Handle events instead of polling

```typescript
// Good: Use events
dca.on('schedule:executed', (event) => {
  // React to execution
});

// Avoid: Polling
setInterval(() => dca.history(), 1000);
```

### 3. Use try/catch for operations

```typescript
try {
  await dca.execute(scheduleId);
} catch (error) {
  console.error('Execution failed:', error);
  // Handle error appropriately
}
```

### 4. Validate inputs

```typescript
const schedule = await dca.get(id);
if (!schedule) {
  console.error('Schedule not found');
  return;
}
```

### 5. Test on devnet first

```typescript
const dca = new PrivateDCA({
  walletPath: devnetWallet,
  rpcUrl: 'https://api.devnet.solana.com' // Use devnet for testing
});
```

## Privacy Features Explained

### Ephemeral Wallets
Each DCA execution uses a temporary wallet unlinked to your main wallet. This prevents on-chain analysis from linking your purchases.

### ZK Pools
Privacy Cash pools hide the sender's identity through zero-knowledge proofs. Observers can't tell who initiated the swap.

### ShadowWire
Transaction amounts are encrypted using Bulletproofs. Only the recipient can see how much was transferred.

### Arcium Confidential
Arcium's RescueCipher encrypts amounts in Solana confidential transfers, hiding transaction values on-chain.

### Address Screening
Range Protocol screens addresses for compliance, ensuring transactions don't violate sanctions.

## Examples

See [examples/](./examples) directory for complete working examples:
- `basic-schedule.ts` - Simple schedule creation
- `advanced-privacy.ts` - Maximum privacy setup
- `event-listeners.ts` - Event monitoring

Run examples with:
```bash
ts-node examples/basic-schedule.ts
```

## Support & Issues

For bugs or questions:
1. Check [examples/](./examples)
2. Review this documentation
3. Open an issue on [GitHub](https://github.com/web3sly/private-dca-toolkit/issues)

## License

MIT - See LICENSE file
