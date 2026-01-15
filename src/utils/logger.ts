import chalk from 'chalk';

export const logger = {
  info: (message: string) => console.log(chalk.blue('ℹ'), message),
  success: (message: string) => console.log(chalk.green('✓'), message),
  warning: (message: string) => console.log(chalk.yellow('⚠'), message),
  error: (message: string) => console.log(chalk.red('✗'), message),

  // Styled outputs
  header: (message: string) => console.log(chalk.bold.cyan(`\n${message}\n`)),

  // Table-like output
  keyValue: (key: string, value: string) => {
    console.log(`  ${chalk.gray(key + ':')} ${value}`);
  },

  // Transaction output
  tx: (signature: string) => {
    console.log(chalk.green('✓'), 'Transaction:', chalk.underline(signature));
  },

  // Privacy indicator
  private: () => chalk.magenta('🔒 PRIVATE'),
  public: () => chalk.gray('PUBLIC'),
};
