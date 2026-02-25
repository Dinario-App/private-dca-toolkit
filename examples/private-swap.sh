#!/bin/bash
# Private Swap Example - Arcium encryption
#
# Swaps SOL to USDC with:
# - Ephemeral wallet (on by default — breaks on-chain linkability)
# - Arcium confidential transfer (encrypted amount display)

# Ensure you've configured the CLI first:
# private-dca config set-wallet ~/.config/solana/id.json
# private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

private-dca swap \
  --from SOL \
  --to USDC \
  --amount 0.1 \
  --private \
  --slippage 100
