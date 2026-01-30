import { ui } from './ui';

export const logger = {
  // Messages
  info: (message: string) => ui.info(message),
  success: (message: string) => ui.success(message),
  warning: (message: string) => ui.warning(message),
  error: (message: string) => ui.error(message),

  // Headers
  header: (title: string, subtitle?: string) => ui.header(title, subtitle),
  subheader: (title: string) => ui.subheader(title),

  // Panels
  configPanel: (title: string, items: Array<{ label: string; value: string | boolean; badge?: string }>) => ui.configPanel(title, items),
  sectionBox: (title: string, content: string[]) => ui.sectionBox(title, content),

  // Display
  keyValue: (key: string, value: string, color?: 'green' | 'cyan' | 'yellow' | 'red') => ui.keyValue(key, value, color),
  stat: (label: string, value: string, unit?: string, highlight?: boolean) => ui.stat(label, value, unit, highlight),

  // Tables & summaries
  table: (headers: string[], rows: (string | number)[][], options?: { colWidths?: number[]; highlight?: number[] }) => ui.table(headers, rows, options),
  resultSummary: (title: string, items: Array<{ label: string; value: string | number; color?: 'green' | 'yellow' | 'red' | 'cyan' }>) => ui.resultSummary(title, items),

  // Status & progress
  statusBadge: (status: 'active' | 'pending' | 'paused' | 'failed') => ui.statusBadge(status),
  progressBar: (label: string, current: number, total: number, width?: number) => ui.progressBar(label, current, total, width),

  // Alerts
  alertBox: (message: string, type?: 'success' | 'warning' | 'error') => ui.alertBox(message, type as 'success'),
  alert: (message: string, type?: 'info' | 'warning' | 'error' | 'success') => ui.alertBox(message, type as any),

  // Transactions
  txDetails: (options: { hash: string; status: 'success' | 'pending' | 'failed'; amount?: string; from?: string; to?: string; fee?: string; time?: string }) => ui.txDetails(options),
  tx: (signature: string) => ui.txDetails({ hash: signature, status: 'success' }),

  // Utilities
  newline: (count?: number) => ui.newline(count),
  clear: () => ui.clear(),
  highlight: (text: string) => ui.highlight(text),
  muted: (text: string) => ui.muted(text),

  // Backward compatibility
  summary: (title: string, items: Array<{ label: string; value: string | number; color?: string }>) => {
    const converted = items.map(item => ({
      ...item,
      color: (item.color === 'green' ? 'green' : item.color === 'cyan' ? 'cyan' : 'yellow') as 'green' | 'yellow' | 'red' | 'cyan',
    }));
    ui.resultSummary(title, converted);
  },

  box: (content: string, title?: string) => {
    if (title) {
      ui.sectionBox(title, content.split('\n'));
    } else {
      ui.sectionBox('', content.split('\n'));
    }
  },

  config: (title: string, config: Record<string, any>) => {
    const items = Object.entries(config).map(([key, value]) => ({
      label: key,
      value: typeof value === 'boolean' ? value : String(value),
    }));
    ui.configPanel(title, items);
  },

  private: () => '🔒 PRIVATE',
  public: () => '🔓 PUBLIC',
};
