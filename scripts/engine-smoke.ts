import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { chooseFollowUp } from "../src/engine/followUps";
import { selectQuestions } from "../src/engine/selectQuestions";
import {
  advance,
  createSession,
  endInterview,
  getCurrentPrompt,
  getSpareSeconds,
  recordAnswer,
} from "../src/engine/session";
import { validateQuestionBank } from "../src/engine/validateQuestionBank";

const raw: unknown = JSON.parse(
  readFileSync("src/data/questionBanks/backend-fresher.json", "utf8")
);

// 1. The real bank must validate.
const result = validateQuestionBank(raw);
if (!result.ok) {
  result.errors.slice(0, 20).forEach((e) => console.log(`  ERROR ${e.path}: ${e.message}`));
  console.log(`The real question bank is invalid (${result.errors.length} errors).`);
  process.exit(1);
}
const bank = result.bank;
console.log(`PASS  bank is valid (${bank.questions.length} questions)`);

// 2. Broken banks must be rejected with a useful message.
function broken(mutate: (b: any) => void): string {
  const copy = structuredClone(raw);
  mutate(copy);
  const r = validateQuestionBank(copy);
  assert.ok(!r.ok, "Broken bank should fail validation.");
  return r.ok ? "" : r.errors.map((e) => `${e.path} ${e.message}`).join(" | ");
}
assert.match(broken((b) => { b.questions[1].id = b.questions[0].id; }), /Duplicate id/);
assert.match(broken((b) => { b.questions[0].evaluation.criteria[0].points += 1; }), /Criteria points total/);
assert.match(broken((b) => { b.questions[0].evaluation.total_points = 9; }), /total_points must be 10/);
assert.match(broken((b) => { b.questions[0].competency_id = "nope"; }), /Unknown competency/);
assert.match(broken((b) => { delete b.questions[0].question; }), /questions\[0\]\.question /);
assert.match(broken((b) => { b.metadata.schema_version = "9.9"; }), /Expected "1.0"/);
const withFollowUpIndex = bank.questions.findIndex((q) => (q.follow_ups?.length ?? 0) > 0);
if (withFollowUpIndex >= 0) {
  assert.match(
    broken((b) => { b.questions[withFollowUpIndex].follow_ups[0].competency_id = "nope"; }),
    /Unknown competency/
  );
}
console.log("PASS  invalid banks are rejected (duplicate id, points, total, competency, missing field, version)");

// 3. Selection rules across many seeds.
const allAreas = bank.competencies.map((c) => c.id);
const target = bank.metadata.target_difficulty;
const stretchLevel = bank.metadata.stretch_difficulty;
const hasStretch = bank.questions.some((q) => q.difficulty === stretchLevel);
let seedsWithStretch = 0;

for (let seed = 1; seed <= 60; seed++) {
  const t = selectQuestions(bank, { focusAreas: allAreas, difficulty: "target", durationMin: 30, seed });
  assert.ok(t.questions.length >= 3, "30 min target should give at least 3 questions");
  assert.ok(t.plannedSeconds <= t.budgetSeconds + 1e-9, "Must stay within time budget");
  assert.ok(t.questions.every((q) => q.difficulty <= target), "Target mode must not include stretch questions");
  assert.equal(new Set(t.questions.map((q) => q.id)).size, t.questions.length, "No duplicate questions");

  const s = selectQuestions(bank, { focusAreas: allAreas, difficulty: "stretch", durationMin: 45, seed });
  assert.ok(s.plannedSeconds <= s.budgetSeconds + 1e-9);
  assert.equal(new Set(s.questions.map((q) => q.id)).size, s.questions.length);
  if (s.questions.some((q) => q.difficulty === stretchLevel)) seedsWithStretch++;
}
if (hasStretch) {
  assert.ok(seedsWithStretch > 0, "Stretch mode should include a stretch question for at least some seeds");
} else {
  console.log(`NOTE  the bank has no ${stretchLevel}/10 main questions, so stretch mode cannot add any`);
}
const oneArea = bank.questions.find((q) => q.difficulty === target || q.difficulty === target - 1)!.competency_id;
const single = selectQuestions(bank, { focusAreas: [oneArea], difficulty: "target", durationMin: 45, seed: 7 });
assert.ok(single.questions.length > 0);
assert.ok(single.questions.every((q) => q.competency_id === oneArea));
const unknown = selectQuestions(bank, { focusAreas: ["nope"], difficulty: "target", durationMin: 30, seed: 1 });
assert.equal(unknown.questions.length, 0);
assert.ok(unknown.warnings.length > 0);
console.log(`PASS  selection respects focus areas, difficulty, time budget, no duplicates (60 seeds; stretch seen in ${seedsWithStretch})`);

// 4. Follow-up decisions (adapts to the bank's own data).
const withFollowUp = bank.questions.find((q) => (q.follow_ups?.length ?? 0) > 0);
if (withFollowUp) {
  const f = withFollowUp.follow_ups![0];
  const isStretchFollowUp = f.difficulty > withFollowUp.difficulty;
  const strong = { answerEmpty: false, coverage: 0.9 };
  const weak = { answerEmpty: false, coverage: 0.2 };
  const roomy = { spareSeconds: 1000, askedFollowUpIds: [] as string[] };

  assert.equal(chooseFollowUp(withFollowUp, strong, roomy).ask, isStretchFollowUp, "strong answer");
  assert.equal(chooseFollowUp(withFollowUp, weak, roomy).ask, !isStretchFollowUp, "weak answer");
  const ok = isStretchFollowUp ? strong : weak;
  assert.equal(chooseFollowUp(withFollowUp, { ...ok, answerEmpty: true }, roomy).ask, false, "empty answer");
  assert.equal(chooseFollowUp(withFollowUp, ok, { ...roomy, spareSeconds: 1 }).ask, false, "no spare time");
  assert.equal(chooseFollowUp(withFollowUp, ok, { ...roomy, askedFollowUpIds: [f.id] }).ask, false, "already asked");
}
const noFollowUp = bank.questions.find((q) => (q.follow_ups?.length ?? 0) === 0);
if (noFollowUp) {
  assert.equal(
    chooseFollowUp(noFollowUp, { answerEmpty: false, coverage: 0.9 }, { spareSeconds: 1000, askedFollowUpIds: [] }).ask,
    false
  );
}
console.log("PASS  follow-up rules (strong/weak, empty answer, no time, already asked, none defined)");

// 5. Full simulated session.
const now = new Date("2026-01-01T10:00:00Z");
const picked = selectQuestions(bank, { focusAreas: allAreas, difficulty: "stretch", durationMin: 45, seed: 3 });
let session = createSession({
  id: "test-session",
  bankId: "backend-fresher",
  config: { durationMin: 45, difficulty: "stretch", focusAreas: allAreas, mode: "text" },
  questions: picked.questions,
  now,
});
console.log("\nSimulated session plan:");
picked.questions.forEach((q, i) => console.log(`  ${i + 1}. [${q.difficulty}/10] ${q.competency_id} - ${q.subtopic} (${q.id})`));

let guard = 0;
let step = 0;
let followUpsAsked = 0;
while (session.status === "in-progress" && guard++ < 200) {
  const prompt = getCurrentPrompt(session, bank);
  assert.ok(prompt, "There should be a current prompt while in progress");
  step++;
  const text = step === 1 ? "   " : "I think it works like this.";
  session = recordAnswer(session, text, now);
  if (step === 1) assert.equal(session.answers[0].skipped, true, "Blank answer should be recorded as skipped");

  if (prompt.kind === "main") {
    const decision = chooseFollowUp(
      prompt.question,
      { answerEmpty: text.trim() === "", coverage: 0.9 },
      { spareSeconds: getSpareSeconds(session, bank, now), askedFollowUpIds: [] }
    );
    if (decision.followUp) followUpsAsked++;
    session = advance(session, decision.followUp?.id ?? null, now);
  } else {
    session = advance(session, null, now);
  }
}
assert.equal(session.status, "completed");
assert.equal(session.answers.length, picked.questions.length + followUpsAsked);
assert.ok(session.endedAt);
console.log(`PASS  simulated session completed (${picked.questions.length} questions, ${followUpsAsked} follow-ups, ${session.answers.length} answers)`);

// 6. Ending early.
let early = createSession({
  id: "early",
  bankId: "backend-fresher",
  config: session.config,
  questions: picked.questions,
  now,
});
early = endInterview(early, now);
assert.equal(early.status, "ended-early");
assert.equal(getCurrentPrompt(early, bank), null);
console.log("PASS  ending early stops the session");

console.log("\nAll engine checks passed.");
