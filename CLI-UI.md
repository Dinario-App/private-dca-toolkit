# Private DCA CLI - Beautiful Terminal UI

The CLI features a stunning, professional terminal UI built with `chalk` and custom UI utilities. Everything is color-coded, well-formatted, and easy to read.

## Features

### 1. **Styled Headers & Alerts**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Create DCA Schedule
  Set up automated dollar-cost averaging with privacy
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌─────────────────────────────────────┐
│ ✓  DCA schedule created successfully! 🎉 │
└─────────────────────────────────────┘
```

### 2. **Configuration Summary**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Schedule Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ID                           abc123cd
  Swap Amount                  100 USDC
  Buy Asset                    SOL
  Frequency                    WEEKLY
  Ephemeral Wallet             Enabled
  ZK Privacy                   Enabled
  ShadowWire                   Disabled
  Arcium Confidential          Enabled
  Address Screening            Enabled
  Total Executions             Unlimited
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 3. **Rich Tables**
```
┌──────────┬────────┬──────────────────┬──────┬──────────┬──────┬──────────────┐
│ Status   │ ID     │ Swap             │ Freq │ Privacy  │ Exec │ Next         │
├──────────┼────────┼──────────────────┼──────┼──────────┼──────┼──────────────┤
│ 🟢 Active │ abc123 │ 100 USDC→SOL     │ week │ 🔒 Eph  │ 4/10 │ 2025-01-30  │
│ 🟢 Active │ def456 │ 50 SOL→USDT      │ day  │ 🛡️ ZK   │ 2    │ 2025-01-31  │
│ 🔴 Paused │ ghi789 │ 1000 BONK→ORCA   │ hour │          │ 47   │ N/A         │
└──────────┴────────┴──────────────────┴──────┴──────────┴──────┴──────────────┘
```

### 4. **Execution Plan**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Execution Plan
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Amount                       100 USDC
  Target                       SOL
  Privacy Features             Privacy Cash ZK Pool + Ephemeral Wallet + ShadowWire + Arcium Confidential
  Slippage                     50 bps
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### 5. **Step-by-Step Progress with Spinners**
```
⠋ Screening addresses...
✓ Screening passed (Risk: low)

⠙ Checking Privacy Cash availability...
✓ ZK pool deposit → withdraw complete
  Funds now at ephemeral: abc12345...

⠹ Generating ephemeral wallet...
✓ Ephemeral: def67890...

⠸ Funding ephemeral wallet...
✓ Ephemeral funded

⠼ Getting swap quote...
✓ Quote received
  Output:                      3.45 SOL
```

### 6. **Color-Coded Messages**
```
✓ DCA execution complete!
✗ Address screening failed
⚠ Configuration issue detected
ℹ Using simulated Arcium for demo...
◆ Debug: Transaction confirmed
```

### 7. **Execution Results**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Execution Result
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Transaction                  5Vk8FpJ...
  Output                       3.45 SOL
  ZK Privacy                   Funds through Privacy Cash anonymity set
  Ephemeral                    Main wallet hidden on-chain
  ShadowWire                   Amount encrypted with Bulletproofs
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## CLI Commands

### Create a DCA Schedule
```bash
private-dca dca schedule \
  --from USDC \
  --to SOL \
  --amount 100 \
  --frequency weekly \
  --privacy \
  --zk \
  --shadow
```

### List All Schedules
```bash
private-dca dca list
```

**Output:** Beautiful table with all schedules, showing status, privacy mode, execution count, and next execution time.

### View Execution History
```bash
private-dca dca history
private-dca dca history --id abc123
```

**Output:** Table of last 10 executions with status, time, swap details, and transaction links.

### Execute DCA Immediately
```bash
private-dca dca execute --id abc123
```

**Output:** Step-by-step progress with spinners and results.

### Pause/Resume/Cancel
```bash
private-dca dca pause --id abc123
private-dca dca resume --id abc123
private-dca dca cancel --id abc123
```

## UI Components

The UI system provides these components:

| Component | Usage | Example |
|-----------|-------|---------|
| `header()` | Page headers | `logger.header('Title', 'Subtitle')` |
| `subheader()` | Section headers | `logger.subheader('Section')` |
| `summary()` | Config/result summaries | `logger.summary('Title', items)` |
| `table()` | Data tables | `logger.table(headers, rows)` |
| `box()` | Content boxes | `logger.box(content, title)` |
| `alert()` | Important alerts | `logger.alert('Message', 'success')` |
| `success()` | Success messages | `logger.success('Done!')` |
| `error()` | Error messages | `logger.error('Failed!')` |
| `warning()` | Warning messages | `logger.warning('Careful!')` |
| `info()` | Info messages | `logger.info('Note')` |
| `keyValue()` | Key-value pairs | `logger.keyValue('Key', 'value', 'green')` |
| `stat()` | Statistics | `logger.stat('Label', '123', 'units')` |
| `status()` | Status indicators | `logger.status('Label', 'active')` |
| `progress()` | Progress bars | `logger.progress('Label', 5, 10)` |
| `privacy()` | Privacy indicators | `logger.privacy(true, 'Status')` |
| `transaction()` | TX details | `logger.transaction({...})` |
| `config()` | Config display | `logger.config('Title', {...})` |

## Color Scheme

Aligned with Dinario brand:
- **Primary Green**: `#00D395` - Highlights, success, important values
- **Cyan**: Borders, headers, secondary info
- **Yellow**: Warnings
- **Red**: Errors
- **Gray**: Subtle text, disabled states
- **White**: Main text

## Customization

You can extend the UI system in `src/utils/ui.ts`:

```typescript
// Add new UI component
export const ui = {
  custom: (title: string) => {
    console.log(chalk.bold.magenta(title));
  },
};

// Use it
logger.custom('My Custom Title');
```

## Installation & Usage

```bash
# Install
npm install

# Build TypeScript
npm run build

# Run CLI
npm start -- dca list
# or
private-dca dca list
```

Enjoy the beautiful terminal experience! 🎨
