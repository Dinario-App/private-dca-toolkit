import chalk from 'chalk';

/**
 * Beautiful CLI UI utilities for private-dca
 * Provides tables, boxes, progress, and styled output
 */

// Color scheme aligned with dinario brand
const colors = {
  primary: '#00D395',    // Green
  secondary: '#A1A1AA',  // Gray
  dark: '#0F0F11',       // Dark background
  white: '#FAFAFA',      // Off-white text
};

// Spinner styles
const spinners = {
  dots: { interval: 80, frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] },
  dots2: { interval: 80, frames: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'] },
  dots3: { interval: 80, frames: ['⠋', '⠙', '⠚', '⠞', '⠖', '⠦', '⠴', '⠲', '⠳', '⠓'] },
  line: { interval: 130, frames: ['-', '\\', '|', '/'] },
  arrow: { interval: 100, frames: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'] },
};

// Utility functions
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
  // ============ BASIC UTILITIES ============

  clear: () => console.clear(),

  newline: (count: number = 1) => {
    for (let i = 0; i < count; i++) console.log('');
  },

  // ============ STYLED TEXT ============

  header: (title: string, subtitle?: string) => {
    console.log('');
    console.log(chalk.bold.cyan('━'.repeat(50)));
    console.log(chalk.bold.cyan('  ' + title));
    if (subtitle) console.log(chalk.gray('  ' + subtitle));
    console.log(chalk.bold.cyan('━'.repeat(50)));
    console.log('');
  },

  subheader: (title: string) => {
    console.log('');
    console.log(chalk.bold.green('  ' + title));
    console.log(chalk.green('  ' + '─'.repeat(title.length)));
    console.log('');
  },

  box: (content: string, title?: string) => {
    const lines = content.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length), title ? title.length + 4 : 0);
    
    console.log('');
    console.log(chalk.cyan('┌' + '─'.repeat(maxLen + 2) + '┐'));
    
    if (title) {
      const padding = maxLen - title.length;
      console.log(chalk.cyan('│ ' + chalk.bold(title) + ' '.repeat(padding) + ' │'));
      console.log(chalk.cyan('├' + '─'.repeat(maxLen + 2) + '┤'));
    }
    
    lines.forEach(line => {
      const padding = maxLen - line.length;
      console.log(chalk.cyan('│ ') + line + ' '.repeat(padding) + chalk.cyan(' │'));
    });
    
    console.log(chalk.cyan('└' + '─'.repeat(maxLen + 2) + '┘'));
    console.log('');
  },

  // ============ MESSAGES ============

  success: (message: string) => console.log(chalk.green('✓') + '  ' + chalk.white(message)),
  error: (message: string) => console.log(chalk.red('✗') + '  ' + chalk.white(message)),
  warning: (message: string) => console.log(chalk.yellow('⚠') + '  ' + chalk.white(message)),
  info: (message: string) => console.log(chalk.blue('ℹ') + '  ' + chalk.white(message)),
  debug: (message: string) => console.log(chalk.gray('◆') + '  ' + chalk.gray(message)),

  // ============ KEY-VALUE DISPLAY ============

  keyValue: (key: string, value: string, color?: 'green' | 'cyan' | 'yellow' | 'red') => {
    const colorMap = {
      green: chalk.green,
      cyan: chalk.cyan,
      yellow: chalk.yellow,
      red: chalk.red,
    };
    const colorFn = colorMap[color || 'cyan'] || chalk.cyan;
    console.log(chalk.gray('  ' + padRight(key + ':', 20)) + colorFn(value));
  },

  stat: (label: string, value: string, unit?: string) => {
    const fullValue = unit ? `${value} ${unit}` : value;
    console.log(chalk.gray('  ' + padRight(label, 18)) + chalk.green(chalk.bold(fullValue)));
  },

  // ============ TABLES ============

  table: (
    headers: string[],
    rows: (string | number)[][],
    options?: { borders?: boolean; colWidths?: number[] }
  ) => {
    const { borders = true, colWidths } = options || {};
    
    // Calculate column widths
    const widths = headers.map((h, i) => {
      if (colWidths?.[i]) return colWidths[i];
      const headerLen = h.length;
      const maxRowLen = rows.reduce((max, row) => {
        return Math.max(max, String(row[i] || '').length);
      }, 0);
      return Math.max(headerLen, maxRowLen) + 2;
    });

    const drawRow = (cells: (string | number)[], color?: typeof chalk.cyan) => {
      const colorFn = color || chalk.white;
      const separator = borders ? ' │ ' : '  ';
      const paddedCells = cells.map((cell, i) => padRight(String(cell), widths[i]));
      if (borders) {
        console.log(chalk.cyan('│ ') + paddedCells.join(separator) + chalk.cyan(' │'));
      } else {
        console.log('  ' + paddedCells.join('   '));
      }
    };

    const borderLine = () => {
      if (borders) {
        const line = widths.map(w => '─'.repeat(w + 2)).join('┼');
        console.log(chalk.cyan('├' + line + '┤'));
      }
    };

    console.log('');
    
    if (borders) {
      const line = widths.map(w => '─'.repeat(w + 2)).join('┬');
      console.log(chalk.cyan('┌' + line + '┐'));
    }

    drawRow(headers, chalk.bold.cyan);
    borderLine();

    rows.forEach((row, i) => {
      drawRow(row, chalk.white);
    });

    if (borders) {
      const line = widths.map(w => '─'.repeat(w + 2)).join('┴');
      console.log(chalk.cyan('└' + line + '┘'));
    }

    console.log('');
  },

  // ============ STATUS DISPLAYS ============

  status: (label: string, value: string, icon?: string) => {
    const defaultIcon = icon || '●';
    const statusIcon = value === 'active' ? chalk.green('●') :
                      value === 'inactive' ? chalk.gray('●') :
                      value === 'pending' ? chalk.yellow('●') :
                      chalk.cyan(defaultIcon);
    
    console.log(chalk.gray('  ' + padRight(label, 16)) + statusIcon + '  ' + chalk.white(value));
  },

  progress: (label: string, current: number, total: number, width: number = 20) => {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    
    console.log(
      chalk.gray(padRight(label, 14)) +
      chalk.cyan('[' + bar + ']') +
      chalk.gray(' ' + percent + '%')
    );
  },

  // ============ TRANSACTION DISPLAY ============

  transaction: (options: {
    hash: string;
    status: 'success' | 'pending' | 'failed';
    from?: string;
    to?: string;
    amount?: string;
    fee?: string;
    timestamp?: string;
  }) => {
    const statusSymbol = options.status === 'success' ? chalk.green('✓') :
                        options.status === 'pending' ? chalk.yellow('⏳') :
                        chalk.red('✗');
    
    console.log('');
    console.log(statusSymbol + '  ' + chalk.bold('Transaction ' + options.status.toUpperCase()));
    console.log(chalk.gray('  Hash: ') + chalk.cyan(options.hash.slice(0, 16) + '...'));
    
    if (options.from) console.log(chalk.gray('  From: ') + chalk.white(truncate(options.from, 24)));
    if (options.to) console.log(chalk.gray('  To:   ') + chalk.white(truncate(options.to, 24)));
    if (options.amount) console.log(chalk.gray('  Amount: ') + chalk.green(options.amount));
    if (options.fee) console.log(chalk.gray('  Fee: ') + chalk.yellow(options.fee));
    if (options.timestamp) console.log(chalk.gray('  Time: ') + chalk.white(options.timestamp));
    
    console.log('');
  },

  // ============ CONFIGURATION DISPLAY ============

  config: (title: string, config: Record<string, any>) => {
    console.log('');
    console.log(chalk.bold.cyan(title));
    console.log(chalk.cyan('─'.repeat(title.length)));
    
    Object.entries(config).forEach(([key, value]) => {
      const displayValue = typeof value === 'boolean' ? 
        (value ? chalk.green('enabled') : chalk.gray('disabled')) :
        chalk.cyan(String(value));
      
      console.log(chalk.gray(padRight(key + ':', 18)) + displayValue);
    });
    
    console.log('');
  },

  // ============ PRIVACY INDICATOR ============

  privacy: (enabled: boolean, label?: string) => {
    const prefix = label ? label + ': ' : '';
    if (enabled) {
      console.log(chalk.magenta('🔒 ') + chalk.bold.magenta(prefix + 'Privacy Enabled'));
    } else {
      console.log(chalk.gray('🔓 ') + chalk.gray(prefix + 'Privacy Disabled'));
    }
  },

  // ============ SUMMARY BOX ============

  summary: (title: string, items: Array<{ label: string; value: string | number; color?: 'green' | 'cyan' | 'yellow' }>) => {
    console.log('');
    console.log(chalk.bold.cyan('━'.repeat(50)));
    console.log(chalk.bold.cyan('  ' + title));
    console.log(chalk.bold.cyan('━'.repeat(50)));
    
    items.forEach(({ label, value, color = 'cyan' }) => {
      const colorMap = {
        green: chalk.green,
        cyan: chalk.cyan,
        yellow: chalk.yellow,
      };
      const colorFn = colorMap[color];
      console.log(chalk.gray(padRight('  ' + label, 24)) + colorFn(String(value)));
    });
    
    console.log(chalk.bold.cyan('━'.repeat(50)));
    console.log('');
  },

  // ============ ALERT ============

  alert: (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const symbols = {
      info: chalk.blue('ℹ'),
      warning: chalk.yellow('⚠'),
      error: chalk.red('✗'),
      success: chalk.green('✓'),
    };
    
    const colorMap = {
      info: chalk.cyan,
      warning: chalk.yellow,
      error: chalk.red,
      success: chalk.green,
    };
    
    const symbol = symbols[type];
    const colorFn = colorMap[type];
    
    console.log('');
    console.log(colorFn('┌─────────────────────────────────────┐'));
    console.log(colorFn('│') + ' ' + symbol + '  ' + padRight(message.slice(0, 33), 33) + colorFn('│'));
    console.log(colorFn('└─────────────────────────────────────┘'));
    console.log('');
  },

  // ============ LOADER (for ora integration) ============

  spinner: (message: string, options?: { symbol?: string; color?: string }) => {
    const symbol = options?.symbol || '⠋';
    const color = options?.color || 'cyan';
    return {
      start: () => console.log(chalk[color as 'cyan' | 'green' | 'yellow'](symbol) + ' ' + message),
      stop: () => {},
      succeed: (msg?: string) => console.log(chalk.green('✓') + ' ' + (msg || message)),
      fail: (msg?: string) => console.log(chalk.red('✗') + ' ' + (msg || message)),
    };
  },
};

export default ui;
