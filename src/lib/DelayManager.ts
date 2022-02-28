
class DelayManager {
  private baseDelayIncrementMs: number;
  private maxDelayMs: number;
  private multiplier: number;
  private currentDelayMs = 0;

  // constructor(baseIncrementMs:number = 200, maxMs:number = 30000, multiplier:number = 0)
  // Parameters:
  //    baseIncrementMs: the base number of milliseconds to when incrementing the timer
  //        The increment function multiplies this value by multipler or current delay / baseIncrementMs
  //    maxMs: the maximum delay in milliseconds
  //    multiplier: a fixed multiplier value
  //        If not provided, will be calculated as current delay / baseIncrementMs each increment
  //
  public constructor (baseIncrementMs:number = 200, maxMs:number = 30000, multiplier:number = 0) {
    this.baseDelayIncrementMs = baseIncrementMs;
    this.maxDelayMs = maxMs;
    this.multiplier = multiplier;
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
    // when baseDelayIncrementMs = 200 and currentDelayMs = 0, incremement by base (current = 200)
    // when current = 200, increment by (current/base => 2) + 1 => 2 * base (current = 600)
    // when current = 600, increment 3 + 1 => 4 * base (current = 1200)
    // until calculated value is > maxDelayMs, then maxDelayMs
    const multiplier = ((this.multiplier > 0) ? this.multiplier : (this.currentDelayMs / this.baseDelayIncrementMs) + 1);
    this.currentDelayMs = Math.min(this.maxDelayMs, this.currentDelayMs + (multiplier * this.baseDelayIncrementMs));
  }

  // resetDelay(): void
  //   sets the delay time to 0
  //
  public resetDelay(): void {
    this.currentDelayMs = 0
  }
}