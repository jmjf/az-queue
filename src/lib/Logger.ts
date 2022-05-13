// const { logger } = require('@azure/storage-queue');
import chalk from 'chalk';

export class Logger {

  // eslint-disable-next-line @typescript-eslint/ban-types
  private writeLog: Function;

  // eslint-disable-next-line @typescript-eslint/ban-types
  constructor(logFunction?: Function) {
    this.writeLog = logFunction || console.log;
  }

  private static logLevels = {
    verbose: { colorFn: chalk.white, levelTx: 'VERBOSE', separate: false },
    info: { colorFn: chalk.whiteBright, levelTx: 'INFO', separate: false },
    ok: { colorFn: chalk.greenBright, levelTx: 'OK', separate: false },
    warning: { colorFn: chalk.yellow, levelTx: 'WARNING', separate: false },
    error: { colorFn: chalk.redBright, levelTx: 'ERROR', separate: true },
    unknown: { colorFn: chalk.bgRed, levelTx: 'UNKNOWN', separate: true }
  }

  private log(level: string, message: string): void {
    
    if (!Logger.logLevels[level]) { level = 'unknown' }

    if (Logger.logLevels[level].separate) { this.writeLog() }    // blank line 
    this.writeLog(Logger.logLevels[level].colorFn(`${Logger.logLevels[level].levelTx} | ${(new Date()).toISOString()} | ${message}`));
    if (Logger.logLevels[level].separate) { this.writeLog() }    // blank line 
  }

  public verbose(message: string): void { this.log('verbose', message); }
  public info(message: string): void { this.log('info', message); }
  public ok(message: string): void { this.log('ok', message); }
  public warning(message: string): void { this.log('warning', message); }
  public error(message: string): void { this.log('error', message); }
  
  public divider(): void {
    this.writeLog(chalk.magentaBright(`\n${'-'.repeat(50)}\n`));
  }
}