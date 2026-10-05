// Reads a clone of my NeetCode solutions repo and writes data/neetcode.json.
// NeetCode's GitHub Sync commits every submission to that repo, so its git
// history is the record of what I solved and when. Run hourly by
// .github/workflows/neetcode.yml. The site reads the JSON.
//
//   node scripts/sync-neetcode.mjs <path to clone> [owner/repo]

import { execFileSync } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const OUT = new URL('../data/neetcode.json', import.meta.url);
const TIME_ZONE = 'America/Chicago';
const CALENDAR_DAYS = 200;
const RECENT = 20;
const MARK = '@@';

// <topic>/<problem>/submission-<n>.<ext>
const SUBMISSION = /^(.+)\/([^/]+)\/submission-\d+\.[A-Za-z0-9]+$/;

/** "two-integer-sum" or "dynamicArray" -> "Two Integer Sum", "Dynamic Array" */
export function titleFromSlug(slug) {
  return slug
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ');
}

const dayOf = (seconds) =>
  new Date(seconds * 1000).toLocaleDateString('en-CA', { timeZone: TIME_ZONE });

/**
 * Turns `git log --diff-filter=A --name-only --format=@@%at` output into the
 * small shape the site needs. Each added submission file is one submission.
 */
export function transform(log, now = new Date()) {
  const problems = new Map(); // slug -> { title, slug, topic, timestamp }
  const calendar = {};
  const cutoff = now.getTime() / 1000 - CALENDAR_DAYS * 86_400;
  let timestamp = 0;

  for (const line of log.split('\n')) {
    if (line.startsWith(MARK)) {
      timestamp = Number(line.slice(MARK.length));
      continue;
    }
    const match = SUBMISSION.exec(line.trim());
    if (!match || !timestamp) continue;
    const [, topic, slug] = match;

    const known = problems.get(slug);
    if (!known || timestamp > known.timestamp) {
      problems.set(slug, { title: titleFromSlug(slug), slug, topic, timestamp });
    }
    if (timestamp >= cutoff) {
      const day = dayOf(timestamp);
      calendar[day] = (calendar[day] ?? 0) + 1;
    }
  }

  const newestFirst = [...problems.values()].sort((a, b) => b.timestamp - a.timestamp);
  return {
    solved: problems.size,
    calendar: Object.fromEntries(Object.entries(calendar).sort(([a], [b]) => a.localeCompare(b))),
    recent: newestFirst.slice(0, RECENT),
  };
}

function readLog(repoPath) {
  return execFileSync(
    'git',
    ['-c', 'core.quotePath=false', '-C', repoPath, 'log', '--diff-filter=A', '--name-only', `--format=${MARK}%at`],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
}

async function main() {
  const [repoPath, repo = 'afafMaliha0716/neetcode-submissions'] = process.argv.slice(2);
  if (!repoPath) throw new Error('Usage: node scripts/sync-neetcode.mjs <path to clone> [owner/repo]');

  const data = { repo, ...transform(readLog(repoPath)) };

  // Only rewrite the file when something changed, so the repo history
  // gets a commit when a problem is solved, not every hour.
  let previous = null;
  try {
    previous = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    // First run: no file yet.
  }
  const { syncedAt: _ignored, ...previousData } = previous ?? {};
  if (previous && JSON.stringify(previousData) === JSON.stringify(data)) {
    console.log(`No change: ${data.solved} solved.`);
    return;
  }

  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ ...data, syncedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(`Updated: ${data.solved} solved.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
