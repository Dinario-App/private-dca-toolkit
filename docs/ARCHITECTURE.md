# Private DCA Toolkit - Architecture

## Overview

The Private DCA Toolkit provides privacy-preserving Dollar Cost Averaging (DCA) for Solana. It breaks on-chain linkability between your main wallet and swap transactions using ephemeral wallets, with optional confidential amounts via Arcium.

## Privacy Model

### The Problem: On-Chain Surveillance

Standard DCA services expose:
1. **Wallet address** - Visible in every swap transaction
2. **Trade amounts** - Anyone can see exact amounts
3. **Trade timing** - Regular patterns reveal DCA strategy
4. **Accumulated holdings** - Total position visible to trackers

Example: [Jupiter DCA Tracker](https://dca.jup.ag/) shows all DCA activity on-chain.

### The Solution: Ephemeral Wallets + Confidential Transfers

```
┌─────────────────────────────────────────────────────────────────┐
│                         PRIVACY LAYER                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Wallet (hidden)                                           │
│       │                                                         │
│       ▼                                                         │
│  ┌─────────────────┐                                           │
│  │ Fund Ephemeral  │  ← Only visible: user → ephemeral         │
│  │ (SOL + tokens)  │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Ephemeral Wallet│  ← Fresh keypair, single use              │
│  │ (fresh keypair) │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │  Jupiter Swap   │  ← On-chain: ephemeral → DEX              │
│  │  (via Jupiter)  │                                           │
│  └────────┬────────┘                                           │
│           │                                                     │
│           ▼                                                     │
│  ┌─────────────────┐                                           │
│  │ Send to User    │  ← On-chain: ephemeral → user             │
│  │ (or destination)│                                           │
│  └─────────────────┘                                           │
│                                                                  │
│  Result: No direct link between user wallet and swap            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Privacy Levels

| Level | Ephemeral | ZK Pool | ShadowWire | Arcium | What's Hidden |
|-------|-----------|---------|------------|--------|---------------|
| **Standard** | No | No | No | No | Nothing (fully transparent) |
| **Private** | Yes | No | No | No | User wallet linkability |
| **ZK Pool** | Yes | Yes | No | No | WHO sent (anonymity set) |
| **ShadowWire** | No | No | Yes | No | HOW MUCH (Bulletproofs) |
| **Confidential** | No | No | No | Yes | Transaction amounts (display) |
| **Ultimate** | Yes | Yes | Yes | No | WHO + HOW MUCH |

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                          CLI Layer                               │
├────────────────┬────────────────┬────────────────────────────────┤
│   swap.ts      │    dca.ts      │         config.ts              │
│   (single)     │   (scheduled)  │      (configuration)           │
└───────┬────────┴────────┬───────┴────────────────────────────────┘
        │                 │
        ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Service Layer                             │
├─────────────────┬───────────────┬───────────────┬───────────────┤
│   Jupiter       │   Ephemeral   │    Arcium     │    Range      │
│   Service       │   Service     │    Service    │   Service     │
│   (swap exec)   │   (privacy)   │  (encryption) │  (compliance) │
├─────────────────┼───────────────┼───────────────┼───────────────┤
│   Helius        │   Scheduler   │ Privacy Cash  │  ShadowWire   │
│   Service       │   Service     │   Service     │   Service     │
│   (priority)    │   (cron)      │  (ZK pools)   │ (Bulletproofs)│
└─────────────────┴───────────────┴───────────────┴───────────────┘
        │                 │               │               │
        ▼                 ▼               ▼               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Solana Network                              │
└─────────────────────────────────────────────────────────────────┘
```

## Service Details

### EphemeralService

**Purpose**: Generate and manage single-use wallets

**Key Functions**:
- `generateEphemeralWallet()` - Create fresh Keypair
- `fundEphemeral()` - Send SOL + tokens from user
- `sendToDestination()` - Forward output to final recipient
- `recoverSol()` - Reclaim unused SOL from ephemeral

**Privacy Contribution**: Breaks transaction graph linkability

### JupiterService

**Purpose**: Execute token swaps via Jupiter aggregator

**Key Functions**:
- `getQuote()` - Get best swap route
- `executeSwap()` - Sign and submit swap transaction

**Integration**: Works with both user wallet and ephemeral wallets

### ArciumService

**Purpose**: Encrypt transaction amounts using MPC (Arcium Network)

**Key Functions**:
- `checkAvailability()` - Verify SDK is installed
- `encryptAmount()` - Encrypt using RescueCipher
- `confidentialTransfer()` - Execute encrypted transfer
- `getPrivacyMetrics()` - Calculate privacy score
- `checkMxeStatus()` - Check MXE network health

**Privacy Contribution**: Encrypts amounts using MPC + x25519 ECDH key exchange

**Requirements**:
- `npm install @arcium-hq/client`
- SDK v0.5.2 (actively maintained)
- Current status: Public Testnet (Mainnet Alpha Q1 2026)

**Note**: Falls back to simulated flow for demo when SDK unavailable

### PrivacyCashService

**Purpose**: Zero-knowledge pool integration for maximum anonymity

**Key Functions**:
- `depositSol()` - Shield SOL into ZK pool
- `withdrawSol()` - Withdraw to ephemeral wallet
- `depositSpl()` - Shield USDC/USDT
- `withdrawSpl()` - Withdraw SPL tokens
- `checkAvailability()` - Verify Node 24+ requirement

**Privacy Contribution**: Provides anonymity set - funds become indistinguishable

**Requirements**:
- Node.js 24 or higher
- `npm install privacycash`
- Supported tokens: SOL, USDC, USDT only

**Note**: Falls back to simulated flow for demo when SDK unavailable

### ShadowWireService

**Purpose**: Encrypt transaction amounts using Bulletproofs (Radr Labs)

**Key Functions**:
- `checkAvailability()` - Verify SDK is installed
- `getBalance()` - Query ShadowWire pool balance
- `deposit()` - Deposit tokens into ShadowWire pool
- `withdraw()` - Withdraw tokens from pool
- `transfer()` - Execute encrypted transfer (internal or external)
- `isTokenSupported()` - Check if token is supported

**Privacy Contribution**: Hides HOW MUCH is transferred using zero-knowledge proofs

**Transfer Types**:
- **Internal**: Amount completely hidden (both parties must be ShadowWire users)
- **External**: Sender anonymous, amount visible (works with any wallet)

**Requirements**:
- `npm install @radr/shadowwire`
- Supported tokens: SOL, RADR, USDC, ORE, BONK, JIM, GODL, HUSTLE, ZEC, CRT, BLACKCOIN, GIL, ANON, WLFI, USD1, AOL, IQLABS (17 total)
- 1% relayer fee on all transfers

**Note**: Falls back to simulated flow for demo when SDK unavailable

### RangeService

**Purpose**: Compliance screening before transactions

**Key Functions**:
- `screenAddress()` - Check address risk level
- `screenTransaction()` - Validate transaction compliance

**Integration**: Optional but recommended for compliant privacy

### HeliusService

**Purpose**: Optimize transaction priority fees

**Key Functions**:
- `getPriorityFeeEstimate()` - Get optimal fee level
- `addPriorityFeeToTransaction()` - Add compute budget

**Benefit**: Faster confirmation, especially during congestion

### SchedulerService

**Purpose**: Manage recurring DCA executions

**Key Functions**:
- `addSchedule()` - Create new DCA schedule
- `loadSchedules()` - Persist schedules to disk
- `getExecutions()` - Track execution history

**Storage**: ~/.private-dca-toolkit/

## Transaction Flow

### Standard Swap (No Privacy)

```
1. User calls: private-dca swap --from SOL --to USDC --amount 1
2. JupiterService.getQuote() → Get route
3. JupiterService.executeSwap(userKeypair) → Submit tx
4. Transaction visible: UserWallet → DEX → UserWallet
```

### Private Swap (Ephemeral)

```
1. User calls: private-dca swap --from SOL --to USDC --amount 1 --ephemeral
2. EphemeralService.generateEphemeralWallet() → Fresh keypair
3. EphemeralService.fundEphemeral() → User funds ephemeral
4. JupiterService.getQuote() → Get route
5. JupiterService.executeSwap(ephemeralKeypair) → Swap from ephemeral
6. EphemeralService.sendToDestination() → Forward output
7. EphemeralService.recoverSol() → Reclaim dust
8. Transaction graph: User → Ephemeral (hidden) → DEX → Ephemeral → User
```

### Maximum Privacy Swap (Arcium)

```
1. User calls: private-dca swap --from SOL --to USDC --amount 1 --ephemeral --private
2. Steps 2-7 from Private Swap
3. ArciumService.encryptAmount() → Display encrypted amount
4. Future: Arcium C-SPL for actual encrypted on-chain amounts
```

### ZK Pool Swap (Privacy Cash)

```
1. User calls: private-dca swap --from SOL --to USDC --amount 1 --zk
2. PrivacyCashService.checkAvailability() → Verify Node 24+
3. PrivacyCashService.depositSol() → Shield into ZK pool (commitment generated)
4. EphemeralService.generateEphemeralWallet() → Fresh keypair
5. PrivacyCashService.withdrawSol() → Withdraw to ephemeral (zero-knowledge)
6. JupiterService.getQuote() → Get route
7. JupiterService.executeSwap(ephemeralKeypair) → Swap from ephemeral
8. EphemeralService.sendToDestination() → Forward output
9. Transaction graph: User → [ZK POOL] → Ephemeral → DEX → Ephemeral → User
   (The ZK pool breaks all chain analysis - funds are indistinguishable)
```

### ShadowWire Swap (Bulletproofs)

```
1. User calls: private-dca swap --from SOL --to USDC --amount 1 --shadow
2. Standard Jupiter swap executes
3. ShadowWireService.checkAvailability() → Verify SDK installed
4. ShadowWireService.deposit() → Deposit output tokens to ShadowWire pool
5. ShadowWireService.transfer(type: 'internal') → Execute encrypted transfer
6. On-chain amount shows: [ENCRYPTED] instead of actual value
7. Transaction graph: User → DEX → User (amount: [HIDDEN via Bulletproofs])
```

### Ultimate Privacy (ZK Pool + ShadowWire)

```
1. User calls: private-dca swap --from SOL --to USDC --amount 1 --zk --shadow
2. Steps 2-8 from ZK Pool Swap (hides WHO)
3. Steps 3-6 from ShadowWire Swap (hides HOW MUCH)
4. Result: Both sender identity AND amounts are hidden
5. Transaction graph: User → [ZK POOL] → Ephemeral → DEX → [SHADOWWIRE] → User
   (Chain analysis sees: Unknown sender, encrypted amount)
```

## Data Flow

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Config    │────▶│  Schedules  │────▶│  Executions │
│   (JSON)    │     │   (JSON)    │     │   (JSON)    │
└─────────────┘     └─────────────┘     └─────────────┘
      │                   │                   │
      ▼                   ▼                   ▼
~/.private-dca-toolkit/
├── config.json      # Wallet path, RPC URL, API keys
├── schedules.json   # DCA schedule definitions
└── executions.json  # Execution history
```

## Security Considerations

### Wallet Security
- Private keys never leave the user's machine
- Ephemeral keys are generated and discarded in memory
- No keys stored in config files

### Transaction Security
- All transactions simulated before signing
- Slippage protection on all swaps
- Retry logic for failed transactions

### Compliance
- Optional Range screening before transactions
- Blocks sanctioned addresses
- Audit trail via execution history

## Token Support

| Token | Symbol | Mint |
|-------|--------|------|
| Solana | SOL | So11...112 |
| USD Coin | USDC | EPjFW...1v |
| Tether | USDT | Es9vM...YB |
| Bonk | BONK | DezXA...63 |
| dogwifhat | WIF | EKpQG...jm |
| Jupiter | JUP | JUPyi...CN |
| Raydium | RAY | 4k3Dy...6R |
| Orca | ORCA | orcaE...ZE |

## Performance Optimization

### Helius Priority Fees
When using Helius RPC, the toolkit automatically fetches optimal priority fees:

```typescript
// Auto-detected when RPC URL contains 'helius'
if (HeliusService.isHeliusRpc(rpcUrl)) {
  const fee = await helius.getPriorityFeeEstimate(serializedTx, 'Medium');
  transaction.add(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: fee }));
}
```

### Recommended RPC Configuration
```bash
# Helius (recommended for priority fees + reliability)
private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

# Public fallback
private-dca config set-rpc "https://api.mainnet-beta.solana.com"
```

## Future Enhancements

1. **Arcium C-SPL Integration**: When live, enable real encrypted on-chain amounts
2. **Cross-chain DCA**: NEAR Intents for multi-chain routing
3. **Mobile App**: React Native companion with Privy wallets

---

Built for the Solana Privacy Hackathon 2026 by [Dinario](https://dinario.app)

**Sponsors:**
- [Helius](https://helius.dev) - RPC & Priority Fees
- [Arcium](https://arcium.com) - Confidential Transfers
- [Range](https://range.xyz) - Compliance Screening
- [Privacy Cash](https://privacycash.xyz) - ZK Pools
- [Radr Labs](https://radr.fun) - ShadowWire Bulletproofs
