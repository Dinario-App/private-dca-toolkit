import chalk from 'chalk';

/**
 * Premium CLI UI utilities for private-dca
 * Professional-grade terminal experience aligned with Dinario brand
 */

// Premium color scheme
const colors = {
  primary: '#00D395',      // Dinario Green
  secondary: '#A1A1AA',    // Subtle Gray
  accent: '#00BA82',       // Darker Green
  dark: '#0F0F11',         // Deep Black
  white: '#FAFAFA',        // Off-white
  muted: '#52525B',        // Muted Gray
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

  // Premium header - like top SaaS CLIs
  header: (title: string, subtitle?: string) => {
    console.log('');
    console.log(chalk.hex('#00D395')('  ◆ ' + chalk.bold(title)));
    if (subtitle) {
      console.log(chalk.hex('#52525B')('  ' + subtitle));
    }
    console.log(chalk.hex('#1F1F23')('  ' + '─'.repeat(Math.max(title.length, subtitle?.length || 0))));
    console.log('');
  },

  subheader: (title: string) => {
    console.log('');
    console.log(chalk.bold.hex('#00D395')('  › ' + title));
    console.log('');
  },

  // Premium box - clean minimal design
  box: (content: string, title?: string) => {
    const lines = content.split('\n');
    const maxLen = Math.max(...lines.map(l => l.length), title ? title.length + 4 : 0);
    const width = Math.min(maxLen + 4, 80); // Cap at 80 chars

    console.log('');
    
    if (title) {
      console.log(chalk.hex('#00D395')('  ◇ ' + chalk.bold(title)));
    }
    
    lines.forEach(line => {
      console.log(chalk.hex('#1F1F23')('  │ ') + chalk.white(line));
    });
    
    console.log('');
  },

  // ============ PREMIUM MESSAGES ============

  success: (message: string) => console.log('  ' + chalk.hex('#00D395')('✓') + '  ' + chalk.hex('#FAFAFA')(message)),
  error: (message: string) => console.log('  ' + chalk.hex('#FF6B6B')('✕') + '  ' + chalk.hex('#FAFAFA')(message)),
  warning: (message: string) => console.log('  ' + chalk.hex('#FFA500')('⚠') + '  ' + chalk.hex('#FAFAFA')(message)),
  info: (message: string) => console.log('  ' + chalk.hex('#00BA82')('◆') + '  ' + chalk.hex('#FAFAFA')(message)),
  debug: (message: string) => console.log('  ' + chalk.hex('#52525B')('◆') + '  ' + chalk.hex('#52525B')(message)),

  // ============ PREMIUM KEY-VALUE DISPLAY ============

  keyValue: (key: string, value: string, color?: 'green' | 'cyan' | 'yellow' | 'red') => {
    const colorMap = {
      green: chalk.hex('#00D395'),
      cyan: chalk.hex('#00BA82'),
      yellow: chalk.hex('#FFA500'),
      red: chalk.hex('#FF6B6B'),
    };
    const colorFn = colorMap[color || 'cyan'] || chalk.hex('#00BA82');
    const keyStr = chalk.hex('#52525B')(padRight('  ' + key, 22));
    console.log(keyStr + colorFn(value));
  },

  stat: (label: string, value: string, unit?: string) => {
    const fullValue = unit ? `${value} ${unit}` : value;
    const labelStr = chalk.hex('#52525B')(padRight('  ' + label, 20));
    console.log(labelStr + chalk.hex('#00D395')(chalk.bold(fullValue)));
  },

  // ============ PREMIUM TABLES ============

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

    const drawRow = (cells: (string | number)[], isHeader = false) => {
      const paddedCells = cells.map((cell, i) => padRight(String(cell), widths[i]));
      const separator = ' │ ';
      const content = paddedCells.join(separator);
      
      if (isHeader) {
        console.log(chalk.hex('#00D395')('  │ ') + chalk.bold.hex('#00D395')(content) + chalk.hex('#00D395')(' │'));
      } else {
        console.log(chalk.hex('#1F1F23')('  │ ') + chalk.hex('#FAFAFA')(content) + chalk.hex('#1F1F23')(' │'));
      }
    };

    const borderLine = (type: 'top' | 'mid' | 'bottom') => {
      const leftChar = type === 'top' ? '┌' : type === 'mid' ? '├' : '└';
      const midChar = type === 'top' ? '┬' : type === 'mid' ? '┼' : '┴';
      const rightChar = type === 'top' ? '┐' : type === 'mid' ? '┤' : '┘';
      
      const line = widths.map(w => '─'.repeat(w + 2)).join(midChar);
      console.log(chalk.hex('#1F1F23')('  ' + leftChar + line + rightChar));
    };

    console.log('');
    
    if (borders) borderLine('top');
    drawRow(headers, true);
    if (borders) borderLine('mid');

    rows.forEach((row, i) => {
      drawRow(row, false);
    });

    if (borders) borderLine('bottom');

    console.log('');
  },

  // ============ PREMIUM STATUS DISPLAYS ============

  status: (label: string, value: string, icon?: string) => {
    const statusIcon = value === 'active' ? chalk.hex('#00D395')('●') :
                      value === 'inactive' ? chalk.hex('#52525B')('●') :
                      value === 'pending' ? chalk.hex('#FFA500')('●') :
                      chalk.hex('#00BA82')(icon || '●');
    
    console.log(chalk.hex('#52525B')('  ' + padRight(label, 18)) + statusIcon + '  ' + chalk.hex('#FAFAFA')(value));
  },

  progress: (label: string, current: number, total: number, width: number = 20) => {
    const percent = Math.round((current / total) * 100);
    const filled = Math.round((width * current) / total);
    const bar = chalk.hex('#00D395')('█'.repeat(filled)) + chalk.hex('#1F1F23')('░'.repeat(width - filled));
    
    console.log(
      chalk.hex('#52525B')(padRight('  ' + label, 18)) +
      chalk.hex('#1F1F23')('[') + bar + chalk.hex('#1F1F23')(']') +
      chalk.hex('#52525B')(' ' + percent + '%')
    );
  },

  // ============ PREMIUM TRANSACTION DISPLAY ============

  transaction: (options: {
    hash: string;
    status: 'success' | 'pending' | 'failed';
    from?: string;
    to?: string;
    amount?: string;
    fee?: string;
    timestamp?: string;
  }) => {
    const statusSymbol = options.status === 'success' ? chalk.hex('#00D395')('✓') :
                        options.status === 'pending' ? chalk.hex('#FFA500')('⏳') :
                        chalk.hex('#FF6B6B')('✕');
    
    console.log('');
    console.log('  ' + statusSymbol + '  ' + chalk.bold.hex('#FAFAFA')('Transaction ' + options.status.toUpperCase()));
    console.log('  ' + chalk.hex('#52525B')('Hash:') + '   ' + chalk.hex('#00BA82')(options.hash.slice(0, 16) + '...'));
    
    if (options.from) console.log('  ' + chalk.hex('#52525B')('From:') + '   ' + chalk.hex('#FAFAFA')(truncate(options.from, 24)));
    if (options.to) console.log('  ' + chalk.hex('#52525B')('To:') + '     ' + chalk.hex('#FAFAFA')(truncate(options.to, 24)));
    if (options.amount) console.log('  ' + chalk.hex('#52525B')('Amount:') + ' ' + chalk.hex('#00D395')(options.amount));
    if (options.fee) console.log('  ' + chalk.hex('#52525B')('Fee:') + '    ' + chalk.hex('#FFA500')(options.fee));
    if (options.timestamp) console.log('  ' + chalk.hex('#52525B')('Time:') + '   ' + chalk.hex('#FAFAFA')(options.timestamp));
    
    console.log('');
  },

  // ============ PREMIUM CONFIGURATION DISPLAY ============

  config: (title: string, config: Record<string, any>) => {
    console.log('');
    console.log('  ' + chalk.bold.hex('#00D395')(title));
    console.log('  ' + chalk.hex('#1F1F23')('─'.repeat(title.length)));
    console.log('');
    
    Object.entries(config).forEach(([key, value]) => {
      const displayValue = typeof value === 'boolean' ? 
        (value ? chalk.hex('#00D395')('enabled') : chalk.hex('#52525B')('disabled')) :
        chalk.hex('#00BA82')(String(value));
      
      console.log('  ' + chalk.hex('#52525B')(padRight(key + ':', 20)) + displayValue);
    });
    
    console.log('');
  },

  // ============ PREMIUM PRIVACY INDICATOR ============

  privacy: (enabled: boolean, label?: string) => {
    const prefix = label ? label + ': ' : '';
    if (enabled) {
      console.log('  ' + chalk.hex('#00D395')('🔒') + '  ' + chalk.bold.hex('#00D395')(prefix + 'Privacy Enabled'));
    } else {
      console.log('  ' + chalk.hex('#52525B')('🔓') + '  ' + chalk.hex('#52525B')(prefix + 'Privacy Disabled'));
    }
  },

  // ============ PREMIUM SUMMARY BOX ============

  summary: (title: string, items: Array<{ label: string; value: string | number; color?: 'green' | 'cyan' | 'yellow' }>) => {
    console.log('');
    console.log(chalk.bold.hex('#00D395')('  ◆ ' + title));
    console.log(chalk.hex('#1F1F23')('  ' + '─'.repeat(title.length)));
    console.log('');
    
    items.forEach(({ label, value, color = 'cyan' }) => {
      const colorMap = {
        green: chalk.hex('#00D395'),
        cyan: chalk.hex('#00BA82'),
        yellow: chalk.hex('#FFA500'),
      };
      const colorFn = colorMap[color];
      const labelStr = padRight('  ' + label, 28);
      console.log(chalk.hex('#52525B')(labelStr) + colorFn(chalk.bold(String(value))));
    });
    
    console.log('');
  },

  // ============ PREMIUM ALERT ============

  alert: (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => {
    const configs = {
      info: { symbol: '◆', color: chalk.hex('#00BA82'), bg: chalk.bgHex('#1F1F23') },
      warning: { symbol: '◆', color: chalk.hex('#FFA500'), bg: chalk.bgHex('#1F1F23') },
      error: { symbol: '◆', color: chalk.hex('#FF6B6B'), bg: chalk.bgHex('#1F1F23') },
      success: { symbol: '✓', color: chalk.hex('#00D395'), bg: chalk.bgHex('#1F1F23') },
    };
    
    const config = configs[type];
    console.log('');
    console.log('  ' + config.color(config.symbol + ' ' + chalk.bold(message)));
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
