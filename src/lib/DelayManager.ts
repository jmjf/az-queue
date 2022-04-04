export interface IDelayManagerConfig {
  baseDelayIncrementMs?: number,
  maxDelayMs?: number,
  multiplier?: number
}
export class DelayManager {
  private _baseDelayIncrementMs: number;
  private _maxDelayMs: number;
  private _multiplier: number;
  private _currentDelayMs: number;

  // constructor(delayManagerConfig?: IDelayManagerConfig)
  // delayManagerConfig attributes:
  //    baseIncrementMs: the base number of milliseconds to when incrementing the timer; default 200
  //        The increment function multiplies this value by multipler or current delay / baseIncrementMs
  //    maxMs: the maximum delay in milliseconds; default (30 * 1000)
  //    multiplier: a fixed multiplier value; default 0
  //        If not provided, will be calculated as current delay / baseIncrementMs each increment
  //
  public constructor (delayManagerConfig?: IDelayManagerConfig) {
    this._baseDelayIncrementMs = delayManagerConfig?.baseDelayIncrementMs || 200;
    this._maxDelayMs = delayManagerConfig?.maxDelayMs || (30 * 1000);
    this._multiplier = delayManagerConfig?.multiplier || 0;
    this._currentDelayMs = 0;
  }

  public get currentDelayMs(): number {
    return this._currentDelayMs;
  }
  // async delay(): Promise<void>
  //   returns a Promise that represents a delay; await to wait for the current delay time
  //
  // UNTESTABLE, CHANGE WITH CARE
  //
  public async delay(): Promise<void> { 
    return new Promise(res => setTimeout(res, this._currentDelayMs));
  }
  
  // incrementDelay(): void
  //   increments the delay based on parameters provided in the constructor
  // 
  public incrementDelay(): void {
    // when _baseDelayIncrementMs = 200 and currentDelayMs = 0, incremement by base (current = 200)
    // when current = 200, increment by (current/base => 2) + 1 => 2 * base (current = 600)
    // when current = 600, increment 3 + 1 => 4 * base (current = 1400)
    // until calculated value is > _maxDelayMs, then _maxDelayMs
    const multiplier = ((this._multiplier > 0) ? this._multiplier : (this.currentDelayMs / this._baseDelayIncrementMs) + 1);
    this._currentDelayMs = Math.min(this._maxDelayMs, this.currentDelayMs + (multiplier * this._baseDelayIncrementMs));
  }

  // resetDelay(): void
  //   sets the delay time to _baseDelayIncrementMs
  //
  public resetDelay(): void {
    this._currentDelayMs = 0;
  }
}