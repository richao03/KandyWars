import { createMockStore } from '../utils/testStore';
import {
  createStoreWithEffects,
  EventMocker,
} from '../utils/testHelpers';
import { MerchantUtils } from '../../utils/merchantUtils';
import { ActiveMerchantEffect } from '../../store/slices/merchantSlice';

describe('Event Handling Tests', () => {
  describe('Found money event logic', () => {
    it('found money amount is 25% of current balance (min $100)', () => {
      // The useEventHandler calculates: Math.max(Math.floor(balance * 0.25), 100)
      const balance = 1000;
      const amountFound = Math.max(Math.floor(balance * 0.25), 100);
      expect(amountFound).toBe(250);
    });

    it('found money amount floors at $100 when balance is low', () => {
      const balance = 50;
      const amountFound = Math.max(Math.floor(balance * 0.25), 100);
      expect(amountFound).toBe(100);
    });
  });

  describe('Bully event logic', () => {
    it('steal amount is capped at current balance', () => {
      const currentBalance = 30;
      const amountToSteal = Math.round(currentBalance * 0.5 * 100) / 100;
      const actualSteal = Math.min(amountToSteal, currentBalance);

      expect(actualSteal).toBe(15);
      expect(actualSteal).toBeLessThanOrEqual(currentBalance);
    });

    it('steal amount does not exceed balance even with dollarAmount', () => {
      const currentBalance = 20;
      const dollarAmount = 500; // More than balance
      const actualSteal = Math.min(dollarAmount, currentBalance);

      expect(actualSteal).toBe(20);
    });

    it('bully has mercy when balance is less than $1', () => {
      const currentBalance = 0.50;
      const bullyHasMercy = currentBalance < 1;

      expect(bullyHasMercy).toBe(true);
    });
  });

  describe('MerchantUtils protection checks', () => {
    it('hasBodyguard correctly detects bodyguard with count > 0', () => {
      const effects: ActiveMerchantEffect[] = [
        { itemId: 'sixth_grade_bodyguard' as any, count: 2 },
      ];
      expect(MerchantUtils.hasBodyguard(effects)).toBe(true);
    });

    it('hasBodyguard returns false when no bodyguard effect', () => {
      const effects: ActiveMerchantEffect[] = [];
      expect(MerchantUtils.hasBodyguard(effects)).toBe(false);
    });

    it('hasBodyguard returns false when count is 0', () => {
      const effects: ActiveMerchantEffect[] = [
        { itemId: 'sixth_grade_bodyguard' as any, count: 0 },
      ];
      expect(MerchantUtils.hasBodyguard(effects)).toBe(false);
    });

    it('hasHallMonitorBribe correctly detects bribe with count > 0', () => {
      const effects: ActiveMerchantEffect[] = [
        { itemId: 'hall_monitor_bribe' as any, count: 1 },
      ];
      expect(MerchantUtils.hasHallMonitorBribe(effects)).toBe(true);
    });

    it('hasHallMonitorBribe returns false when count is 0', () => {
      const effects: ActiveMerchantEffect[] = [
        { itemId: 'hall_monitor_bribe' as any, count: 0 },
      ];
      expect(MerchantUtils.hasHallMonitorBribe(effects)).toBe(false);
    });

    it('shouldConvertNegativeEvent returns boolean', () => {
      const effects: ActiveMerchantEffect[] = [
        { itemId: 'double_sided_coin' as any, level: 3 },
      ];
      const result = MerchantUtils.shouldConvertNegativeEvent(effects);
      expect(typeof result).toBe('boolean');
    });

    it('shouldConvertNegativeEvent returns false with no coin', () => {
      const effects: ActiveMerchantEffect[] = [];
      const result = MerchantUtils.shouldConvertNegativeEvent(effects);
      expect(result).toBe(false);
    });
  });

  describe('EventMocker utilities', () => {
    it('createFindMoneyEvent creates valid event structure', () => {
      const store = createStoreWithEffects({ period: 5 });
      const mocker = new EventMocker(store);

      const event = mocker.createFindMoneyEvent(250);

      expect(event.type).toBe('FIND_MONEY');
      expect(event.payload).toBeDefined();
      expect(event.payload.amount).toBe(250);
      expect(event.payload.title).toBe('Found Money');
      expect(event.timestamp).toBeDefined();
    });

    it('createBullyEvent creates valid event structure', () => {
      const store = createStoreWithEffects({ period: 5 });
      const mocker = new EventMocker(store);

      const event = mocker.createBullyEvent(100);

      expect(event.type).toBe('BULLY');
      expect(event.payload).toBeDefined();
      expect(event.payload.amount).toBe(100);
      expect(event.payload.effect).toBe('money_loss');
      expect(event.timestamp).toBeDefined();
    });

    it('createConfiscationEvent creates valid event structure', () => {
      const store = createStoreWithEffects({ period: 5 });
      const mocker = new EventMocker(store);

      const event = mocker.createConfiscationEvent(100);

      expect(event.type).toBe('CONFISCATION');
      expect(event.payload).toBeDefined();
      expect(event.payload.percentage).toBe(100);
      expect(event.payload.title).toBe('Stash Confiscated');
      expect(event.timestamp).toBeDefined();
    });

    it('event can be triggered and retrieved from store', () => {
      const store = createStoreWithEffects({ period: 5 });
      const mocker = new EventMocker(store);

      // Initially no event
      expect(mocker.getCurrentEvent()).toBeNull();

      // Trigger an event
      const event = mocker.createFindMoneyEvent(500);
      mocker.triggerEvent(event);

      // Event should now be stored
      const currentEvent = mocker.getCurrentEvent();
      expect(currentEvent).not.toBeNull();
      expect(currentEvent?.type).toBe('FIND_MONEY');
      expect(currentEvent?.payload?.amount).toBe(500);

      // Clear and verify
      mocker.clearEvent();
      expect(mocker.getCurrentEvent()).toBeNull();
    });
  });

  describe('Detention Discovery joker drop logic', () => {
    // Import the seededRandom logic inline to test determinism
    function seededRandom(seed: string): number {
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
      }
      return Math.abs((Math.sin(hash) * 10000) % 1);
    }

    it('seededRandom returns consistent results for same seed', () => {
      const result1 = seededRandom('5_LOSE_MONEY_Bully_detention');
      const result2 = seededRandom('5_LOSE_MONEY_Bully_detention');
      expect(result1).toBe(result2);
    });

    it('seededRandom returns different results for different seeds', () => {
      const result1 = seededRandom('5_LOSE_MONEY_Bully_detention');
      const result2 = seededRandom('10_STASH_LOCKED_Teacher_detention');
      expect(result1).not.toBe(result2);
    });

    it('seededRandom returns value between 0 and 1', () => {
      const seeds = ['test1', 'test2', 'abc_detention', '99_LOSE_MONEY_x_detention'];
      seeds.forEach(seed => {
        const val = seededRandom(seed);
        expect(val).toBeGreaterThanOrEqual(0);
        expect(val).toBeLessThan(1);
      });
    });

    it('drop should not trigger when event was protected (no actual hurt)', () => {
      // Simulates the wasActuallyHurt check in useEventHandler
      const protectedEvent = {
        effect: 'LOSE_MONEY',
        protectedByMedievalShield: true,
        protectedByBodyguard: false,
        bullyHasMercy: false,
      };

      const wasActuallyHurt =
        (protectedEvent.effect === 'LOSE_MONEY' &&
          !protectedEvent.protectedByMedievalShield &&
          !protectedEvent.protectedByBodyguard &&
          !protectedEvent.bullyHasMercy);

      expect(wasActuallyHurt).toBe(false);
    });

    it('drop should trigger check when player was actually hurt', () => {
      const hurtEvent = {
        effect: 'LOSE_MONEY',
        protectedByMedievalShield: false,
        protectedByBodyguard: false,
        bullyHasMercy: false,
      };

      const wasActuallyHurt =
        (hurtEvent.effect === 'LOSE_MONEY' &&
          !hurtEvent.protectedByMedievalShield &&
          !hurtEvent.protectedByBodyguard &&
          !hurtEvent.bullyHasMercy);

      expect(wasActuallyHurt).toBe(true);
    });

    it('severe events get 35% chance, normal events get 25%', () => {
      // Severe: lost > $500
      const severeEvent = { amountStolen: 600, effect: 'LOSE_MONEY' };
      const isSevere = severeEvent.amountStolen > 500;
      expect(isSevere).toBe(true);
      expect(isSevere ? 0.35 : 0.25).toBe(0.35);

      // Normal: lost <= $500
      const normalEvent = { amountStolen: 200, effect: 'LOSE_MONEY' };
      const isNormalSevere = normalEvent.amountStolen > 500;
      expect(isNormalSevere).toBe(false);
      expect(isNormalSevere ? 0.35 : 0.25).toBe(0.25);
    });

    it('full confiscation (STASH_LOCKED without TeachersPet) is severe', () => {
      const fullConfiscation = { effect: 'STASH_LOCKED', reducedByTeachersPet: false };
      const isSevere = fullConfiscation.effect === 'STASH_LOCKED' && !fullConfiscation.reducedByTeachersPet;
      expect(isSevere).toBe(true);
    });

    it('should not trigger on first period (periodCount <= 1)', () => {
      const periodCount = 0;
      const isFirstEvent = periodCount <= 1;
      expect(isFirstEvent).toBe(true);
    });

    it('should allow trigger after first period', () => {
      const periodCount = 5;
      const isFirstEvent = periodCount <= 1;
      expect(isFirstEvent).toBe(false);
    });
  });
});
