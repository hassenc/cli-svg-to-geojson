import type { Command } from 'commander';
import commands from './commands';

export const initCommands = (program: Command): void => Object.values(commands).forEach((cmd) => cmd(program));
