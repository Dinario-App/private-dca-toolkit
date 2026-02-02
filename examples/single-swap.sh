#!/bin/bash
# Single Swap Example - Basic token swap
#
# Swaps SOL to USDC with privacy on by default (ephemeral wallet).
# To disable privacy: add --no-privacy

# Ensure you've configured the CLI first:
# private-dca config set-wallet ~/.config/solana/id.json
# private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

private-dca swap \
  --from SOL \
  --to USDC \
  --amount 0.1 \
  --slippage 100
