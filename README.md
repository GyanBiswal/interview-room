# Interview Room

A free, voice-first mock interview simulator for personal technical interview preparation.

**Status:** Phase 0 (environment and project scaffold)

## Planned features

- Realistic one-question-at-a-time interview flow
- Voice questions and answers (browser speech APIs) with text fallback
- Local JSON question banks with reference answers and rubrics
- Transparent rule-based scoring
- Interview history and weak-topic tracking stored in the browser
- JSON export/import of history

## Technology stack

- React, TypeScript, Vite
- Tailwind CSS and Lucide icons (from Phase 1)
- Local JSON data and browser localStorage (no backend, no paid services)

## Setup

Requirements: Git, Node.js 20.19+ (or 22.12+), npm.

    git clone https://github.com/YOUR-USERNAME/interview-room.git
    cd interview-room
    npm install
    npm run dev

## Development commands

| Command           | Purpose                       |
| ----------------- | ----------------------------- |
| `npm run dev`     | Start the local dev server    |
| `npm run build`   | Type-check and build for production |
| `npm run preview` | Preview the production build  |
| `npm run lint`    | Run ESLint                    |

## Current limitations

- Nothing beyond a placeholder page exists yet.

## Roadmap

- Phase 1: UI foundation
- Phase 2: Question engine
- Phase 3: Voice interview room
- Phase 4: Evaluation
- Phase 5: Results and preparation memory
- Phase 6: Realism and quality
- Phase 7: Testing and free deployment