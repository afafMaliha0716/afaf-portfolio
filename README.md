# afaf-portfolio

My portfolio, built to look and work like VS Code, in pink.

**[afafmaliha0716.github.io/afaf-portfolio](https://afafmaliha0716.github.io/afaf-portfolio/)**

![The portfolio: a pink VS Code window with an about file open](preview.png)

## What's in it

| File | Contents |
|------|----------|
| `about.ts` | Who I am and what I'm working on |
| `projects.tsx` | Remi, Crux, FocusDJ, Asteria, and this site |
| `experience.tsx` | Internships and Khidmah Collective |
| `skills.json` | Languages, frameworks, tools, product skills |
| `neetcode.py` | A live NeetCode tracker (see below) |
| `contact.ts` | Email, LinkedIn, GitHub |

## Things to try

Everything on the screen does something.

- **Menu bar:** File, Edit, View, Go, and Run all open real menus. Edit picks
  between four color themes: Night Pink, Day Pink, Lavender Night, and
  Strawberry Matcha.
- **Window buttons:** red closes the window (it comes back), yellow minimizes
  it to a dock, green goes full screen.
- **Terminal:** type `help`. `bloom` grows a flower, `deploy` ships the site,
  `matcha` brews a cup, and `theme matcha` switches themes.
- **Sidebar:** folders open and close, and the source control icon lists this
  repo's real commits, fetched live from GitHub.
- **Command palette:** `Ctrl+Shift+P` opens a fuzzy search over files and
  commands.
- **Keyboard shortcuts:** `Ctrl+1` through `Ctrl+6` jump between files,
  `Ctrl+B` toggles the sidebar, `Ctrl+J` toggles the terminal, and
  `Ctrl +` / `Ctrl -` change the text size.
- **Zen mode:** View → Zen Mode leaves just the editor. Esc brings it back.
- There is one more thing, for people who remember old cheat codes.

## The NeetCode tracker

I'm doing interview prep in public to keep myself accountable. The rule is two
problems a day, and `neetcode.py` reports on it like a CI build: passing at
two, unstable at one, failing at zero. It also shows how many problems I've
solved, my current streak, the last four weeks, and the most recent problems.

None of it is typed by hand. I solve problems on [NeetCode](https://neetcode.io),
and its GitHub Sync commits each submission to
[`neetcode-submissions`](https://github.com/afafMaliha0716/neetcode-submissions).
A GitHub Action ([`neetcode.yml`](.github/workflows/neetcode.yml)) runs every
hour, reads that repo's commit history with
[`scripts/sync-neetcode.mjs`](scripts/sync-neetcode.mjs), and commits
`data/neetcode.json` when something changes. The page reads that file.

## On a phone

Tabs, a sidebar and a typing terminal don't suit a small screen, so on a phone
the same files become sections of one scrolling page. A bottom bar jumps
between them, projects swipe sideways, and the terminal turns into a row of
commands you tap to run.

## How it's built

One `index.html` with plain HTML, CSS, and JavaScript. No frameworks, no build
step, no dependencies. GitHub Pages serves it straight from `main`.

To run it locally, serve the folder so the page can load the data file:

```bash
python3 -m http.server 3000
# then open http://localhost:3000
```

To run the sync script and its tests:

```bash
node --test scripts/sync-neetcode.test.mjs
git clone https://github.com/afafMaliha0716/neetcode-submissions /tmp/neetcode
node scripts/sync-neetcode.mjs /tmp/neetcode
```
