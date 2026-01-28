# Private DCA Toolkit

> **Privacy-first Dollar Cost Averaging for Solana**

[![Solana](https://img.shields.io/badge/Solana-Privacy%20Hackathon%202026-9945FF?style=flat&logo=solana)](https://www.colosseum.org/renaissance)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A CLI tool for executing **private DCA** strategies on Solana. Uses ephemeral wallets to break on-chain linkability, with optional Arcium confidential transfers and Range compliance screening.

**Built for the Solana Privacy Hackathon 2026.**

---

## Why Private DCA?

Standard DCA services expose your entire trading strategy on-chain:

- **Your wallet** - Linked to every trade
- **Amounts** - Visible to anyone
- **Timing** - Regular patterns reveal your strategy
- **Holdings** - Total position tracked by services like [Jupiter DCA Tracker](https://dca.jup.ag/)

**Private DCA breaks this linkability** using ephemeral wallets - fresh keypairs for each trade that are discarded after use.

[Read more: Why Private DCA?](docs/WHY-PRIVATE-DCA.md)

---

## Features

| Feature | Description |
|---------|-------------|
| **Ephemeral Wallets** | Fresh keypair per trade - your wallet never touches the DEX |
| **Privacy Cash ZK Pool** | Zero-knowledge pool for maximum anonymity (Node 24+) |
| **ShadowWire Bulletproofs** | Encrypted transaction amounts via Radr Labs |
| **Arcium Encryption** | Encrypted amount display (C-SPL ready) |
| **Range Screening** | Optional compliance checks before trades |
| **Jupiter Aggregation** | Best routes across Solana DEXes |
| **Helius Priority Fees** | Optimal fee estimation when using Helius RPC |
| **Multi-Token Support** | SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA |
| **DCA Scheduling** | Hourly, daily, weekly, monthly automation |

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/dinarioapp/private-dca-toolkit.git
cd private-dca-toolkit

# Install dependencies
npm install

# Build
npm run build

# Link globally
npm link
```

### Configuration

```bash
# Set your wallet keypair
private-dca config set-wallet ~/.config/solana/id.json

# Set RPC endpoint (Helius recommended for priority fees)
private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

# Optional: Range API key for compliance
private-dca config set-range-key YOUR_RANGE_API_KEY

# View config
private-dca config show
```

### Your First Private Swap

```bash
# Standard swap (no privacy)
private-dca swap --from SOL --to USDC --amount 0.1

# Private swap with ephemeral wallet
private-dca swap --from SOL --to USDC --amount 0.1 --ephemeral

# ZK Pool privacy (anonymity set - requires Node 24+)
private-dca swap --from SOL --to USDC --amount 0.1 --zk

# ShadowWire encrypted amounts (Bulletproofs via Radr Labs)
private-dca swap --from SOL --to USDC --amount 0.1 --shadow

# Maximum privacy (ZK pool + ShadowWire + screening)
private-dca swap --from SOL --to USDC --amount 0.1 --zk --shadow --screen
```

### Private DCA Schedule

```bash
# Weekly private DCA: Buy SOL with USDC
private-dca dca schedule \
  --from USDC \
  --to SOL \
  --amount 50 \
  --frequency weekly \
  --ephemeral

# View schedules
private-dca dca list

# View execution history
private-dca dca history
```

---

## Privacy Levels

| Level | Flags | What's Hidden |
|-------|-------|---------------|
| **Standard** | (none) | Nothing - fully transparent |
| **Private** | `--ephemeral` | Wallet linkability |
| **ZK Pool** | `--zk` | WHO sent (anonymity set, Node 24+) |
| **ShadowWire** | `--shadow` | HOW MUCH (Bulletproofs encryption) |
| **Confidential** | `--private` | Transaction amounts (Arcium display) |
| **Compliant** | `--screen` | Blocks sanctioned addresses |
| **Ultimate** | `--zk --shadow --screen` | WHO + HOW MUCH + Compliant |

---

## Commands

### `swap`

Execute a single token swap.

```bash
private-dca swap \
  --from <TOKEN> \
  --to <TOKEN> \
  --amount <NUMBER> \
  [--ephemeral] \
  [--private] \
  [--screen] \
  [--destination <ADDRESS>] \
  [--slippage <BPS>]
```

| Option | Description |
|--------|-------------|
| `--from` | Source token (SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA) |
| `--to` | Destination token |
| `--amount` | Amount to swap |
| `--ephemeral` | Use ephemeral wallet for privacy |
| `--zk` | Use Privacy Cash ZK pool (SOL/USDC/USDT only, Node 24+) |
| `--shadow` | Use ShadowWire for encrypted amounts (17 tokens via Radr) |
| `--private` | Display encrypted amounts (Arcium) |
| `--screen` | Screen addresses with Range |
| `--destination` | Send output to different address (with --ephemeral) |
| `--slippage` | Slippage tolerance in basis points (default: 50) |

### `dca`

Manage DCA schedules.

```bash
# Create schedule
private-dca dca schedule \
  --from <TOKEN> --to <TOKEN> --amount <NUMBER> \
  --frequency <hourly|daily|weekly|monthly> \
  [--ephemeral] [--zk] [--shadow] [--private] [--screen] \
  [--executions <NUMBER>]

# Manage schedules
private-dca dca list
private-dca dca pause --id <ID>
private-dca dca resume --id <ID>
private-dca dca cancel --id <ID>
private-dca dca execute --id <ID>
private-dca dca history
```

### `config`

Configure wallet and settings.

```bash
private-dca config set-wallet <PATH>
private-dca config set-rpc <URL>
private-dca config set-range-key <KEY>
private-dca config show
```

---

## Architecture

```
┌────────────────────────────────────────────────────────────────┐
│                     Private DCA Toolkit                         │
├────────────────────────────────────────────────────────────────┤
│  CLI Layer        │ swap.ts │ dca.ts │ config.ts               │
├────────────────────────────────────────────────────────────────┤
│  Service Layer    │ Ephemeral │ Jupiter │ Arcium │ Range │ Helius
├────────────────────────────────────────────────────────────────┤
│  Network Layer    │            Solana Mainnet                   │
└────────────────────────────────────────────────────────────────┘
```

[Full architecture documentation](docs/ARCHITECTURE.md)

---

## Ephemeral Wallet Flow

```
Your Wallet (hidden)
      │
      ▼
┌─────────────────┐
│ Fund Ephemeral  │  ← Only link to your wallet
│ (SOL + tokens)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Ephemeral Swap  │  ← DEX sees ephemeral, not you
│ (via Jupiter)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Send to You     │  ← Output returned
│ (or destination)│
└─────────────────┘

Result: No direct link between your wallet and the swap
```

---

## Supported Tokens

| Token | Symbol | Mint Address |
|-------|--------|--------------|
| Solana | SOL | `So11...112` |
| USD Coin | USDC | `EPjFWdd5...1v` |
| Tether | USDT | `Es9vMFrz...YB` |
| Bonk | BONK | `DezXAZ8z...63` |
| dogwifhat | WIF | `EKpQGSJt...jm` |
| Jupiter | JUP | `JUPyiwrY...CN` |
| Raydium | RAY | `4k3Dyjzv...6R` |
| Orca | ORCA | `orcaEKTd...ZE` |

---

## Examples

See the [examples/](examples/) folder:

- `single-swap.sh` - Basic token swap
- `private-swap.sh` - Ephemeral wallet swap
- `weekly-dca.sh` - Set up weekly DCA
- `maximum-privacy.sh` - All privacy features

---

## Development

```bash
npm install      # Install dependencies
npm run build    # Compile TypeScript
npm run dev      # Development mode
npm test         # Run tests
```

---

## Hackathon Bounties

This project targets multiple bounties in the Solana Privacy Hackathon:

| Bounty | Prize | Implementation |
|--------|-------|----------------|
| **Private Payments Track** | $15,000 | Ephemeral wallets, privacy flow |
| **Radr Labs** | $15,000 | ShadowWire Bulletproofs integration |
| **Arcium** | $10,000 | Confidential transfer integration |
| **Privacy Cash** | $6,000 | ZK pool integration |
| **Helius** | $5,000 | Priority fee optimization |
| **Range** | $1,500+ | Compliance screening |
| **Encrypt.trade** | $1,000 | Privacy education (docs) |

---

## Sponsors

Built with support from:

<table>
<tr>
<td align="center">
<a href="https://helius.dev">
<strong>Helius</strong><br/>
RPC & Priority Fees
</a>
</td>
<td align="center">
<a href="https://arcium.com">
<strong>Arcium</strong><br/>
Confidential Transfers
</a>
</td>
<td align="center">
<a href="https://range.xyz">
<strong>Range</strong><br/>
Compliance Screening
</a>
</td>
<td align="center">
<a href="https://jup.ag">
<strong>Jupiter</strong><br/>
DEX Aggregation
</a>
</td>
<td align="center">
<a href="https://privacycash.xyz">
<strong>Privacy Cash</strong><br/>
ZK Pools
</a>
</td>
<td align="center">
<a href="https://radr.fun">
<strong>Radr Labs</strong><br/>
ShadowWire Bulletproofs
</a>
</td>
</tr>
</table>

---

## Related Projects

- [Dinario](https://dinario.app) - Privacy-first fintech for Latin America
- UI for Private DCA coming to dinario.app

---

## License

MIT

---

**Built for the [Solana Privacy Hackathon 2026](https://www.colosseum.org/renaissance)**

*Your trades. Your privacy. Your choice.*
