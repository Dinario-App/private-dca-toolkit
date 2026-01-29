# Private DCA Toolkit - Claude Code Context

## Quick Reference

| Item | Value |
|------|-------|
| **What** | Privacy-first DCA CLI for Solana (hackathon submission) |
| **Hackathon** | Solana Privacy Hackathon 2026 |
| **Stack** | TypeScript + Node.js CLI |
| **Distribution** | npm package (`@dinario/private-dca-toolkit`) |

---

## Verification Commands (ALWAYS RUN)

```bash
# After ANY code changes
npm run build

# Type check
npx tsc --noEmit

# Test CLI
npm run dev -- --help

# Before saying "done"
# 1. Type check passes
# 2. Build succeeds
# 3. CLI command works
```

---

## Never Do

- Don't run `npm run dev` without arguments - needs a command
- Don't use `@solana/kit` here - this project uses `@solana/web3.js` (legacy)
- Don't add UI/frontend code - this is CLI only
- Don't skip ephemeral wallet cleanup on errors
- Don't log private keys or seed phrases
- Don't commit .env or config with API keys

---

## Project Gotchas

### This is a CLI Tool
- Built with Commander.js
- Entry point: `src/cli.ts`
- Commands in `src/commands/`
- No frontend, no React, no web

### Privacy Architecture
```
User Wallet (hidden)
      ↓
Ephemeral Wallet (fresh keypair per trade)
      ↓
Jupiter Swap (DEX sees ephemeral only)
      ↓
Output → User or destination
```

### Privacy Levels
| Flag | What It Does |
|------|--------------|
| `--ephemeral` | Fresh keypair per trade |
| `--zk` | Privacy Cash ZK pool (Node 24+ required) |
| `--shadow` | ShadowWire Bulletproofs (Radr Labs) |
| `--private` | Arcium encrypted display |
| `--screen` | Range compliance check |

### Key Integrations
| Service | Purpose | Package |
|---------|---------|---------|
| Jupiter | DEX aggregation | `@jup-ag/api` |
| Arcium | Confidential transfers | `@arcium-hq/client` |
| Privacy Cash | ZK pools | `privacycash` |
| ShadowWire | Bulletproofs encryption | `@radr/shadowwire` |
| Range | Compliance screening | API calls |

### Token Support
SOL, USDC, USDT, BONK, WIF, JUP, RAY, ORCA

---

## Key Structure

```
src/
├── cli.ts              # Entry point
├── commands/
│   ├── swap.ts         # Single swap command
│   ├── dca.ts          # DCA schedule management
│   └── config.ts       # Configuration
├── services/
│   ├── ephemeral.ts    # Ephemeral wallet generation
│   ├── jupiter.ts      # Jupiter swap integration
│   ├── arcium.ts       # Arcium confidential transfers
│   ├── privacycash.ts  # ZK pool integration
│   ├── shadowwire.ts   # Bulletproofs encryption
│   ├── range.ts        # Compliance screening
│   └── helius.ts       # Priority fee estimation
├── types/
└── utils/
```

---

## Hackathon Bounties

| Bounty | Prize | Status |
|--------|-------|--------|
| Private Payments Track | $15,000 | Target |
| Radr Labs (ShadowWire) | $15,000 | Target |
| Arcium | $10,000 | Target |
| Privacy Cash | $6,000 | Target |
| Helius | $5,000 | Target |
| Range | $1,500+ | Target |

---

## Environment Variables

```bash
# Required
SOLANA_RPC_URL=https://mainnet.helius-rpc.com/?api-key=...
WALLET_PATH=~/.config/solana/id.json

# Optional
RANGE_API_KEY=...        # For compliance screening
HELIUS_API_KEY=...       # For priority fees
```

---

## Self-Documenting Gotchas

**Claude: When you make a mistake in this project, ADD IT here.**

| Situation | Action |
|-----------|--------|
| Build failure | Add pattern to avoid |
| Privacy leak | Document fix in Security section |
| Integration error | Add to relevant service notes |

---

## Mistake Log

<!-- Claude: Add dated entries. Format: YYYY-MM-DD: What went wrong → Fix -->

_No entries yet._

---

*Created: 2026-01-29*
