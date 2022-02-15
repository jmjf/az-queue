// const { logger } = require('@azure/storage-queue');
import chalk from 'chalk';

enum LogLevels {
  VERBOSE = 'VERBOSE',
  INFO = 'INFO',
  OK = 'OK',
  WARN = 'WARN',
  ERROR = 'ERROR',
  DIVIDER = 'DIVIDER'
}
  
function log(logLevel: LogLevels, message?: string): void {
  const now = new Date();

  switch (logLevel) {
    case LogLevels.VERBOSE:
      console.log(chalk.white(`VERBOSE | ${now.toISOString()} | ${message}`));
      break;
    case LogLevels.INFO:
      console.log(chalk.whiteBright(`INFO | ${now.toISOString()} | ${message}`));
      break;
    case LogLevels.OK:
      console.log(chalk.greenBright(`OK | ${now.toISOString()} | ${message}`));
      break;
    case LogLevels.WARN:
      console.log(chalk.yellow(`WARN | ${now.toISOString()} | ${message}`));
      break;
    case LogLevels.ERROR:
      console.log(chalk.redBright(`\nWARN | ${now.toISOString()} | ${message}\n`));
      break;
    case LogLevels.DIVIDER:
      console.log(chalk.magentaBright(`\n${'-'.repeat(50)}\n`));
      break;
    default:
      console.log(chalk.bgRed(`UNKNOWN | ${now.toISOString()} | ${message}`));
  }
}

export {
  LogLevels,
  log
};