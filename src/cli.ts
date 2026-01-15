#!/usr/bin/env node

import { Command } from 'commander';
import { configCommand } from './commands/config.js';
import { dcaCommand } from './commands/dca.js';
import { swapCommand } from './commands/swap.js';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('private-dca')
  .description('Private DCA toolkit for Solana with Arcium confidential transfers')
  .version('1.0.0');

// Register commands
program.addCommand(configCommand);
program.addCommand(dcaCommand);
program.addCommand(swapCommand);

program.parse();
