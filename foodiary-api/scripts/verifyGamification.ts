import 'reflect-metadata';

import assert from 'node:assert/strict';

import { Achievement } from '@application/entities/Achievement';
import { AchievementEvaluator } from '@application/services/AchievementEvaluator';
import { StreakCalculator } from '@application/services/StreakCalculator';
import { addDays, startOfWeek } from '@application/shared/localDate';

const today = '2026-10-20';
const range = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, index) => addDays(today, -(to - index)));

function main() {
  assert.equal(startOfWeek('2026-10-20'), '2026-10-19');
  assert.equal(startOfWeek('2026-10-19'), '2026-10-19');
  assert.equal(startOfWeek('2026-10-25'), '2026-10-19');

  assert.deepEqual(StreakCalculator.calculate([], today), {
    currentStreak: 0, bestStreak: 0, loggedToday: false, freezesAvailable: 0, daysUntilNextFreeze: 7, frozenDates: [],
  });

  // Today stays open; future days are ignored.
  const open = StreakCalculator.calculate([...range(1, 3), addDays(today, 1)], today);
  assert.equal(open.currentStreak, 3);
  assert.equal(open.loggedToday, false);

  // A missed day without freezes restarts the streak.
  const broken = StreakCalculator.calculate([...range(4, 8), ...range(1, 2)], today);
  assert.deepEqual([broken.currentStreak, broken.bestStreak, broken.daysUntilNextFreeze], [2, 5, 5]);

  // Seven logged days earn a freeze; missed days spend them without adding to the streak.
  const bridged = StreakCalculator.calculate([...range(11, 20), ...range(3, 9), addDays(today, -1)], today);
  assert.deepEqual(bridged, {
    currentStreak: 18,
    bestStreak: 18,
    loggedToday: false,
    freezesAvailable: 0,
    daysUntilNextFreeze: 3,
    frozenDates: [addDays(today, -10), addDays(today, -2)],
  });

  // Two missed days in a row need two freezes.
  const twoMissed = StreakCalculator.calculate([...range(3, 16), today], today);
  assert.deepEqual([twoMissed.currentStreak, twoMissed.freezesAvailable, twoMissed.frozenDates.length], [15, 0, 2]);
  const threeMissed = StreakCalculator.calculate([...range(4, 17), today], today);
  assert.deepEqual([threeMissed.currentStreak, threeMissed.bestStreak], [1, 14]);

  // Freezes cap at two and stop accruing while full.
  const capped = StreakCalculator.calculate(range(0, 29), today);
  assert.deepEqual([capped.currentStreak, capped.freezesAvailable, capped.daysUntilNextFreeze], [30, 2, null]);

  const noFacts: AchievementEvaluator.Facts = {
    mealCount: 0,
    bestStreak: 0,
    loggedDays: [],
    weightLogDates: [],
    weightGoalPercent: null,
    weightGoalReached: false,
    hasSavedFood: false,
    hasPictureMeal: false,
    hasAudioMeal: false,
  };
  const { Code } = Achievement;
  assert.deepEqual(AchievementEvaluator.evaluate(noFacts), []);
  assert.deepEqual(AchievementEvaluator.evaluate({
    ...noFacts,
    mealCount: 3,
    bestStreak: 30,
    // Four days in one week and three in the next: no week reaches five.
    loggedDays: ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05', '2026-10-06', '2026-10-07'],
    weightLogDates: ['2026-09-21', '2026-09-30', '2026-10-05', '2026-10-18'],
    weightGoalPercent: 60,
    hasPictureMeal: true,
  }), [Code.FIRST_MEAL, Code.STREAK_7, Code.STREAK_30, Code.WEIGH_IN_4_WEEKS, Code.WEIGHT_GOAL_25, Code.WEIGHT_GOAL_50, Code.PICTURE_MEAL]);
  assert.deepEqual(AchievementEvaluator.evaluate({
    ...noFacts,
    loggedDays: ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-11'],
    // A skipped week breaks the weigh-in run.
    weightLogDates: ['2026-09-07', '2026-09-14', '2026-09-28', '2026-10-05'],
    weightGoalReached: true,
    hasSavedFood: true,
    hasAudioMeal: true,
  }), [
    Code.WEEKLY_TARGET, Code.WEIGHT_GOAL_25, Code.WEIGHT_GOAL_50, Code.WEIGHT_GOAL_75,
    Code.WEIGHT_GOAL_REACHED, Code.SAVED_FOOD, Code.AUDIO_MEAL,
  ]);

  console.log('Streak freezes and achievement rules: OK');
}

main();
