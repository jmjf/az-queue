// const { logger } = require('@azure/storage-queue');
import chalk from 'chalk';

class Logger {

  private static logLevels = {
    verbose: { colorFn: chalk.white, levelTx: 'VERBOSE', separate: false },
    info: { colorFn: chalk.whiteBright, levelTx: 'INFO', separate: false },
    ok: { colorFn: chalk.greenBright, levelTx: 'OK', separate: false },
    warning: { colorFn: chalk.yellow, levelTx: 'WARNING', separate: false },
    error: { colorFn: chalk.redBright, levelTx: 'ERROR', separate: true },
    unknown: { colorFn: chalk.bgRed, levelTx: 'UNKNOWN', separate: true }
  }

  private writeLog(level: string, message: string): void {
    
    if (!Logger.logLevels[level]) { level = 'unknown' };

    if (Logger.logLevels[level].separate) { console.log() }    // blank line 
    console.log(Logger.logLevels[level].colorFn(`${Logger.logLevels[level].levelTx} | ${(new Date()).toISOString()} | ${message}`));
    if (Logger.logLevels[level].separate) { console.log() }    // blank line 
  }

  public verbose(message: string): void { this.writeLog('verbose', message); }
  public info(message: string): void { this.writeLog('info', message); }
  public ok(message: string): void { this.writeLog('ok', message); }
  public warning(message: string): void { this.writeLog('warning', message); }
  public error(message: string): void { this.writeLog('error', message); }
  
  public divider(): void {
    console.log(chalk.magentaBright(`\n${'-'.repeat(50)}\n`));
  }
}

export { Logger }