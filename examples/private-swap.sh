#!/bin/bash
# Private Swap Example - Ephemeral wallet for privacy
#
# This example shows a swap using an ephemeral wallet
# Your main wallet is NOT directly linked to the DEX trade

# Ensure you've configured the CLI first:
# private-dca config set-wallet ~/.config/solana/id.json
# private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

echo "=== Private Swap Example ==="
echo "Swapping 0.1 SOL for USDC using ephemeral wallet"
echo ""
echo "Privacy Flow:"
echo "1. Generate fresh ephemeral wallet"
echo "2. Fund ephemeral with SOL"
echo "3. Execute swap FROM ephemeral (your wallet not visible)"
echo "4. Send USDC to your wallet"
echo "5. Recover remaining SOL"
echo ""

private-dca swap \
  --from SOL \
  --to USDC \
  --amount 0.1 \
  --ephemeral \
  --slippage 100

echo ""
echo "Private trade completed!"
echo "Your main wallet is NOT visible in the Jupiter swap transaction."
