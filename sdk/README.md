# @dinario/private-dca-sdk

**SDK for integrating Private DCA into your fintech platform**

## Install

```bash
npm install @dinario/private-dca-sdk @solana/web3.js
```

## Quick Start

### Execute a Private Swap

```javascript
import { PrivateDCA } from '@dinario/private-dca-sdk';

const dca = new PrivateDCA({
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=YOUR_KEY',
  rangeApiKey: 'optional' // for compliance screening
});

const result = await dca.swap({
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 50, // $50 USD
  privacy: true,           // Ephemeral wallet (default)
  screening: true,         // Range compliance check (default)
  zkPool: false,          // Privacy Cash ZK pool (optional)
});

console.log(`Saved: $${result.feeSaved}`);
console.log(`Privacy: ${result.privacyScore}/100`);
console.log(`Tx: ${result.signature}`);
```

### Schedule Recurring DCA

```javascript
const schedule = await dca.schedule({
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 50,
  frequency: 'weekly', // or 'daily', 'monthly'
  privacy: true,
  screening: true,
});

console.log(`Schedule ID: ${schedule.id}`);
console.log(`Monthly savings: $${schedule.estimatedMonthlySavings}`);
```

### React Hook

```jsx
import { usePrivateDCA } from '@dinario/private-dca-sdk/react';

export function MySwapComponent() {
  const { swap, loading, result } = usePrivateDCA();

  return (
    <div>
      <button onClick={() => swap({ fromToken: 'USDC', toToken: 'SOL', amount: 50 })}>
        {loading ? 'Swapping...' : 'Swap'}
      </button>
      
      {result && (
        <div>
          <p>✓ Swapped for ${result.amount}</p>
          <p>💰 Saved: ${result.feeSaved}</p>
          <p>🔐 Privacy: {result.privacyScore}/100</p>
        </div>
      )}
    </div>
  );
}
```

## Features

- ✅ **Privacy First** - Ephemeral wallets by default
- ✅ **Compliant** - Range screening for sanctions
- ✅ **Cost Optimized** - 30%+ fee savings
- ✅ **Zero Complexity** - Simple API, no jargon

## Supported Tokens

SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA

## Examples

See `/examples` for:
- React integration
- Next.js app
- Vue.js integration
- Plain JavaScript

## API Reference

### `PrivateDCA`

Constructor options:
```typescript
{
  rpcUrl: string;           // Solana RPC
  rangeApiKey?: string;     // For compliance screening
  arkKey?: string;          // Arkham Intelligence API
}
```

#### Methods

**`swap(options: SwapOptions): Promise<SwapResult>`**

Execute a private swap.

Options:
- `fromToken: string` - Source token
- `toToken: string` - Destination token
- `amount: number` - Amount in USD or token units
- `privacy?: boolean` - Use ephemeral wallet (default: true)
- `screening?: boolean` - Range compliance check (default: true)
- `zkPool?: boolean` - Privacy Cash ZK pool (default: false)

Returns:
```typescript
{
  signature: string;
  amount: number;
  feeSaved: number;
  privacyScore: number; // 0-100
  timestamp: string;
}
```

**`schedule(options: ScheduleOptions): Promise<ScheduleResult>`**

Create recurring DCA.

Returns schedule ID + estimated monthly savings.

## Contributing

[See main repo](../)

## License

MIT
