/**
 * Tests for Working Day Calculation Utilities
 *
 * These tests verify the core logic for calculating working days,
 * handling holidays, and ensuring consistency with database calculations.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isWorkingDay,
  getNextWorkingDay,
  getPreviousWorkingDay,
  countWorkingDays,
  calculateEndDateByWorkingDays,
  getWorkingDaysInRange,
  validateDateIsWorkingDay,
  clearCalendarCache
} from '../workingDayCalculators';
import { supabase } from '@/integrations/supabase/client';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn()
  }
}));

const TEST_PROJECT_ID = 'test-project-123';

describe('workingDayCalculators', () => {

  beforeEach(() => {
    clearCalendarCache();
    vi.clearAllMocks();
  });

  describe('isWorkingDay - Calendar Disabled (Default Mon-Fri)', () => {
    beforeEach(() => {
      // Mock project with calendar disabled
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                calendar_enabled: false,
                calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
              },
              error: null
            })
          })
        })
      });
    });

    it('should return true for Monday', async () => {
      expect(await isWorkingDay(TEST_PROJECT_ID, '2025-01-06')).toBe(true);
    });

    it('should return true for Friday', async () => {
      expect(await isWorkingDay(TEST_PROJECT_ID, '2025-01-10')).toBe(true);
    });

    it('should return false for Saturday', async () => {
      expect(await isWorkingDay(TEST_PROJECT_ID, '2025-01-11')).toBe(false);
    });

    it('should return false for Sunday', async () => {
      expect(await isWorkingDay(TEST_PROJECT_ID, '2025-01-12')).toBe(false);
    });
  });

  describe('isWorkingDay - Calendar Enabled with Holidays', () => {
    beforeEach(() => {
      // Mock project with calendar enabled
      const fromMock = vi.fn();
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    calendar_enabled: true,
                    calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
                  },
                  error: null
                })
              })
            })
          };
        } else if (table === 'project_calendar') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    calendar_date: '2025-01-01', // New Year's Day (Wednesday)
                    is_working_day: false,
                    reason: 'New Year\'s Day'
                  },
                  {
                    calendar_date: '2025-01-06', // Holiday on Monday (getDay() = 1)
                    is_working_day: false,
                    reason: 'Company Holiday'
                  }
                ],
                error: null
              })
            })
          };
        }
      });
    });

    it('should return false for holiday on working day', async () => {
      expect(await isWorkingDay(TEST_PROJECT_ID, '2025-01-06')).toBe(false);
    });

    it('should return true for normal working day', async () => {
      expect(await isWorkingDay(TEST_PROJECT_ID, '2025-01-08')).toBe(true);
    });

    it('should return false for weekend even with calendar enabled', async () => {
      expect(await isWorkingDay(TEST_PROJECT_ID, '2025-01-11')).toBe(false);
    });
  });

  describe('getNextWorkingDay', () => {
    beforeEach(() => {
      // Mock calendar disabled (Mon-Fri)
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                calendar_enabled: false,
                calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
              },
              error: null
            })
          })
        })
      });
    });

    it('should return next working day after Friday (skip weekend)', async () => {
      const nextDay = await getNextWorkingDay(TEST_PROJECT_ID, '2025-01-10');
      expect(nextDay.getDay()).toBe(1); // Monday
      expect(nextDay.toISOString().split('T')[0]).toBe('2025-01-13');
    });

    it('should return next day if it is a working day', async () => {
      const nextDay = await getNextWorkingDay(TEST_PROJECT_ID, '2025-01-06');
      expect(nextDay.getDay()).toBe(2); // Tuesday
      expect(nextDay.toISOString().split('T')[0]).toBe('2025-01-07');
    });
  });

  describe('getPreviousWorkingDay', () => {
    beforeEach(() => {
      // Mock calendar disabled (Mon-Fri)
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                calendar_enabled: false,
                calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
              },
              error: null
            })
          })
        })
      });
    });

    it('should return previous working day before Monday (skip weekend)', async () => {
      const prevDay = await getPreviousWorkingDay(TEST_PROJECT_ID, '2025-01-06');
      expect(prevDay.getDay()).toBe(5); // Friday
      expect(prevDay.toISOString().split('T')[0]).toBe('2025-01-03');
    });

    it('should return previous day if it is a working day', async () => {
      const prevDay = await getPreviousWorkingDay(TEST_PROJECT_ID, '2025-01-10');
      expect(prevDay.getDay()).toBe(4); // Thursday
      expect(prevDay.toISOString().split('T')[0]).toBe('2025-01-09');
    });

    it('should return previous working day before Friday (Thursday)', async () => {
      const prevDay = await getPreviousWorkingDay(TEST_PROJECT_ID, '2025-01-10');
      expect(prevDay.getDay()).toBe(4); // Thursday
      expect(prevDay.toISOString().split('T')[0]).toBe('2025-01-09');
    });
  });

  describe('countWorkingDays', () => {
    beforeEach(() => {
      // Mock calendar disabled (Mon-Fri)
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                calendar_enabled: false,
                calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
              },
              error: null
            })
          })
        })
      });
    });

    it('should count 5 working days in a Mon-Fri week', async () => {
      const count = await countWorkingDays(TEST_PROJECT_ID, '2025-01-06', '2025-01-11');
      expect(count).toBe(5);
    });

    it('should count 10 working days in two weeks', async () => {
      const count = await countWorkingDays(TEST_PROJECT_ID, '2025-01-06', '2025-01-18');
      expect(count).toBe(10);
    });

    it('should return 0 for same start and end date', async () => {
      const count = await countWorkingDays(TEST_PROJECT_ID, '2025-01-06', '2025-01-06');
      expect(count).toBe(0);
    });
  });

  describe('calculateEndDateByWorkingDays - CRITICAL', () => {
    beforeEach(() => {
      // Mock calendar disabled (Mon-Fri)
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                calendar_enabled: false,
                calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
              },
              error: null
            })
          })
        })
      });
    });

    it('should calculate end date for 5 working days from Monday', async () => {
      const endDate = await calculateEndDateByWorkingDays(TEST_PROJECT_ID, '2025-01-06', 5);
      expect(endDate.toISOString().split('T')[0]).toBe('2025-01-10');
    });

    it('should calculate end date for 1 working day from Monday', async () => {
      const endDate = await calculateEndDateByWorkingDays(TEST_PROJECT_ID, '2025-01-06', 1);
      expect(endDate.toISOString().split('T')[0]).toBe('2025-01-06');
    });

    it('should calculate end date for 1 working day from Sunday', async () => {
      const endDate = await calculateEndDateByWorkingDays(TEST_PROJECT_ID, '2025-01-05', 1);
      expect(endDate.toISOString().split('T')[0]).toBe('2025-01-06');
    });

    it('should skip weekends when calculating end date', async () => {
      const endDate = await calculateEndDateByWorkingDays(TEST_PROJECT_ID, '2025-01-10', 3);
      expect(endDate.toISOString().split('T')[0]).toBe('2025-01-14');
    });

    it('should return start date for 0 working days', async () => {
      const endDate = await calculateEndDateByWorkingDays(TEST_PROJECT_ID, '2025-01-06', 0);
      expect(endDate.toISOString().split('T')[0]).toBe('2025-01-06');
    });

    it('should handle crossing month boundaries', async () => {
      const endDate = await calculateEndDateByWorkingDays(TEST_PROJECT_ID, '2025-01-31', 2);
      expect(endDate.toISOString().split('T')[0]).toBe('2025-02-03');
    });

    it('should handle single working day across month boundary', async () => {
      const endDate = await calculateEndDateByWorkingDays(TEST_PROJECT_ID, '2025-01-31', 1);
      expect(endDate.toISOString().split('T')[0]).toBe('2025-01-31');
    });
  });

  describe('getWorkingDaysInRange', () => {
    beforeEach(() => {
      // Mock calendar disabled (Mon-Fri)
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                calendar_enabled: false,
                calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
              },
              error: null
            })
          })
        })
      });
    });

    it('should return empty array for weekend range', async () => {
      const workingDays = await getWorkingDaysInRange(TEST_PROJECT_ID, '2025-01-11', '2025-01-12');
      expect(workingDays.length).toBe(0);
    });

    it('should return working days for Mon-Fri range', async () => {
      const workingDays = await getWorkingDaysInRange(TEST_PROJECT_ID, '2025-01-06', '2025-01-10');
      expect(workingDays.length).toBe(5);
      // Should include Monday through Friday
      expect(workingDays[0].getDay()).toBe(1); // Monday
      expect(workingDays[4].getDay()).toBe(5); // Friday
    });
  });

  describe('validateDateIsWorkingDay', () => {
    beforeEach(() => {
      const fromMock = vi.fn();
      (supabase.from as any).mockImplementation((table: string) => {
        if (table === 'projects') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    calendar_enabled: true,
                    calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
                  },
                  error: null
                })
              })
            })
          };
        } else if (table === 'project_calendar') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  {
                    calendar_date: '2025-01-01',
                    is_working_day: false,
                    reason: 'New Year\'s Day'
                  }
                ],
                error: null
              })
            })
          };
        }
      });
    });

    it('should return isWorking: true for working day', async () => {
      const result = await validateDateIsWorkingDay(TEST_PROJECT_ID, '2025-01-06');
      expect(result.isWorking).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should return isWorking: false with reason for holiday', async () => {
      const holiday = new Date('2025-01-01');
      const result = await validateDateIsWorkingDay(TEST_PROJECT_ID, holiday);
      expect(result.isWorking).toBe(false);
      expect(result.reason).toBe('New Year\'s Day');
    });

    it('should return isWorking: false with reason for weekend', async () => {
      const result = await validateDateIsWorkingDay(TEST_PROJECT_ID, '2025-01-11');
      expect(result.isWorking).toBe(false);
      expect(result.reason).toContain('Saturday');
    });
  });

  describe('Edge Cases & Error Handling', () => {
    it('should handle Supabase query errors gracefully', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Connection error' }
            })
          })
        })
      });

      // Should fall back to disabled calendar (Mon-Fri)
      const result = await isWorkingDay(TEST_PROJECT_ID, '2025-01-06');
      expect(result).toBe(true);
    });

    it('should throw error for negative working days', async () => {
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                calendar_enabled: false,
                calendar_default_working_days: 'monday,tuesday,wednesday,thursday,friday'
              },
              error: null
            })
          })
        })
      });

      const monday = new Date('2025-01-06');
      await expect(
        calculateEndDateByWorkingDays(TEST_PROJECT_ID, monday, -5)
      ).rejects.toThrow('Working days must be non-negative');
    });
  });
});