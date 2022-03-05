import { DelayManager } from '../src/lib/DelayManager';
import { IDelayManagerConfig } from '../src/interfaces/IDelayManagerConfig';

describe('DelayManager', () => {
  describe('incrementDelay', () => {
    test('gets expected results for default config', () => {
      const delayManager = new DelayManager();

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(200);
      
      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(600);

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(1400);
    });

    test('gets expected results for custom config', () => {
      const config = <IDelayManagerConfig>{
        baseDelayIncrementMs: 250,
        maxDelayMs: 2000,  // also confirms we don't go over max
        multiplier: 3
      };
      const delayManager = new DelayManager(config);

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(750);
      
      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(1500);

      delayManager.incrementDelay();
      expect(delayManager.currentDelayMs).toBe(2000);  // calculated delay should be 2250, so this means max is limiting
    });
  })
  
  describe('resetDelay', () => {
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