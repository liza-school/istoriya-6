# Repository Guidelines

Start with `HANDOFF.md`: current state, next paragraph, and the per-paragraph checklist. Update it after every paragraph — work may be resumed by another agent at any time.

## Project Structure & Module Organization

This is a Ukrainian sixth-grade history course built with plain HTML, CSS, and JavaScript. `course/index.html` loads the shared renderer and lesson scripts. `course/js/engine.js` handles routing, question checking, and browser progress. Lessons live in `course/js/lessons/`, styles in `course/css/app.css`, and textbook illustrations in `course/img/`. `course/tools/` contains browser checks, required-content lists (`coverage.json`), and textbook corrections (`errata.json`).

## Build, Test, and Development Commands

Run commands from this directory. No package installation or build step is configured.

- Open `course/index.html` directly for local use.
- `python -m http.server 8000 --directory course` serves the course at `http://127.0.0.1:8000/`.
- `node --check course/js/engine.js` checks JavaScript syntax; repeat for changed scripts.
- `node course/tools/check.js` runs browser checks against the local file. Append `http://127.0.0.1:8000/` to check the server instead.

Browser checks require Chrome and Node.js with built-in `fetch` and `WebSocket`; Node 24 is available locally. Set `CHROME_PATH` if Chrome is outside the script's candidate paths.

## Coding Style & Naming Conventions

Match existing two-space indentation, JavaScript semicolons, double-quoted strings, and trailing commas in multiline objects. Preserve UTF-8 Ukrainian text and LF endings (`.gitattributes`). No formatter or linter is configured. Reuse `COURSE.addLesson` and existing block types. Name paragraph files and IDs `p27.js` / `p27`, assessment files `test3.js`, and images with lowercase transliterated hyphenated names. Keep question IDs stable to preserve stored progress. Register new scripts in `course/index.html` before `COURSE.start()`.

## Testing & Content Guidelines

The custom Chrome DevTools harness checks rendering, answers, progress, illustrations, corrections, and required text; no numerical code-coverage target exists. Each paragraph needs all six contextual blocks, at least three everyday examples, and 6–8 questions covering `quiz`, `multi`, `order`, and `input`. Update coverage and errata alongside lessons. The harness expects §14–35 and four assessments; missing pages cause failures. Check phone and desktop layouts after visual changes.

## Commit & Pull Request Guidelines

Git metadata is absent here, so historical conventions cannot be verified. Use the requested `[IST-27] Short sentence-case subject` pattern for paragraph work. PR descriptions should list paragraphs changed, validation results, linked tasks, and screenshots for visual changes.

## Agent & Asset Rules

Keep full textbook PDFs local; `.gitignore` excludes them. GitLab and Atlassian access stays read-only. Users own branch changes; obtain explicit authorization for delegation, commits, pushing, repository creation, and publishing.
