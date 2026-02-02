# Private DCA Toolkit

> Privacy-first Dollar Cost Averaging for Solana

[![Solana](https://img.shields.io/badge/Solana-Privacy%20Hackathon%202026-9945FF?style=flat&logo=solana)](https://solana.com/privacyhack)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js)](https://nodejs.org)

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

Private DCA stacks five privacy technologies into one CLI:

| Layer | Technology | What It Hides |
|-------|-----------|---------------|
| **Ephemeral Wallets** | Fresh keypair per trade | **WHO** — DEX never sees your real wallet |
| **Privacy Cash ZK** | Zero-knowledge pools | **WHO** — funds mixed in anonymity set |
| **ShadowWire** | Bulletproofs (Radr Labs) | **HOW MUCH** — amounts encrypted on-chain |
| **Arcium** | Confidential transfers | **HOW MUCH** — encrypted amount display |
| **Range** | Compliance screening | Sanctions check before trading |

Each layer is opt-in. Stack them for maximum privacy or use individually.

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
# Swap SOL → USDC with ShadowWire + Arcium (ephemeral wallet is on by default)
private-dca swap \
  --from SOL --to USDC --amount 0.5 \
  --shadow --private
```

Output:

```
Private DCA Swap

  From: 0.5 SOL
  To: USDC
  Ephemeral: Yes (privacy mode)
  ShadowWire: Yes (encrypted amounts)
  Confidential: 🔒 PRIVATE

  Privacy Score: 70/100
  - Non-custodial: you control your keys
  - Ephemeral wallet breaks on-chain linkability
  - ShadowWire Bulletproofs encrypts amounts (hides HOW MUCH)

✔ Ephemeral wallet: 4wDMeRpx...
✔ Ephemeral funded
✔ Route found
✔ Swap executed
✔ Output sent to CQhtHr6j...
✔ Dust recovered
✔ Amount encrypted: [RESCUE: 0x6bc5023b7a5...]
✔ ShadowWire: amount encrypted with Bulletproofs (hidden)

✓ Swap completed successfully!
✓ Transaction: yD3ysZba...
```

### Schedule Recurring DCA

```bash
# DCA $5 USDC → SOL daily for 30 days with ShadowWire encryption
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

Combine them:

```bash
# Maximum privacy: all layers (ephemeral is already on by default)
private-dca swap --from SOL --to USDC --amount 1 \
  --zk --shadow --private
```

---

## Supported Tokens

SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA

Swaps powered by [Jupiter](https://jup.ag) DEX aggregation for best routes.

---

## Architecture

```
User Wallet (hidden)
      │
      ▼
┌─────────────────────────┐
│   Range Screening       │  ← Compliance check
└─────────┬───────────────┘
          ▼
┌─────────────────────────┐
│   Privacy Cash ZK Pool  │  ← Anonymity set (hides WHO)
└─────────┬───────────────┘
          ▼
┌─────────────────────────┐
│   Ephemeral Wallet      │  ← Fresh keypair (breaks linkability)
└─────────┬───────────────┘
          ▼
┌─────────────────────────┐
│   Jupiter Swap          │  ← DEX sees ephemeral only
└─────────┬───────────────┘
          ▼
┌─────────────────────────┐
│   ShadowWire            │  ← Bulletproofs (hides HOW MUCH)
│   Arcium Encryption     │  ← Confidential transfer
└─────────┬───────────────┘
          ▼
    User Wallet (output)
```

---

## Project Structure

```
src/
├── cli.ts                    # Entry point
├── commands/
│   ├── swap.ts               # Single swap command
│   ├── dca.ts                # DCA schedule management
│   └── config.ts             # Configuration
├── services/
│   ├── ephemeral.service.ts  # Ephemeral wallet generation + funding
│   ├── jupiter.service.ts    # Jupiter DEX integration
│   ├── arcium.service.ts     # Arcium confidential transfers
│   ├── privacy-cash.service.ts  # Privacy Cash ZK pools
│   ├── shadowwire.service.ts # ShadowWire Bulletproofs (Radr Labs)
│   ├── range.service.ts      # Range compliance screening
│   └── scheduler.service.ts  # Cron-based DCA scheduling
├── types/
│   └── index.ts              # TypeScript interfaces
└── utils/
    ├── wallet.ts             # Wallet loading + config
    └── logger.ts             # CLI output formatting
```

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
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

| Bounty | Integration |
|--------|------------|
| **Private Payments Track** | Privacy-first DCA infrastructure |
| **Radr Labs / ShadowWire** | Bulletproofs amount encryption via `@radr/shadowwire` |
| **Arcium** | Confidential transfers via `@arcium-hq/client` |
| **Privacy Cash** | ZK pool anonymity sets via `privacycash` |
| **Helius** | RPC + priority fee estimation |

---

## Security

This is a hackathon project. **Not audited.** Use at your own risk.

- Never commit wallet keypairs or `.env` files
- Start with small amounts on mainnet
- Ephemeral wallets are destroyed after each trade
- All keys stay local — nothing is sent to any server

---

## License

MIT

---

**Built by [Dinario](https://github.com/Dinario-App) for the Solana Privacy Hackathon 2026**

*Your DCA. Your keys. Nobody's business.*
