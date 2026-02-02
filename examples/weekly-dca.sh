#!/bin/bash
# Weekly DCA Example - Scheduled token purchases
#
# Sets up a weekly DCA: $50 USDC → SOL
# Ephemeral wallet is on by default for each execution.

# Ensure you've configured the CLI first:
# private-dca config set-wallet ~/.config/solana/id.json
# private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

private-dca dca schedule \
  --from USDC \
  --to SOL \
  --amount 50 \
  --frequency weekly \
  --shadow \
  --slippage 100

echo ""
echo "View your schedules:  private-dca dca list"
echo "Execute now:          private-dca dca execute --id <id>"
echo "View history:         private-dca dca history"
