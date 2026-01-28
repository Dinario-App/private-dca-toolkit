# Private DCA Toolkit - Demo Video Script

**Duration:** 3 minutes max
**Format:** Screen recording with voice-over

---

## Scene 1: The Problem (0:00 - 0:30)

**Visuals:** Show Jupiter DCA Tracker (dca.jup.ag) or similar on-chain analytics

**Script:**
> "Standard DCA services on Solana expose everything on-chain. Anyone can see your wallet, your amounts, your timing, and your total position. Services like Jupiter DCA Tracker make it trivial to identify whale activity and front-run trades.
>
> Private DCA breaks this surveillance."

**Action:** Show example of whale DCA being tracked

---

## Scene 2: The Solution (0:30 - 1:00)

**Visuals:** Terminal showing CLI help

**Script:**
> "Private DCA Toolkit is a CLI that executes DCA strategies with privacy. It uses ephemeral wallets - fresh keypairs for each trade that are discarded after use. Your main wallet never touches the DEX."

**Commands to show:**
```bash
private-dca --help
private-dca swap --help
```

**Action:** Show the privacy levels table from README

---

## Scene 3: Live Demo - Private Swap (1:00 - 1:45)

**Visuals:** Terminal executing a swap

**Script:**
> "Let's execute a private swap. We're swapping 0.1 SOL to USDC using an ephemeral wallet."

**Command:**
```bash
private-dca swap --from SOL --to USDC --amount 0.1 --ephemeral
```

**Expected Output:**
```
═══════════════════════════════════════════════════════
Private DCA Swap
═══════════════════════════════════════════════════════
From             : 0.1 SOL
To               : USDC
Ephemeral        : Yes (privacy mode)

✓ Generating ephemeral wallet... 7xKm...
✓ Funding ephemeral wallet...
✓ Getting swap quote...
✓ Executing swap from ephemeral...
✓ Sending output to your wallet...
✓ Recovering dust...

✓ Swap completed successfully!
Transaction: 4vNx...

Privacy: Your main wallet is not visible on-chain for this swap
```

**Action:** Point out that ephemeral wallet is shown, not user wallet

---

## Scene 4: ZK Pool Privacy (1:45 - 2:15)

**Visuals:** Terminal showing ZK swap

**Script:**
> "For maximum privacy, we can use Privacy Cash ZK pools. This adds an anonymity set - your funds become indistinguishable from other pool participants."

**Command:**
```bash
private-dca swap --from SOL --to USDC --amount 0.5 --zk --screen
```

**Expected Output:**
```
═══════════════════════════════════════════════════════
Private DCA Swap
═══════════════════════════════════════════════════════
From             : 0.5 SOL
To               : USDC
ZK Pool          : Yes (maximum privacy)
Screening        : Enabled

Privacy Score    : 80/100
  - Non-custodial: you control your keys
  - Ephemeral wallet breaks on-chain linkability
  - Range screening ensures compliant counterparties
  - Privacy Cash ZK pool provides anonymity set

✓ Screening passed (Risk: low)
✓ Depositing to Privacy Cash ZK pool...
  Commitment: 0x3f7a2c8b9d1e4f...
✓ Withdrawing from ZK pool to ephemeral...
✓ ZK pool deposit → withdraw complete
  Funds now at ephemeral: 9xLp...
✓ Executing swap from ephemeral...
✓ Sending output to your wallet...

✓ Swap completed successfully!

Privacy: Your main wallet is not visible on-chain for this swap
ZK Privacy: Funds passed through Privacy Cash anonymity set
```

---

## Scene 5: DCA Scheduling (2:15 - 2:45)

**Visuals:** Terminal showing DCA schedule

**Script:**
> "Private DCA also supports scheduled executions. Set up a weekly DCA with privacy enabled, and each execution uses a fresh ephemeral wallet automatically."

**Command:**
```bash
private-dca dca schedule \
  --from USDC --to SOL --amount 50 \
  --frequency weekly --zk

private-dca dca list
```

**Action:** Show the schedule being created with ZK Pool indicator

---

## Scene 6: Call to Action (2:45 - 3:00)

**Visuals:** GitHub repo, Dinario logo

**Script:**
> "Private DCA Toolkit is open source and built for the Solana Privacy Hackathon. Try it at github.com/dinarioapp/private-dca-toolkit, or use the integrated version at dinario.app.
>
> Your trades. Your privacy. Your choice."

**Action:** Show QR code or link

---

## Technical Notes for Recording

1. **Environment:**
   - Clean terminal with large font
   - Dark theme recommended
   - Pre-configure wallet and RPC

2. **Pre-run commands:**
   ```bash
   private-dca config set-wallet ~/.config/solana/demo-wallet.json
   private-dca config set-rpc "https://mainnet.helius-rpc.com/?api-key=XXX"
   ```

3. **Backup plan:**
   - If mainnet swap fails, use devnet
   - If ZK unavailable (Node < 24), simulated flow still demos the concept

4. **Key points to emphasize:**
   - Ephemeral wallet address shown, not user wallet
   - "Your main wallet is not visible" message
   - Privacy Score calculation
   - ZK pool commitment hash

---

## Bounty Targets Demonstrated

| Bounty | Feature Shown |
|--------|---------------|
| Private Payments Track ($15K) | Ephemeral wallet flow |
| Arcium ($10K) | --private flag (encrypted amounts) |
| Privacy Cash ($6K) | --zk flag (ZK pool) |
| Helius ($5K) | Priority fees (if using Helius RPC) |
| Range ($1.5K) | --screen flag (compliance) |
| Encrypt.trade ($1K) | This script + docs |

---

*Built for Solana Privacy Hackathon 2026 by Dinario*
