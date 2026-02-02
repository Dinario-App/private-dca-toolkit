#!/bin/bash
# Maximum Privacy Example - All privacy layers
#
# Swaps SOL to USDC with every privacy feature enabled:
# - Ephemeral wallet (on by default — DEX never sees your real wallet)
# - Privacy Cash ZK pool (anonymity set — hides WHO you are)
# - ShadowWire Bulletproofs (hides HOW MUCH)
# - Arcium confidential transfer (encrypted amounts)
#
# Requirements:
# - Node.js 24+ (for Privacy Cash ZK pool)
# - npm install privacycash @radr/shadowwire @arcium-hq/client

# Ensure you've configured the CLI first:
# private-dca config set-wallet ~/.config/solana/id.json
# private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

private-dca swap \
  --from SOL \
  --to USDC \
  --amount 1 \
  --zk \
  --shadow \
  --private \
  --slippage 100
