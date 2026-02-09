# Private DCA Toolkit

> Privacy-first Dollar Cost Averaging for Solana

[![Solana](https://img.shields.io/badge/Solana-Privacy%20Hackathon%202026-9945FF?style=flat&logo=solana)](https://solana.com/privacyhack)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org)
[![Tests](https://img.shields.io/badge/Tests-126%20passing-brightgreen)]()

A command-line tool for dollar-cost averaging on Solana with multiple privacy layers. Non-custodial, runs locally, no servers or accounts required.

---

## The Problem

Standard DCA on Solana is fully transparent:

- Your wallet is linked to every trade
- Transaction amounts are visible to anyone
- Regular patterns reveal your strategy
- Holdings are tracked by public aggregators

---

## The Solution

Private DCA stacks multiple privacy layers into one CLI:

| Layer | Technology | What It Hides | Status |
|-------|-----------|---------------|--------|
| **Ephemeral Wallets** | Fresh keypair per trade | **WHO** -- DEX never sees your real wallet | Built-in (default) |
| **Privacy Cash ZK** | Zero-knowledge pools (`privacycash`) | **WHO** -- funds mixed in anonymity set | Requires Node 24+ |
| **ShadowWire** | Bulletproofs (`@radr/shadowwire`) | **HOW MUCH** -- amounts encrypted on-chain | Requires SDK install |
| **Arcium** | Confidential transfers (`@arcium-hq/client`) | **HOW MUCH** -- encrypted amount display | SDK not yet available |
| **Range** | Compliance screening | Sanctions check before trading | Built-in (default) |
| **Helius** | Priority fee estimation | Optimal fees via `getPriorityFeeEstimate` | Auto-detected from RPC |

Ephemeral wallets and Range screening are on by default. Privacy Cash, ShadowWire, and Arcium are opt-in flags -- each requires its respective SDK to be installed. When an SDK is unavailable, the CLI reports it honestly and continues with the remaining layers.

---

## Quick Start

```bash
# Install
git clone https://github.com/Dinario-App/private-dca-toolkit.git
cd private-dca-toolkit
npm install
npm run build
npm link

# Configure
private-dca config set-wallet ~/.config/solana/id.json
private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

# Verify
private-dca config show
```

---

## Usage

### Single Swap with Privacy

```bash
# Swap SOL -> USDC with ephemeral wallet (on by default)
private-dca swap --from SOL --to USDC --amount 0.5

# Add ShadowWire amount encryption
private-dca swap --from SOL --to USDC --amount 0.5 --shadow

# Stack multiple layers
private-dca swap --from SOL --to USDC --amount 0.5 --zk --shadow
```

### Schedule Recurring DCA

```bash
# DCA $5 USDC -> SOL daily for 30 days
private-dca dca schedule \
  --from USDC --to SOL --amount 5 \
  --frequency daily --shadow \
  --executions 30
```

### Manage Schedules

```bash
# List active schedules
private-dca dca list

# Pause / resume / cancel
private-dca dca pause --id <schedule-id>
private-dca dca resume --id <schedule-id>
private-dca dca cancel --id <schedule-id>

# View execution history
private-dca dca history
```

---

## Privacy Flags

| Flag | Privacy Layer | What It Does |
|------|-------------|--------------|
| `--no-privacy` | Disable ephemeral | Use your real wallet directly (less private) |
| `--zk` | Privacy Cash | Deposit/withdraw through ZK anonymity pool |
| `--shadow` | ShadowWire | Encrypt amounts with Bulletproofs |
| `--private` | Arcium | Confidential transfer encryption |
| `--no-screen` | Range | Disable address compliance screening |

---

## Supported Tokens

SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA

Swaps powered by [Jupiter](https://jup.ag) DEX aggregation for best routes.

---

## Architecture

```
User Wallet (hidden)
      |
      v
+-------------------------+
|   Range Screening       |  <- Compliance check (sender + destination)
+----------+--------------+
           v
+-------------------------+
|   Balance Verification  |  <- Checks SOL + token balance before proceeding
+----------+--------------+
           v
+-------------------------+
|   Privacy Cash ZK Pool  |  <- Optional: anonymity set (hides WHO)
+----------+--------------+
           v
+-------------------------+
|   Ephemeral Wallet      |  <- Fresh keypair (breaks linkability)
+----------+--------------+
           v
+-------------------------+
|   Helius Fee Estimation |  <- Optimal priority fees via Helius RPC
+----------+--------------+
           v
+-------------------------+
|   Jupiter Swap          |  <- DEX sees ephemeral only
+----------+--------------+
           v
+-------------------------+
|   ShadowWire            |  <- Optional: Bulletproofs (hides HOW MUCH)
+----------+--------------+
           v
     User Wallet (output)
```

---

## Project Structure

```
src/
|-- cli.ts                         # Entry point
|-- commands/
|   |-- swap.ts                    # Single swap command
|   |-- dca.ts                     # DCA schedule management
|   +-- config.ts                  # Configuration
|-- services/
|   |-- swap-executor.service.ts   # Shared swap pipeline (all privacy layers)
|   |-- ephemeral.service.ts       # Ephemeral wallet generation + funding
|   |-- jupiter.service.ts         # Jupiter DEX integration
|   |-- helius.service.ts          # Helius priority fee estimation
|   |-- arcium.service.ts          # Arcium confidential transfers
|   |-- privacy-cash.service.ts    # Privacy Cash ZK pools
|   |-- shadowwire.service.ts      # ShadowWire Bulletproofs (Radr Labs)
|   |-- range.service.ts           # Range compliance screening
|   +-- scheduler.service.ts       # Cron-based DCA scheduling
|-- sdk/
|   |-- index.ts                   # Programmatic SDK
|   +-- types.ts                   # SDK types
|-- types/
|   +-- index.ts                   # Shared TypeScript interfaces
+-- utils/
    |-- wallet.ts                  # Wallet loading + config
    |-- logger.ts                  # CLI output formatting
    +-- ui.ts                      # CLI UI helpers
```

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests (126 passing)
npm test

# Dev mode (no build step)
npm run dev -- swap --help

# Link globally
npm link
private-dca --help
```

---

## Environment Variables

Copy `.env.example` to `.env`:

```bash
# Required
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=YOUR_KEY
WALLET_PATH=~/.config/solana/id.json

# Optional
RANGE_API_KEY=          # Range compliance screening
```

---

## Hackathon Bounties

Built for the **Solana Privacy Hackathon 2026**:

| Bounty | Integration | Details |
|--------|------------|---------|
| **Private Payments Track** | Ephemeral wallets | Fresh keypair per trade, auto rent recovery, account pooling for DCA |
| **Radr Labs / ShadowWire** | `@radr/shadowwire` | Bulletproof-encrypted amounts, deposit/transfer/withdraw flow |
| **Arcium** | `@arcium-hq/client` | RescueCipher encryption, graceful fallback when SDK unavailable |
| **Privacy Cash** | `privacycash` | ZK pool deposit/withdraw, SOL + SPL token support |
| **Helius** | Priority Fee API | `getPriorityFeeEstimate` for optimal fees, auto-detected from RPC URL |
| **Range** | Compliance API | `GET /v1/risk/address` screening for sender and destination addresses |

---

## Security

This is a hackathon project. **Not audited.** Use at your own risk.

- Never commit wallet keypairs or `.env` files
- Start with small amounts on mainnet
- Ephemeral wallets are destroyed after each trade
- All keys stay local -- nothing is sent to any server
- Balance verified before funding ephemeral wallets
- Destination addresses screened via Range before transfers

---

## License

MIT

---

**Built by [Dinario](https://github.com/Dinario-App) for the Solana Privacy Hackathon 2026**

*Your DCA. Your keys. Nobody's business.*
