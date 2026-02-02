#!/bin/bash
# Private Swap Example - ShadowWire + Arcium encryption
#
# Swaps SOL to USDC with:
# - Ephemeral wallet (on by default — breaks on-chain linkability)
# - ShadowWire Bulletproofs (encrypts transaction amount)
# - Arcium confidential transfer (encrypted amount display)

# Ensure you've configured the CLI first:
# private-dca config set-wallet ~/.config/solana/id.json
# private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

private-dca swap \
  --from SOL \
  --to USDC \
  --amount 0.1 \
  --shadow \
  --private \
  --slippage 100
