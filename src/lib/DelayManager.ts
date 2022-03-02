
class DelayManager {
  private _baseDelayIncrementMs: number;
  private _maxDelayMs: number;
  private _multiplier: number;
  private _currentDelayMs: number;

  // constructor(baseIncrementMs:number = 200, maxMs:number = 30000, multiplier:number = 0)
  // Parameters:
  //    baseIncrementMs: the base number of milliseconds to when incrementing the timer
  //        The increment function multiplies this value by multipler or current delay / baseIncrementMs
  //    maxMs: the maximum delay in milliseconds
  //    multiplier: a fixed multiplier value
  //        If not provided, will be calculated as current delay / baseIncrementMs each increment
  //
  public constructor (baseIncrementMs:number = 200, maxMs:number = 30000, multiplier:number = 0) {
    this._baseDelayIncrementMs = baseIncrementMs;
    this._currentDelayMs = baseIncrementMs;
    this._maxDelayMs = maxMs;
    this._multiplier = multiplier;
  }

  public get currentDelayMs(): number {
    return this._currentDelayMs;
  }
  // async delay(): Promise<void>
  //   returns a Promise that represents a delay; await to wait for the delay
  //
  public async delay(): Promise<void> { 
    return new Promise(res => setTimeout(res, this.currentDelayMs));
  }
  
  // incrementDelay(): void
  //   increments the delay based on parameters provided in the constructor
  // 
  public incrementDelay(): void {
    // when _baseDelayIncrementMs = 200 and currentDelayMs = 0, incremement by base (current = 200)
    // when current = 200, increment by (current/base => 2) + 1 => 2 * base (current = 600)
    // when current = 600, increment 3 + 1 => 4 * base (current = 1200)
    // until calculated value is > _maxDelayMs, then _maxDelayMs
    const multiplier = ((this._multiplier > 0) ? this._multiplier : (this.currentDelayMs / this._baseDelayIncrementMs) + 1);
    this._currentDelayMs = Math.min(this._maxDelayMs, this.currentDelayMs + (multiplier * this._baseDelayIncrementMs));
  }

  // resetDelay(): void
  //   sets the delay time to _baseDelayIncrementMs
  //
  public resetDelay(): void {
    this._currentDelayMs = this._baseDelayIncrementMs
  }
}