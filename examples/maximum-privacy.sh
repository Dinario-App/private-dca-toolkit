#!/bin/bash
# Maximum Privacy Example - All privacy features enabled
#
# This example demonstrates the full privacy stack:
# - Privacy Cash ZK pool (anonymity set - funds become indistinguishable)
# - Ephemeral wallet (breaks on-chain linkability)
# - Arcium confidential transfer (encrypted amounts)
# - Range compliance screening (blocks sanctioned addresses)

# REQUIREMENTS:
# 1. Wallet configured: private-dca config set-wallet ~/.config/solana/id.json
# 2. Helius RPC (for priority fees): private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"
# 3. Range API key (optional): private-dca config set-range-key "YOUR_RANGE_KEY"
# 4. Node.js 24+ (for ZK pool features)

echo "=== Maximum Privacy Example ==="
echo ""
echo "Privacy Features Enabled:"
echo "  --zk         : Privacy Cash ZK pool (anonymity set)"
echo "  --private    : Arcium encryption (amounts encrypted)"
echo "  --screen     : Range compliance (blocks sanctioned addresses)"
echo ""
echo "Node.js version: $(node --version)"
echo ""
echo "Swapping 1 SOL for USDC with maximum privacy"
echo ""

private-dca swap \
  --from SOL \
  --to USDC \
  --amount 1 \
  --zk \
  --private \
  --screen \
  --slippage 100

echo ""
echo "Maximum privacy trade completed!"
echo ""
echo "What's hidden:"
echo "  - Your wallet is not visible in the Jupiter swap"
echo "  - Funds passed through ZK anonymity set (indistinguishable)"
echo "  - Transaction amounts displayed as [ENCRYPTED: 0x...]"
echo "  - Compliant counterparties verified via Range"
echo ""
echo "Chain analysis sees:"
echo "  - YourWallet → [ZK POOL] → EphemeralWallet → DEX → EphemeralWallet → YourWallet"
echo "  - The ZK pool breaks ALL linkability between your deposit and withdrawal"
