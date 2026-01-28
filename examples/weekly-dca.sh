#!/bin/bash
# Weekly DCA Example - Scheduled token purchases
#
# This example sets up a weekly DCA schedule
# Buys $50 worth of SOL every week using USDC

# Ensure you've configured the CLI first:
# private-dca config set-wallet ~/.config/solana/id.json
# private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=YOUR_KEY"

echo "=== Weekly DCA Example ==="
echo "Setting up: $50 USDC → SOL every week"
echo ""

private-dca dca schedule \
  --from USDC \
  --to SOL \
  --amount 50 \
  --frequency weekly \
  --slippage 100

echo ""
echo "DCA schedule created!"
echo ""
echo "View your schedules:"
echo "  private-dca dca list"
echo ""
echo "Execute immediately (for testing):"
echo "  private-dca dca execute --id <first-8-chars>"
echo ""
echo "View execution history:"
echo "  private-dca dca history"
