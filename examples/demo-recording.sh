#!/bin/bash
# ============================================================
# DEMO RECORDING SCRIPT — Private DCA Toolkit
# ============================================================
# Run each section one at a time. Narration is in the comments.
#
# Before starting:
#   export NODE_OPTIONS='--no-deprecation'
#   cd /Users/dinario/private-dca-toolkit
# ============================================================

# ------------------------------------------------------------
# SCENE 1: INTRO
# ------------------------------------------------------------
# SAY: "This is Private DCA — a command-line toolkit for
#       dollar-cost averaging on Solana with built-in privacy.
#       Let me show you what it can do."
#
# RUN:
private-dca --help


# ------------------------------------------------------------
# SCENE 2: CONFIGURATION
# ------------------------------------------------------------
# SAY: "First, let's look at our configuration. We have a
#       Solana wallet connected to mainnet via Helius RPC."
#
# RUN:
private-dca config show


# ------------------------------------------------------------
# SCENE 3: PRIVACY SWAP
# ------------------------------------------------------------
# SAY: "Now let's execute a swap with full privacy enabled.
#       We're swapping SOL to USDC using an ephemeral wallet
#       to break on-chain linkability, ShadowWire Bulletproofs
#       to encrypt the transaction amount, Arcium for
#       confidential transfer encryption, and Range for
#       compliance screening. Watch the privacy score."
#
# RUN:
private-dca swap \
  --from SOL \
  --to USDC \
  --amount 0.005 \
  --ephemeral \
  --shadow \
  --private \
  --screen \
  --slippage 300


# ------------------------------------------------------------
# SCENE 4: DCA SCHEDULE
# ------------------------------------------------------------
# SAY: "That was a one-time swap. But the real power is
#       automated DCA. Let's set up a daily schedule that
#       buys USDC with the same privacy stack — ephemeral
#       wallets and ShadowWire — every single day for 30 days."
#
# RUN:
private-dca dca schedule \
  --from SOL \
  --to USDC \
  --amount 0.1 \
  --frequency daily \
  --ephemeral \
  --shadow \
  --screen \
  --executions 30


# ------------------------------------------------------------
# SCENE 5: LIST SCHEDULES
# ------------------------------------------------------------
# SAY: "We can see all active DCA schedules at a glance.
#       The lock icon means privacy is enabled."
#
# RUN:
private-dca dca list


# ------------------------------------------------------------
# SCENE 6: HISTORY
# ------------------------------------------------------------
# SAY: "And we can review the full execution history —
#       every swap, every transaction, all tracked."
#
# RUN:
private-dca dca history


# ------------------------------------------------------------
# SCENE 7: CLOSING
# ------------------------------------------------------------
# SAY: "That's Private DCA. Non-custodial, privacy-first
#       dollar-cost averaging on Solana. Ephemeral wallets
#       hide who you are. ShadowWire hides how much.
#       Arcium encrypts everything. And Range keeps it
#       compliant. All from the command line."
# ------------------------------------------------------------
