import { describe, expect, it } from 'vitest';
import { computeNextRunAt, describeSchedule } from './scheduler';

// Wed 2025-01-15 10:00 UTC (Wednesday = day 3)
const FROM = new Date(Date.UTC(2025, 0, 15, 10, 0, 0));

describe('computeNextRunAt', () => {
  it('daily: same day if hour is still ahead', () => {
    const r = computeNextRunAt('DAILY', 12, 0, 1, FROM);
    expect(r.toISOString()).toBe('2025-01-15T12:00:00.000Z');
  });

  it('daily: tomorrow if hour already passed', () => {
    const r = computeNextRunAt('DAILY', 9, 0, 1, FROM);
    expect(r.toISOString()).toBe('2025-01-16T09:00:00.000Z');
  });

  it('weekly: rolls forward to the target weekday', () => {
    // Friday (5) at 9 → Jan 17
    const r = computeNextRunAt('WEEKLY', 9, 5, 1, FROM);
    expect(r.toISOString()).toBe('2025-01-17T09:00:00.000Z');
  });

  it('weekly: same weekday but past hour → next week', () => {
    // Wednesday (3) at 9, already past → Jan 22
    const r = computeNextRunAt('WEEKLY', 9, 3, 1, FROM);
    expect(r.toISOString()).toBe('2025-01-22T09:00:00.000Z');
  });

  it('monthly: same month if day+hour still ahead', () => {
    const r = computeNextRunAt('MONTHLY', 9, 0, 20, FROM);
    expect(r.toISOString()).toBe('2025-01-20T09:00:00.000Z');
  });

  it('monthly: next month if day already passed', () => {
    const r = computeNextRunAt('MONTHLY', 9, 0, 10, FROM);
    expect(r.toISOString()).toBe('2025-02-10T09:00:00.000Z');
  });

  it('clamps out-of-range inputs', () => {
    const r = computeNextRunAt('DAILY', 99, 0, 1, FROM);
    expect(r.getUTCHours()).toBe(23);
  });
});

describe('describeSchedule', () => {
  it('renders human-readable strings', () => {
    expect(describeSchedule('DAILY', 9, 0, 1)).toBe('Daily at 09:00 UTC');
    expect(describeSchedule('WEEKLY', 14, 3, 1)).toBe('Weekly on Wed at 14:00 UTC');
    expect(describeSchedule('MONTHLY', 6, 0, 15)).toBe('Monthly on day 15 at 06:00 UTC');
  });
});
