# Private DCA Toolkit — Demo Recording Script

## Setup (run once before recording)

    export NODE_OPTIONS='--no-deprecation'

---

## Scene 1: Who We Are

**SAY:** "Hey — we're Dinario. We're building privacy-first financial tools for Solana. Our mission is simple: your money, your business. Today I'm going to show you what we built for the Solana Privacy Hackathon — the Private DCA Toolkit."

---

## Scene 2: What We Built

**SAY:** "Private DCA is a command-line tool that lets you dollar-cost average into any Solana token — with privacy baked into every layer. Non-custodial, you control your keys, and it stacks multiple privacy technologies into one simple interface. Let's take a look."

    private-dca --help

---

## Scene 3: Configuration

**SAY:** "We've got our wallet connected to Solana mainnet through Helius RPC. Everything runs locally — no servers, no accounts, no sign-ups."

    private-dca config show

---

## Scene 4: Privacy Swap

**SAY:** "Let's do a live swap on mainnet. We're swapping SOL to USDC with the full privacy stack. Ephemeral wallet breaks on-chain linkability — the DEX never sees your real wallet. ShadowWire encrypts the transaction amount using Bulletproofs from Radr Labs. And Arcium adds confidential transfer encryption. Watch the privacy score."

    private-dca swap --from SOL --to USDC --amount 0.005 --ephemeral --shadow --private --slippage 300

---

## Scene 5: DCA Schedule

**SAY:** "That was a single swap. But the real value is set-it-and-forget-it DCA. Let's say you want to stack SOL every day using USDC. We create a daily schedule — buy SOL every day for 30 days, with ephemeral wallets and ShadowWire encryption on every execution. Each trade uses a fresh wallet that gets destroyed after."

    private-dca dca schedule --from USDC --to SOL --amount 5 --frequency daily --ephemeral --shadow --executions 30

---

## Scene 6: List Schedules

**SAY:** "We can check all our active schedules. The lock icon means privacy is on."

    private-dca dca list

---

## Scene 7: Closing

**SAY:** "That's Private DCA by Dinario. Ephemeral wallets hide who you are. ShadowWire Bulletproofs hide how much. Arcium encrypts the rest. Your DCA, your keys, nobody's business. Thank you."
