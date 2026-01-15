# Private DCA Toolkit

> **Privacy-first Dollar Cost Averaging for Solana**

A CLI tool for executing private DCA (Dollar Cost Averaging) strategies on Solana with Arcium confidential transfers and Range compliance screening.

Built for the **Solana Privacy Hackathon 2026**.

## Features

- **Private Swaps**: Arcium C-SPL confidential transfers hide transaction amounts
- **DCA Scheduling**: Automated recurring swaps (hourly, daily, weekly, monthly)
- **Compliance Built-in**: Range API pre-screens all addresses
- **Jupiter Integration**: Best swap routes across Solana DEXes
- **Simple CLI**: Easy-to-use command line interface

## Installation

```bash
# Clone the repository
git clone https://github.com/web3sly/private-dca-toolkit.git
cd private-dca-toolkit

# Install dependencies
npm install

# Build
npm run build

# Link globally (optional)
npm link
```

## Quick Start

### 1. Configure your wallet

```bash
# Set your wallet keypair path
private-dca config set-wallet ~/.config/solana/id.json

# Set RPC endpoint (Helius recommended)
private-dca config set-rpc https://mainnet.helius-rpc.com/?api-key=YOUR_KEY

# Optional: Set Range API key for compliance screening
private-dca config set-range-key YOUR_RANGE_API_KEY

# View current config
private-dca config show
```

### 2. Execute a swap

```bash
# Simple swap: 1 SOL to USDC
private-dca swap --from SOL --to USDC --amount 1

# Private swap with Arcium confidential transfer
private-dca swap --from SOL --to USDC --amount 1 --private

# Swap with address screening
private-dca swap --from SOL --to USDC --amount 1 --screen

# Full privacy + compliance
private-dca swap --from SOL --to USDC --amount 1 --private --screen
```

### 3. Set up DCA schedule

```bash
# Daily DCA: Buy 10 USDC worth of SOL every day
private-dca dca schedule \
  --from USDC \
  --to SOL \
  --amount 10 \
  --frequency daily \
  --private

# Weekly DCA with limited executions
private-dca dca schedule \
  --from USDC \
  --to SOL \
  --amount 50 \
  --frequency weekly \
  --executions 12 \
  --private \
  --screen

# List all schedules
private-dca dca list

# Pause a schedule
private-dca dca pause --id abc123

# Resume a schedule
private-dca dca resume --id abc123

# Cancel a schedule
private-dca dca cancel --id abc123

# View execution history
private-dca dca history
```

## Commands

### `config`

Configure wallet and RPC settings.

| Subcommand | Description |
|------------|-------------|
| `set-wallet <path>` | Set path to Solana keypair JSON |
| `set-rpc <url>` | Set Solana RPC endpoint |
| `set-range-key <key>` | Set Range API key for compliance |
| `show` | Display current configuration |

### `swap`

Execute a single token swap.

| Option | Description |
|--------|-------------|
| `--from <token>` | Source token (SOL, USDC, USDT) |
| `--to <token>` | Destination token |
| `--amount <number>` | Amount to swap |
| `--private` | Use Arcium confidential transfer |
| `--screen` | Screen addresses with Range |
| `--slippage <bps>` | Slippage tolerance (default: 50) |

### `dca`

Manage DCA schedules.

| Subcommand | Description |
|------------|-------------|
| `schedule` | Create new DCA schedule |
| `list` | List all schedules |
| `pause --id <id>` | Pause a schedule |
| `resume --id <id>` | Resume a schedule |
| `cancel --id <id>` | Cancel a schedule |
| `execute --id <id>` | Execute immediately (testing) |
| `history` | View execution history |

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Private DCA Toolkit                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐              │
│  │  config  │    │   swap   │    │   dca    │              │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘              │
│       │               │               │                     │
│       └───────────────┴───────────────┘                     │
│                       │                                      │
│  ┌────────────────────┴─────────────────────┐               │
│  │              Service Layer               │               │
│  ├─────────────┬─────────────┬─────────────┤               │
│  │  Jupiter    │   Arcium    │   Range     │               │
│  │  Service    │   Service   │   Service   │               │
│  └──────┬──────┴──────┬──────┴──────┬──────┘               │
│         │             │             │                       │
│  ┌──────┴──────┐ ┌────┴────┐ ┌──────┴──────┐               │
│  │ Jupiter API │ │ Arcium  │ │  Range API  │               │
│  │ (Swaps)     │ │ MPC/MXE │ │ (Screening) │               │
│  └─────────────┘ └─────────┘ └─────────────┘               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Privacy Model

### Confidential Transfers (Arcium C-SPL)

When `--private` is enabled:

1. **Amount Encryption**: Transfer amount is encrypted using Arcium MPC
2. **On-chain Privacy**: Explorers show `[ENCRYPTED]` instead of amount
3. **Selective Disclosure**: Only sender and recipient can decrypt
4. **Compliance Ready**: Amounts can be disclosed to regulators if required

### Address Screening (Range)

When `--screen` is enabled:

1. **Pre-transaction Check**: Addresses screened before execution
2. **Risk Assessment**: Low/Medium/High/Severe risk levels
3. **Sanctions Blocking**: Sanctioned addresses blocked automatically
4. **Audit Trail**: All screening results logged

## Supported Tokens

| Token | Mint Address |
|-------|--------------|
| SOL | `So11111111111111111111111111111111111111112` |
| USDC | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| USDT | `Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB` |

## Environment Variables

```bash
# Optional: Override config file settings
PRIVATE_DCA_WALLET_PATH=/path/to/keypair.json
PRIVATE_DCA_RPC_URL=https://your-rpc-endpoint
PRIVATE_DCA_RANGE_API_KEY=your-range-key
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Run tests
npm test
```

## Hackathon Bounties

This project targets the following bounties:

| Bounty | Prize |
|--------|-------|
| Private Payments Track | $15,000 |
| Arcium Bounty | $10,000 |
| Helius Bounty | $5,000 |
| Range Bounty | $1,500+ |

## Related Projects

- [Dinario](https://dinario.app) - Privacy-first fintech for Latin America
- [dinario-latam](https://github.com/dinario/dinario-latam) - Mobile app

## License

MIT

---

**Built for the Solana Privacy Hackathon 2026**
