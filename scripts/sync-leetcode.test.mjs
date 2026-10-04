import { test } from 'node:test';
import assert from 'node:assert/strict';

import { transform } from './sync-leetcode.mjs';

const NOW = new Date('2026-10-04T12:00:00Z');
const day = (iso) => String(Date.parse(`${iso}T00:00:00Z`) / 1000);

function response(overrides = {}) {
  return {
    data: {
      allQuestionsCount: [
        { difficulty: 'All', count: 3700 },
        { difficulty: 'Easy', count: 900 },
        { difficulty: 'Medium', count: 1950 },
        { difficulty: 'Hard', count: 850 },
      ],
      matchedUser: {
        username: 'afafMaliha0716',
        submitStatsGlobal: {
          acSubmissionNum: [
            { difficulty: 'All', count: 42 },
            { difficulty: 'Easy', count: 30 },
            { difficulty: 'Medium', count: 11 },
            { difficulty: 'Hard', count: 1 },
          ],
        },
        userCalendar: {
          streak: 3,
          totalActiveDays: 25,
          submissionCalendar: JSON.stringify({
            [day('2026-10-03')]: 4,
            [day('2026-10-02')]: 1,
            [day('2025-01-01')]: 9,
          }),
        },
      },
      recentAcSubmissionList: [
        { title: 'Two Sum', titleSlug: 'two-sum', timestamp: '1791000000' },
      ],
      ...overrides,
    },
  };
}

test('maps counts by difficulty', () => {
  const data = transform(response(), NOW);
  assert.deepEqual(data.solved, { all: 42, easy: 30, medium: 11, hard: 1 });
  assert.deepEqual(data.totals, { all: 3700, easy: 900, medium: 1950, hard: 850 });
  assert.equal(data.username, 'afafMaliha0716');
  assert.equal(data.streak, 3);
  assert.equal(data.activeDays, 25);
});

test('calendar is keyed by date, sorted, and drops old days', () => {
  const data = transform(response(), NOW);
  assert.deepEqual(data.calendar, { '2026-10-02': 1, '2026-10-03': 4 });
  assert.deepEqual(Object.keys(data.calendar), ['2026-10-02', '2026-10-03']);
});

test('recent solves keep title, slug, and a numeric timestamp', () => {
  const data = transform(response(), NOW);
  assert.deepEqual(data.recent, [{ title: 'Two Sum', slug: 'two-sum', timestamp: 1791000000 }]);
});

test('a profile with no activity still produces a valid shape', () => {
  const empty = response({
    matchedUser: {
      username: 'new',
      submitStatsGlobal: { acSubmissionNum: [] },
      userCalendar: { streak: 0, totalActiveDays: 0, submissionCalendar: '{}' },
    },
    recentAcSubmissionList: [],
  });
  const data = transform(empty, NOW);
  assert.deepEqual(data.solved, { all: 0, easy: 0, medium: 0, hard: 0 });
  assert.deepEqual(data.calendar, {});
  assert.deepEqual(data.recent, []);
});

test('an unknown username is an error, not an empty file', () => {
  const missing = { data: { matchedUser: null }, errors: [{ message: 'That user does not exist.' }] };
  assert.throws(() => transform(missing, NOW), /That user does not exist/);
});
