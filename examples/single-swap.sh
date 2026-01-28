#!/bin/bash
# Single Swap Example - Basic token swap
#
# This example shows a simple swap from SOL to USDC
# No privacy features - the trade is fully visible on-chain

# Ensure you've configured the CLI first:
# private-dca config set-wallet ~/.config/solana/id.json
# private-dca config set-rpc "https://api.mainnet-beta.solana.com"

echo "=== Single Swap Example ==="
echo "Swapping 0.1 SOL for USDC (no privacy)"
echo ""

private-dca swap \
  --from SOL \
  --to USDC \
  --amount 0.1 \
  --slippage 100

echo ""
echo "Trade completed! Check Solscan for details."
