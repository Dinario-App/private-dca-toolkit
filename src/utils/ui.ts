import chalk from 'chalk';

/**
 * Enterprise-Grade CLI UI for Private DCA
 * Premium terminal experience with professional design patterns
 */

const truncate = (str: string, len: number): string => {
  return str.length > len ? str.substring(0, len - 3) + '...' : str;
};

const padRight = (str: string, len: number): string => {
  return str + ' '.repeat(Math.max(0, len - str.length));
};

const padLeft = (str: string, len: number): string => {
  return ' '.repeat(Math.max(0, len - str.length)) + str;
};

export const ui = {
  // ============ BRANDING & WELCOME ============

  banner: () => {
    console.log('');
    console.log(chalk.hex('#00D395')('   ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆'));
    console.log(chalk.hex('#00D395')('   ◆') + chalk.hex('#FAFAFA')('     PRIVATE DCA TOOLKIT     ') + chalk.hex('#00D395')('◆'));
    console.log(chalk.hex('#00D395')('   ◆') + chalk.hex('#52525B')('  Solana • Privacy • Automatio ') + chalk.hex('#00D395')('◆'));
    console.log(chalk.hex('#00D395')('   ◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆'));
    console.log('');
  },

  // ============ PREMIUM HEADER WITH VISUAL HIERARCHY ============

  header: (title: string, subtitle?: string, icon?: string) => {
    const symbol = icon || '▸';
    console.log('');
    console.log(chalk.hex('#00D395')(symbol) + chalk.hex('#00D395').bold('  ' + title));
    if (subtitle) {
      console.log(chalk.hex('#52525B')('   ' + subtitle));
    }
    console.log(chalk.hex('#1F1F23')('   ' + '─'.repeat(Math.max(title.length, subtitle?.length || 0))));
    console.log('');
  },

  subheader: (title: string) => {
    console.log('');
    console.log(chalk.hex('#00BA82').bold('  ▪ ' + title));
    console.log('');
  },

  // ============ VISUAL DIVIDERS ============

  divider: (color?: string) => {
    const c = color || '#1F1F23';
    console.log(chalk.hex(c)('  ' + '─'.repeat(70)));
  },

  thickDivider: (color?: string) => {
    const c = color || '#00D395';
    console.log(chalk.hex(c)('  ' + '═'.repeat(70)));
  },

  // ============ KEY-VALUE WITH VISUAL HIERARCHY ============

  stat: (label: string, value: string | number, unit?: string, highlight = false) => {
    const fullValue = unit ? `${value} ${unit}` : String(value);
    const labelStr = chalk.hex('#52525B')(padRight('  ' + label, 28));
    
    if (highlight) {
      console.log(labelStr + chalk.hex('#00D395').bold(fullValue) + chalk.hex('#00BA82')(' ●'));
    } else {
      console.log(labelStr + chalk.hex('#FAFAFA')(fullValue));
    }
  },

  bigStat: (label: string, value: string | number, unit?: string) => {
    const fullValue = unit ? `${value} ${unit}` : String(value);
    console.log('');
    console.log(chalk.hex('#52525B')('  ' + label));
    console.log(chalk.hex('#00D395').bold('  ' + fullValue));
    console.log('');
  },

  keyValue: (key: string, value: string, color?: 'green' | 'cyan' | 'yellow' | 'red' | 'muted') => {
    const colorMap = {
      green: chalk.hex('#00D395'),
      cyan: chalk.hex('#00BA82'),
      yellow: chalk.hex('#FFA500'),
      red: chalk.hex('#FF6B6B'),
      muted: chalk.hex('#52525B'),
    };
    const colorFn = colorMap[color || 'cyan'] || chalk.hex('#00BA82');
    const keyStr = chalk.hex('#52525B')(padRight('  ' + key, 28));
    console.log(keyStr + colorFn(value));
  },

  // ============ PROFESSIONAL MESSAGES ============

  success: (message: string, icon?: string) => {
    const sym = icon || '✓';
    console.log('  ' + chalk.hex('#00D395')(sym) + '  ' + chalk.hex('#FAFAFA')(message));
  },

  error: (message: string, icon?: string) => {
    const sym = icon || '✕';
    console.log('  ' + chalk.hex('#FF6B6B')(sym) + '  ' + chalk.hex('#FAFAFA')(message));
  },

  warning: (message: string, icon?: string) => {
    const sym = icon || '⚠';
    console.log('  ' + chalk.hex('#FFA500')(sym) + '  ' + chalk.hex('#FAFAFA')(message));
  },

  info: (message: string, icon?: string) => {
    const sym = icon || '◆';
    console.log('  ' + chalk.hex('#00BA82')(sym) + '  ' + chalk.hex('#FAFAFA')(message));
  },

  // ============ CONFIGURATION PANEL ============

  configPanel: (title: string, items: Array<{ label: string; value: string | boolean; badge?: string }>) => {
    console.log('');
    console.log(chalk.hex('#00D395').bold('  ◆ ' + title));
    console.log(chalk.hex('#1F1F23')('  ' + '─'.repeat(title.length + 2)));
    console.log('');

    items.forEach(({ label, value, badge }) => {
      const displayValue = typeof value === 'boolean'
        ? value
          ? chalk.hex('#00D395')('enabled')
          : chalk.hex('#52525B')('disabled')
        : chalk.hex('#FAFAFA')(String(value));

      const badgeStr = badge
        ? '  ' + chalk.hex('#FFA500').bold(badge)
        : '';

      console.log('  ' + chalk.hex('#52525B')(padRight(label, 28)) + displayValue + badgeStr);
    });

    console.log('');
  },

  // ============ ENTERPRISE TABLES ============

  table: (
    headers: string[],
    rows: (string | number)[][],
    options?: { colWidths?: number[]; highlight?: number[] }
  ) => {
    const { colWidths, highlight = [] } = options || {};

    // Calculate widths
    const widths = headers.map((h, i) => {
      if (colWidths?.[i]) return colWidths[i];
      const headerLen = h.length;
      const maxRowLen = rows.reduce((max, row) => {
        return Math.max(max, String(row[i] || '').length);
      }, 0);
      return Math.max(headerLen, maxRowLen) + 2;
    });

    console.log('');

    // Header row
    const headerCells = headers.map((h, i) => padRight(h, widths[i]));
    console.log(chalk.hex('#1F1F23')('  ┌ ') + chalk.hex('#00D395').bold(headerCells.join(chalk.hex('#1F1F23')(' │ '))) + chalk.hex('#1F1F23')(' ┐'));

    // Separator
    const sepLine = widths.map(w => '─'.repeat(w + 2)).join('─');
    console.log(chalk.hex('#1F1F23')('  ├─' + sepLine + '─┤'));

    // Data rows with alternating backgrounds
    rows.forEach((row, idx) => {
      const cells = row.map((cell, i) => {
        const str = padRight(String(cell), widths[i]);
        return highlight.includes(i) ? chalk.hex('#00D395')(str) : chalk.hex('#FAFAFA')(str);
      });

      const bgColor = idx % 2 === 0 ? chalk.bgHex('#0A0A0D') : chalk.bgHex('#0F0F11');
      console.log(chalk.hex('#1F1F23')('  │ ') + cells.join(chalk.hex('#1F1F23')(' │ ')) + chalk.hex('#1F1F23')(' │'));
    });

    // Bottom border
    console.log(chalk.hex('#1F1F23')('  └─' + sepLine + '─┘'));
    console.log('');
  },

  // ============ RESULT SUMMARY (Big Impact) ============

  resultSummary: (
    title: string,
    items: Array<{
      label: string;
      value: string | number;
      icon?: string;
      color?: 'green' | 'yellow' | 'red' | 'cyan';
    }>
  ) => {
    console.log('');
    console.log(chalk.hex('#00D395').bold('  ◆ ' + title));
    console.log(chalk.hex('#1F1F23')('  ' + '═'.repeat(title.length + 2)));
    console.log('');

    items.forEach(({ label, value, icon = '▪', color = 'cyan' }) => {
      const colorMap = {
        green: chalk.hex('#00D395'),
        yellow: chalk.hex('#FFA500'),
        red: chalk.hex('#FF6B6B'),
        cyan: chalk.hex('#00BA82'),
      };
      const colorFn = colorMap[color];

      console.log('  ' + colorFn(icon) + chalk.hex('#52525B')(padRight(' ' + label, 32)) + colorFn.bold(String(value)));
    });

    console.log('');
  },

  // ============ STATUS INDICATORS ============

  statusBadge: (status: 'active' | 'pending' | 'paused' | 'failed', label?: string) => {
    const configs = {
      active: { emoji: '🟢', text: 'ACTIVE', color: chalk.hex('#00D395') },
      pending: { emoji: '🟡', text: 'PENDING', color: chalk.hex('#FFA500') },
      paused: { emoji: '🔴', text: 'PAUSED', color: chalk.hex('#FF6B6B') },
      failed: { emoji: '❌', text: 'FAILED', color: chalk.hex('#FF6B6B') },
    };

    const config = configs[status];
    const text = label || config.text;
    console.log('  ' + config.emoji + '  ' + config.color.bold(text));
  },

  // ============ PROGRESS BARS ============

  progressBar: (label: string, current: number, total: number, width: number = 30) => {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;

    const bar =
      chalk.hex('#00D395')('█'.repeat(filled)) +
      chalk.hex('#1F1F23')('░'.repeat(empty));

    console.log('  ' + chalk.hex('#52525B')(padRight(label, 24)) + bar + chalk.hex('#52525B')(' ' + percent + '%'));
  },

  // ============ ALERT BOX (Important) ============

  alertBox: (message: string, type: 'success' | 'warning' | 'error' = 'warning') => {
    const colorMap = {
      success: { bg: chalk.bgHex('#0D3D2C'), text: chalk.hex('#00D395') },
      warning: { bg: chalk.bgHex('#3D3010'), text: chalk.hex('#FFA500') },
      error: { bg: chalk.bgHex('#3D0D0D'), text: chalk.hex('#FF6B6B') },
    };

    const config = colorMap[type];
    const padding = 60;
    const paddedMsg = padRight(' ' + message, padding);

    console.log('');
    console.log(config.bg(chalk.bold(paddedMsg)));
    console.log('');
  },

  // ============ TRANSACTION DETAILS ============

  txDetails: (options: {
    hash: string;
    status: 'success' | 'pending' | 'failed';
    amount?: string;
    from?: string;
    to?: string;
    fee?: string;
    time?: string;
  }) => {
    const statusSymbol =
      options.status === 'success'
        ? chalk.hex('#00D395')('✓')
        : options.status === 'pending'
          ? chalk.hex('#FFA500')('⏳')
          : chalk.hex('#FF6B6B')('✕');

    const statusText =
      options.status === 'success'
        ? 'CONFIRMED'
        : options.status === 'pending'
          ? 'PENDING'
          : 'FAILED';

    console.log('');
    console.log('  ' + statusSymbol + '  ' + chalk.hex('#FAFAFA').bold('Transaction ' + statusText));
    console.log('');
    console.log('  ' + chalk.hex('#52525B')(padRight('Hash', 28)) + chalk.hex('#00BA82')(options.hash.slice(0, 20) + '...'));

    if (options.amount) {
      console.log('  ' + chalk.hex('#52525B')(padRight('Amount', 28)) + chalk.hex('#00D395').bold(options.amount));
    }
    if (options.from) {
      console.log('  ' + chalk.hex('#52525B')(padRight('From', 28)) + chalk.hex('#FAFAFA')(truncate(options.from, 32)));
    }
    if (options.to) {
      console.log('  ' + chalk.hex('#52525B')(padRight('To', 28)) + chalk.hex('#FAFAFA')(truncate(options.to, 32)));
    }
    if (options.fee) {
      console.log('  ' + chalk.hex('#52525B')(padRight('Fee', 28)) + chalk.hex('#FFA500')(options.fee));
    }
    if (options.time) {
      console.log('  ' + chalk.hex('#52525B')(padRight('Time', 28)) + chalk.hex('#FAFAFA')(options.time));
    }

    console.log('');
  },

  // ============ SECTION BOX ============

  sectionBox: (title: string, content: string[]) => {
    console.log('');
    console.log(chalk.hex('#00BA82').bold('  ◇ ' + title));
    console.log('');

    content.forEach(line => {
      console.log('  │ ' + chalk.hex('#FAFAFA')(line));
    });

    console.log('');
  },

  // ============ UTILITIES ============

  newline: (count: number = 1) => {
    for (let i = 0; i < count; i++) console.log('');
  },

  clear: () => console.clear(),

  highlight: (text: string) => chalk.hex('#00D395').bold(text),
  muted: (text: string) => chalk.hex('#52525B')(text),
};

export default ui;
