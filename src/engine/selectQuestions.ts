import type { Question, QuestionBank } from "./questionTypes";

export type DifficultyMode = "target" | "stretch";

export interface SelectionConfig {
  focusAreas: string[]; // competency ids
  difficulty: DifficultyMode;
  durationMin: number;
  seed?: number; // fixed seed = repeatable selection (used in tests)
  excludeQuestionIds?: string[];
}

export interface SelectionResult {
  questions: Question[];
  plannedSeconds: number;
  budgetSeconds: number;
  warnings: string[];
}

// Selection rules (see docs/question-bank-schema.md):
// - Base questions have difficulty target-1 or target (from the bank metadata).
// - Target mode uses base questions only.
// - Stretch mode also uses questions at stretch_difficulty, about every third slot.
// - Main questions may use at most 75% of the interview time; the rest is
//   reserved for follow-ups and transitions.
// - Focus areas (competencies) are rotated so one area does not dominate.
// - Final order is easiest to hardest, so the interview warms up first.
export const MAIN_TIME_SHARE = 0.75;
export const STRETCH_EVERY = 3;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(items: T[], rand: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

type Kind = "base" | "stretch";

export function selectQuestions(
  bank: QuestionBank,
  config: SelectionConfig
): SelectionResult {
  const rand = mulberry32(config.seed ?? Date.now());
  const warnings: string[] = [];
  const budget = config.durationMin * 60 * MAIN_TIME_SHARE;
  const target = bank.metadata.target_difficulty;
  const stretchLevel = bank.metadata.stretch_difficulty;
  const isBase = (q: Question) =>
    q.difficulty === target || q.difficulty === target - 1;
  const isStretch = (q: Question) => q.difficulty === stretchLevel;
  const excluded = new Set(config.excludeQuestionIds ?? []);

  const eligible = bank.questions.filter(
    (q) =>
      config.focusAreas.includes(q.competency_id) &&
      !excluded.has(q.id) &&
      (isBase(q) || isStretch(q))
  );

  const areas = config.focusAreas.filter((a) =>
    eligible.some((q) => q.competency_id === a)
  );
  config.focusAreas.forEach((a) => {
    if (!areas.includes(a)) {
      const name = bank.competencies.find((c) => c.id === a)?.name ?? a;
      warnings.push(`No questions available yet for "${name}".`);
    }
  });

  const areaOrder = shuffle(areas, rand);
  const pools = new Map<string, Record<Kind, Question[]>>();
  areaOrder.forEach((area) => {
    const inArea = eligible.filter((q) => q.competency_id === area);
    pools.set(area, {
      base: shuffle(inArea.filter(isBase), rand),
      stretch: shuffle(inArea.filter(isStretch), rand),
    });
  });

  const chosen: Question[] = [];
  let used = 0;
  let cursor = 0;

  function pick(kind: Kind): Question | null {
    const n = areaOrder.length;
    for (let k = 0; k < n; k++) {
      const areaIndex = (cursor + k) % n;
      const pool = pools.get(areaOrder[areaIndex])![kind];
      const question = pool.find(
        (q) => used + q.estimated_duration_seconds <= budget
      );
      if (!question) continue;
      pool.splice(pool.indexOf(question), 1);
      cursor = (areaIndex + 1) % n;
      return question;
    }
    return null;
  }

  let slot = 0;
  while (areaOrder.length > 0) {
    const wantStretch =
      config.difficulty === "stretch" && slot % STRETCH_EVERY === STRETCH_EVERY - 1;
    const kinds: Kind[] =
      config.difficulty === "target"
        ? ["base"]
        : wantStretch
          ? ["stretch", "base"]
          : ["base", "stretch"];

    let next: Question | null = null;
    for (const kind of kinds) {
      next = pick(kind);
      if (next) break;
    }
    if (!next) break;

    chosen.push(next);
    used += next.estimated_duration_seconds;
    slot++;
  }

  if (chosen.length === 0) {
    warnings.push("No questions could be selected. Try more focus areas or a longer duration.");
  } else if (chosen.length < 3) {
    warnings.push(`Only ${chosen.length} question(s) fit. Try more focus areas or a longer duration.`);
  }
  if (
    config.difficulty === "stretch" &&
    chosen.length > 0 &&
    !chosen.some(isStretch)
  ) {
    warnings.push(`No stretch (${stretchLevel}/10) questions were available for the selected focus areas.`);
  }

  const ordered = chosen
    .map((q, i) => ({ q, i }))
    .sort((a, b) => a.q.difficulty - b.q.difficulty || a.i - b.i)
    .map((x) => x.q);

  return {
    questions: ordered,
    plannedSeconds: used,
    budgetSeconds: budget,
    warnings,
  };
}
