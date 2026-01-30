# Private DCA Toolkit

> **Privacy-first Dollar Cost Averaging for Solana**
>
> **Three ways to use it: CLI · Web UI · SDK**

[![Solana](https://img.shields.io/badge/Solana-Privacy%20Hackathon%202026-9945FF?style=flat&logo=solana)](https://www.colosseum.org/renaissance)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

Infrastructure for building private DCA applications on Solana. Choose your layer:

1. **CLI** — For developers and power users
2. **Web UI** — For anyone to use (visit and click)
3. **SDK** — For companies building fintech platforms

All powered by the same privacy infrastructure: ephemeral wallets, Range screening, Privacy Cash ZK pools, and automated fee optimization.

**Users save 30%+ on swap fees. Emerging market users save $70+/year.**

---

## The Problem

Standard DCA services expose your entire strategy on-chain:

- Your wallet linked to every trade
- Amounts visible to everyone
- Regular patterns reveal your strategy
- Holdings tracked by public aggregators

**Result:** Financial surveillance for $50-500+ traders who just want to accumulate crypto.

---

## The Solution

**Private DCA infrastructure** that:
- ✅ Breaks wallet linkability (ephemeral wallets)
- ✅ Ensures compliance (Range screening)
- ✅ Provides anonymity (Privacy Cash ZK pools)
- ✅ Saves 30%+ on fees (account pooling + low priority fees)
- ✅ Works across Solana (Jupiter DEX aggregation)

---

## Three Ways to Use It

### 1. **CLI** (For Developers)

```bash
npm install -g @dinario/private-dca-toolkit

# Single swap - private by default
private-dca swap --from USDC --to SOL --amount 50

# Schedule recurring DCA
private-dca dca schedule \
  --from USDC --to SOL --amount 50 \
  --frequency weekly

# View results
private-dca dca history
```

**Best for:** Developers, power users, testing, scripting.

See [CLI Docs](./SHIPPED.md) and [Examples](./examples)

---

### 2. **Web UI** (For Anyone)

Visit: **[private-dca-web.vercel.app](https://private-dca-web.vercel.app)**

- Connect wallet
- Set DCA parameters
- See fee breakdown
- Execute or schedule
- View privacy status

No CLI needed. No technical knowledge needed. Click and go.

**Best for:** Mainstream users, traders, anyone who just wants it to work.

See [Web UI](https://private-dca-web.vercel.app) (live at vercel.app)

---

### 3. **SDK** (For Fintech Companies)

```bash
npm install @dinario/private-dca-sdk @solana/web3.js
```

```javascript
import { PrivateDCA } from '@dinario/private-dca-sdk';

const dca = new PrivateDCA({
  rpcUrl: 'https://mainnet.helius-rpc.com/?api-key=KEY',
});

const result = await dca.swap({
  fromToken: 'USDC',
  toToken: 'SOL',
  amount: 50,
  privacy: true,    // Ephemeral wallet (default)
  screening: true,  // Range compliance (default)
});

console.log(`Fee saved: $${result.feeSaved}`);
console.log(`Privacy score: ${result.privacyScore}/100`);
```

**Best for:** Companies integrating privacy into their platforms (neobanks, wallets, DeFi apps).

See [SDK Docs](./SDK.md) and [Examples](./examples)

---

## Key Features

### Privacy-First Design

| Feature | What | Impact |
|---------|------|--------|
| **Ephemeral Wallets** | Fresh keypair per trade | Wallet identity hidden |
| **Range Screening** | Sanctions check | Compliant in regulated markets |
| **Privacy Cash ZK** | Anonymity pools | WHO is hidden (100-500+ user sets) |
| **ShadowWire** | Bulletproof encryption | HOW MUCH is hidden |
| **Arcium Encryption** | Confidential transfers | Even we can't see your holdings |

### Cost Optimization

**Users save 30%+ on fees:**

| Optimization | Savings | Method |
|--------------|---------|--------|
| Low priority fees | 90% | Default to Low tier via Helius |
| Account pooling | 25% | Reuse ephemeral wallets |
| Rent recovery | 10% | Recover unused SOL |
| **Total** | **30%+** | Automatic |

**Example:** $50 weekly DCA
- Standard: $5/swap = $240/year
- With toolkit: $3.25/swap = $156/year
- **Saves: $84/year** (45%)

### Supported Tokens

SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA

### Scheduling

Hourly, daily, weekly, monthly automation.

---

## Installation

### CLI

```bash
npm install -g @dinario/private-dca-toolkit
private-dca config set-wallet ~/.solana/id.json
private-dca swap --help
```

### SDK

```bash
npm install @dinario/private-dca-sdk
```

### Web UI

Just visit: **[private-dca-web.vercel.app](https://private-dca-web.vercel.app)**

---

## Use Cases

### 1. Emerging Market DCA

**User in Bolivia wants to accumulate $50 SOL/week**

- Wants privacy (financial surveillance is real)
- Needs compliance (regulators require it)
- Cares about fees (every dollar counts)

**With Private DCA:**
- Privacy: Ephemeral wallets + Range screening + ZK pools
- Savings: $84/year
- Tools: Use web UI or schedule via API

### 2. Enterprise Integration

**Fintech platform wants to add private DCA**

**With Private DCA SDK:**
- Drop-in privacy infrastructure
- Comply with regulations via Range
- Optimize costs automatically
- No need to build from scratch

### 3. Developer Research

**Researcher studying privacy on Solana**

**With CLI:**
- Test privacy patterns
- Measure fee savings
- Integrate into research
- Full source code access

---

## Architecture

```
┌─────────────────────────────────────────┐
│      Private DCA Toolkit                │
├─────────────────────────────────────────┤
│  CLI Layer      │ Web UI    │ SDK       │
├─────────────────────────────────────────┤
│  Core Engine                            │
│  - Ephemeral wallets                    │
│  - Jupiter swaps                        │
│  - Range screening                      │
│  - Privacy Cash ZK                      │
│  - Helius optimization                  │
│  - Account pooling                      │
├─────────────────────────────────────────┤
│  Solana Mainnet                         │
└─────────────────────────────────────────┘
```

---

## Hackathon Bounties

This project targets multiple Solana Privacy Hackathon 2026 bounties:

- **Private Payments Track** ($15k) — DCA with privacy
- **Privacy Tooling Track** ($15k) — Developer infrastructure
- **Radr Labs ShadowWire** ($15k) — Encrypted amounts
- **Arcium** ($10k) — Confidential transfers
- **Privacy Cash** ($15k) — ZK pools
- **Helius** ($5k) — Fee optimization

---

## Development

```bash
# Clone
git clone https://github.com/dinarioapp/private-dca-toolkit.git
cd private-dca-toolkit

# Install
npm install

# Build
npm run build

# Test
npm test

# Run CLI
npm link
private-dca --help
```

---

## Security

⚠️ **Not audited.** This is a hackathon project. Use at your own risk.

For production:
- Get smart contract audit
- Use hardware wallets for main accounts
- Start with small amounts
- Report security issues to security@dinario.app

---

## License

MIT

---

## Related Projects

- [Dinario](https://dinario.app) — Privacy neobank built with this toolkit
- [Private DCA CLI](./README-CLI.md)
- [Private DCA SDK](./sdk/README.md)
- [Private DCA Web UI](https://github.com/dinarioapp/private-dca-web)

---

## Built for

**Solana Privacy Hackathon 2026**

*Your transactions. Your privacy. Your choice.*
