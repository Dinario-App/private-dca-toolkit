import chalk from 'chalk';
import { ui } from './ui';

export const logger = {
  // Basic messages
  info: (message: string) => ui.info(message),
  success: (message: string) => ui.success(message),
  warning: (message: string) => ui.warning(message),
  error: (message: string) => ui.error(message),
  debug: (message: string) => ui.debug(message),

  // Styled outputs
  header: (title: string, subtitle?: string) => ui.header(title, subtitle),
  subheader: (title: string) => ui.subheader(title),

  // Display
  box: (content: string, title?: string) => ui.box(content, title),
  alert: (message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info') => ui.alert(message, type),

  // Table-like output
  keyValue: (key: string, value: string, color?: 'green' | 'cyan' | 'yellow' | 'red') => ui.keyValue(key, value, color),
  stat: (label: string, value: string, unit?: string) => ui.stat(label, value, unit),

  // Transaction output
  tx: (signature: string) => {
    console.log(chalk.green('✓') + '  ' + chalk.bold('Transaction') + ': ' + chalk.cyan(signature));
  },

  // Privacy indicator
  private: () => chalk.magenta('🔒 PRIVATE'),
  public: () => chalk.gray('PUBLIC'),

  // Config display
  config: (title: string, config: Record<string, any>) => ui.config(title, config),

  // Summary
  summary: (title: string, items: Array<{ label: string; value: string | number; color?: 'green' | 'cyan' | 'yellow' }>) => ui.summary(title, items),

  // Table
  table: (headers: string[], rows: (string | number)[][], options?: { borders?: boolean; colWidths?: number[] }) => ui.table(headers, rows, options),

  // Status
  status: (label: string, value: string, icon?: string) => ui.status(label, value, icon),
  privacy: (enabled: boolean, label?: string) => ui.privacy(enabled, label),

  // Utilities
  newline: (count?: number) => ui.newline(count),
  clear: () => ui.clear(),
  progress: (label: string, current: number, total: number, width?: number) => ui.progress(label, current, total, width),
};
