import assert from 'node:assert/strict';
import { test } from 'node:test';
import { titleFromSlug, transform } from './sync-neetcode.mjs';

// 2026-10-05 12:00 in Chicago (UTC-5).
const NOON = Date.UTC(2026, 9, 5, 17) / 1000;
const NOW = new Date((NOON + 3600) * 1000);
const DSA = 'Data Structures & Algorithms';

const log = (...commits) =>
  commits.map(([at, ...files]) => `@@${at}\n\n${files.join('\n')}\n`).join('\n');

test('titles come from the problem folder name', () => {
  assert.equal(titleFromSlug('two-integer-sum'), 'Two Integer Sum');
  assert.equal(titleFromSlug('dynamicArray'), 'Dynamic Array');
});

test('several submissions to one problem count as one solved problem', () => {
  const out = transform(
    log(
      [NOON + 60, `${DSA}/two-integer-sum/submission-1.java`],
      [NOON, `${DSA}/two-integer-sum/submission-0.java`],
    ),
    NOW,
  );
  assert.equal(out.solved, 1);
  assert.equal(out.recent[0].timestamp, NOON + 60);
  assert.deepEqual(out.calendar, { '2026-10-05': 2 });
});

test('recent is newest first and a bulk sync lists every file it added', () => {
  const out = transform(
    log(
      [NOON, `${DSA}/is-anagram/submission-0.java`],
      [NOON - 86_400, `${DSA}/dynamicArray/submission-0.py`, `${DSA}/duplicate-integer/submission-0.java`],
    ),
    NOW,
  );
  assert.equal(out.solved, 3);
  assert.equal(out.recent[0].slug, 'is-anagram');
  assert.equal(out.recent[0].topic, DSA);
  assert.deepEqual(out.calendar, { '2026-10-04': 2, '2026-10-05': 1 });
});

test('days are counted in Central time, not UTC', () => {
  // 11pm Oct 4 in Chicago is already Oct 5 in UTC.
  const lateNight = Date.UTC(2026, 9, 5, 4) / 1000;
  const out = transform(log([lateNight, `${DSA}/is-anagram/submission-0.java`]), NOW);
  assert.deepEqual(out.calendar, { '2026-10-04': 1 });
});

test('files that are not submissions are ignored', () => {
  const out = transform(log([NOON, 'README.md', `${DSA}/notes.txt`]), NOW);
  assert.equal(out.solved, 0);
  assert.deepEqual(out.recent, []);
});
