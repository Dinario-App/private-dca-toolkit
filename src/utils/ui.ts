import chalk from 'chalk';

/**
 * Premium Enterprise CLI UI for Private DCA
 * Stripe/Vercel level professional design
 */

const truncate = (str: string, len: number): string => {
  return str.length > len ? str.substring(0, len - 3) + '...' : str;
};

const padRight = (str: string, len: number): string => {
  return str + ' '.repeat(Math.max(0, len - str.length));
};

export const ui = {
  // ============ PREMIUM HEADER ============

  header: (title: string, subtitle?: string) => {
    console.log('');
    console.log(chalk.hex('#00D395').bold('  ' + title));
    if (subtitle) {
      console.log(chalk.hex('#52525B')('  ' + subtitle));
    }
    console.log('');
  },

  subheader: (title: string) => {
    console.log('');
    console.log(chalk.hex('#00BA82').bold('  ' + title));
    console.log('');
  },

  // ============ PREMIUM MESSAGES ============

  success: (message: string) => {
    console.log('  ' + chalk.hex('#00D395')('✓') + '  ' + chalk.hex('#FAFAFA')(message));
  },

  error: (message: string) => {
    console.log('  ' + chalk.hex('#FF6B6B')('✕') + '  ' + chalk.hex('#FAFAFA')(message));
  },

  warning: (message: string) => {
    console.log('  ' + chalk.hex('#FFA500')('⚠') + '  ' + chalk.hex('#FAFAFA')(message));
  },

  info: (message: string) => {
    console.log('  ' + chalk.hex('#00BA82')('◆') + '  ' + chalk.hex('#FAFAFA')(message));
  },

  // ============ CONFIGURATION PANEL - CLEAN & MINIMAL ============

  configPanel: (title: string, items: Array<{ label: string; value: string | boolean; badge?: string }>) => {
    console.log('');
    console.log(chalk.hex('#00D395').bold('  ' + title));
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

  // ============ KEY-VALUE ============

  keyValue: (key: string, value: string, color?: 'green' | 'cyan' | 'yellow' | 'red') => {
    const colorMap = {
      green: chalk.hex('#00D395'),
      cyan: chalk.hex('#00BA82'),
      yellow: chalk.hex('#FFA500'),
      red: chalk.hex('#FF6B6B'),
    };
    const colorFn = colorMap[color || 'cyan'];
    console.log('  ' + chalk.hex('#52525B')(padRight(key, 28)) + colorFn(value));
  },

  stat: (label: string, value: string, unit?: string, highlight = false) => {
    const fullValue = unit ? `${value} ${unit}` : String(value);
    const labelStr = chalk.hex('#52525B')(padRight('  ' + label, 28));
    
    if (highlight) {
      console.log(labelStr + chalk.hex('#00D395').bold(fullValue));
    } else {
      console.log(labelStr + chalk.hex('#FAFAFA')(fullValue));
    }
  },

  // ============ PREMIUM ALERT BOX - CLEAN BACKGROUND ============

  alertBox: (message: string, type: 'success' | 'warning' | 'error' = 'warning') => {
    const colorMap = {
      success: chalk.hex('#00D395'),
      warning: chalk.hex('#FFA500'),
      error: chalk.hex('#FF6B6B'),
    };

    const color = colorMap[type];
    console.log('');
    console.log('  ' + color.bold('✓ ' + message));
    console.log('');
  },

  // ============ ENTERPRISE TABLES - MINIMAL DESIGN ============

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

    // Top border - minimal
    const topLine = widths.map(w => '─'.repeat(w + 2)).join('─');
    console.log(chalk.hex('#1F1F23')('  ┌─' + topLine + '─┐'));

    // Header row
    const headerCells = headers.map((h, i) => padRight(h, widths[i]));
    console.log(chalk.hex('#1F1F23')('  │ ') + chalk.hex('#00D395').bold(headerCells.join(chalk.hex('#1F1F23')(' │ '))) + chalk.hex('#1F1F23')(' │'));

    // Separator - subtle
    console.log(chalk.hex('#1F1F23')('  ├─' + topLine + '─┤'));

    // Data rows - clean, no alternating colors
    rows.forEach((row) => {
      const cells = row.map((cell, i) => {
        const str = padRight(String(cell), widths[i]);
        return highlight.includes(i) ? chalk.hex('#00D395')(str) : chalk.hex('#FAFAFA')(str);
      });

      console.log(chalk.hex('#1F1F23')('  │ ') + cells.join(chalk.hex('#1F1F23')(' │ ')) + chalk.hex('#1F1F23')(' │'));
    });

    // Bottom border
    console.log(chalk.hex('#1F1F23')('  └─' + topLine + '─┘'));
    console.log('');
  },

  // ============ RESULT SUMMARY - BIG IMPACT ============

  resultSummary: (
    title: string,
    items: Array<{
      label: string;
      value: string | number;
      color?: 'green' | 'yellow' | 'red' | 'cyan';
    }>
  ) => {
    console.log('');
    console.log(chalk.hex('#00D395').bold('  ' + title));
    console.log('');

    items.forEach(({ label, value, color = 'cyan' }) => {
      const colorMap = {
        green: chalk.hex('#00D395'),
        yellow: chalk.hex('#FFA500'),
        red: chalk.hex('#FF6B6B'),
        cyan: chalk.hex('#00BA82'),
      };
      const colorFn = colorMap[color];

      console.log('  ' + chalk.hex('#52525B')(padRight(label, 28)) + colorFn.bold(String(value)));
    });

    console.log('');
  },

  // ============ STATUS BADGE ============

  statusBadge: (status: 'active' | 'pending' | 'paused' | 'failed') => {
    const configs = {
      active: { emoji: '🟢', text: 'ACTIVE', color: chalk.hex('#00D395') },
      pending: { emoji: '🟡', text: 'PENDING', color: chalk.hex('#FFA500') },
      paused: { emoji: '🔴', text: 'PAUSED', color: chalk.hex('#FF6B6B') },
      failed: { emoji: '❌', text: 'FAILED', color: chalk.hex('#FF6B6B') },
    };

    const config = configs[status];
    console.log('  ' + config.emoji + '  ' + config.color.bold(config.text));
  },

  // ============ PROGRESS BAR ============

  progressBar: (label: string, current: number, total: number, width: number = 30) => {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const empty = width - filled;

    const bar =
      chalk.hex('#00D395')('█'.repeat(filled)) +
      chalk.hex('#1F1F23')('░'.repeat(empty));

    console.log('  ' + chalk.hex('#52525B')(padRight(label, 24)) + bar + chalk.hex('#52525B')(' ' + percent + '%'));
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

    const statusText = options.status === 'success' ? 'CONFIRMED' : options.status === 'pending' ? 'PENDING' : 'FAILED';

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
    console.log(chalk.hex('#00BA82').bold('  ' + title));
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
