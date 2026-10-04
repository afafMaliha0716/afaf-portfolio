// Fetches public LeetCode stats for one user and writes data/leetcode.json.
// Run by .github/workflows/leetcode.yml every hour. The site reads the JSON.
//
//   node scripts/sync-leetcode.mjs <username>

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const ENDPOINT = 'https://leetcode.com/graphql';
const OUT = new URL('../data/leetcode.json', import.meta.url);
const CALENDAR_DAYS = 200;

const QUERY = `
  query profile($username: String!, $limit: Int!) {
    allQuestionsCount { difficulty count }
    matchedUser(username: $username) {
      username
      submitStatsGlobal { acSubmissionNum { difficulty count } }
      userCalendar { streak totalActiveDays submissionCalendar }
    }
    recentAcSubmissionList(username: $username, limit: $limit) {
      title
      titleSlug
      timestamp
    }
  }`;

/** [{difficulty: "Easy", count: 3}, ...] -> {all, easy, medium, hard} */
function byDifficulty(rows) {
  const out = { all: 0, easy: 0, medium: 0, hard: 0 };
  for (const { difficulty, count } of rows ?? []) {
    const key = difficulty.toLowerCase();
    if (key in out) out[key] = count;
  }
  return out;
}

/** Turns LeetCode's GraphQL response into the small shape the site needs. */
export function transform(response, now = new Date()) {
  const user = response?.data?.matchedUser;
  if (!user) {
    const reason = response?.errors?.[0]?.message ?? 'user not found';
    throw new Error(`LeetCode returned no profile: ${reason}`);
  }

  // submissionCalendar is a JSON string of {"<unix seconds at UTC midnight>": count}.
  const raw = JSON.parse(user.userCalendar?.submissionCalendar || '{}');
  const cutoff = now.getTime() / 1000 - CALENDAR_DAYS * 86_400;
  const calendar = {};
  for (const [seconds, count] of Object.entries(raw).sort(([a], [b]) => a - b)) {
    if (Number(seconds) < cutoff) continue;
    calendar[new Date(Number(seconds) * 1000).toISOString().slice(0, 10)] = count;
  }

  return {
    username: user.username,
    solved: byDifficulty(user.submitStatsGlobal?.acSubmissionNum),
    totals: byDifficulty(response.data.allQuestionsCount),
    streak: user.userCalendar?.streak ?? 0,
    activeDays: user.userCalendar?.totalActiveDays ?? 0,
    calendar,
    recent: (response.data.recentAcSubmissionList ?? []).map((s) => ({
      title: s.title,
      slug: s.titleSlug,
      timestamp: Number(s.timestamp),
    })),
  };
}

async function fetchProfile(username) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Referer: `https://leetcode.com/u/${username}/`,
      'User-Agent': 'Mozilla/5.0 (compatible; portfolio-leetcode-sync)',
    },
    body: JSON.stringify({ query: QUERY, variables: { username, limit: 20 } }),
  });
  if (!response.ok) throw new Error(`LeetCode responded ${response.status}`);
  return response.json();
}

async function main() {
  const username = process.argv[2] || process.env.LEETCODE_USERNAME;
  if (!username) throw new Error('Usage: node scripts/sync-leetcode.mjs <username>');

  const data = transform(await fetchProfile(username));

  // Only rewrite the file when the stats changed, so the repo history
  // gets a commit when a problem is solved, not every hour.
  let previous = null;
  try {
    previous = JSON.parse(await readFile(OUT, 'utf8'));
  } catch {
    // First run: no file yet.
  }
  const { syncedAt: _ignored, ...previousData } = previous ?? {};
  if (previous && JSON.stringify(previousData) === JSON.stringify(data)) {
    console.log(`No change: ${data.solved.all} solved, ${data.streak}-day streak.`);
    return;
  }

  await mkdir(new URL('.', OUT), { recursive: true });
  await writeFile(OUT, JSON.stringify({ ...data, syncedAt: new Date().toISOString() }, null, 2) + '\n');
  console.log(`Updated: ${data.solved.all} solved, ${data.streak}-day streak.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(1);
  });
}
