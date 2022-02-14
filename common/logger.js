const { logger } = require('@azure/storage-queue');
const chalk = require('chalk');

const logLevels = {
  VERBOSE: 'VERBOSE',
  INFO: 'INFO',
  OK: 'OK',
  WARN: 'WARN',
  ERROR: 'ERROR',
  DIVIDER: 'DIVIDER'
};
  
function log(logLevel, message) {
  const now = new Date();

  switch (logLevel) {
    case logLevels.VERBOSE:
      console.log(chalk.white(`VERBOSE | ${now.toISOString()} | ${message}`));
      break;
    case logLevels.INFO:
      console.log(chalk.whiteBright(`INFO | ${now.toISOString()} | ${message}`));
      break;
    case logLevels.OK:
      console.log(chalk.greenBright(`OK | ${now.toISOString()} | ${message}`));
      break;
    case logLevels.WARN:
      console.log(chalk.yellow(`WARN | ${now.toISOString()} | ${message}`));
      break;
    case logLevels.ERROR:
      console.log(chalk.redBright(`\nWARN | ${now.toISOString()} | ${message}\n`));
      break;
    case logLevels.DIVIDER:
      console.log(chalk.magentaBright(`\n${'-'.repeat(50)}\n`));
      break;
    default:
      console.log(chalk.bgRed(`UNKNOWN | ${now.toISOString()} | ${message}`));
  }
}

module.exports = {
  logger: { logLevels, log }
};