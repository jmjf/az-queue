import { DelayManager, IDelayManagerConfig } from '../src/lib/DelayManager';

describe('DelayManager', () => {

  // incrementDelay() also tests constructor for default and custom configurations

  describe('incrementDelay()', () => {
    test('gets expected results for default config', () => {
      const delayManager = new DelayManager();

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(200);
      
      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(600);

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(1400);

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(3000);      
    });

    test('gets expected results for custom config', () => {
      const config = <IDelayManagerConfig>{
        baseDelayIncrementMs: 250,
        maxDelayMs: 2500,
        multiplier: 3
      };
      const delayManager = new DelayManager(config);

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(750);
      
      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(1500);

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(2250);

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(2500);  // 2250 + 750 = 3000, so 2500 means limited

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(2500);  // and subsequent increments don't increment above max
    });
  })
  
  describe('resetDelay()', () => {
    test('resets delay to 0', () => {
      const delayManager = new DelayManager();

      delayManager.incrementDelay();
      delayManager.incrementDelay();
      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBeGreaterThan(0);
      
      delayManager.resetDelay();
      expect(delayManager.currentDelayMs).toBe(0);
    })
  })
})