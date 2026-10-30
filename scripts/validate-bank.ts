import { readFileSync } from "node:fs";
import { validateQuestionBank } from "../src/engine/validateQuestionBank";

const file = process.argv[2] ?? "src/data/questionBanks/backend-fresher.json";
const raw: unknown = JSON.parse(readFileSync(file, "utf8"));
const result = validateQuestionBank(raw);

console.log(`Validating ${file}`);
result.warnings.forEach((w) => console.log(`  warning  ${w.path}: ${w.message}`));

if (result.ok) {
  const { bank } = result;
  const followUps = bank.questions.reduce(
    (n, q) => n + (q.follow_ups?.length ?? 0),
    0
  );
  console.log(
    `OK: ${bank.questions.length} questions, ${followUps} follow-ups, ${bank.competencies.length} competencies.`
  );

  const byDifficulty = new Map<number, number>();
  const byCompetency = new Map<string, number>();
  bank.questions.forEach((q) => {
    byDifficulty.set(q.difficulty, (byDifficulty.get(q.difficulty) ?? 0) + 1);
    byCompetency.set(q.competency_id, (byCompetency.get(q.competency_id) ?? 0) + 1);
  });
  console.log("Questions by difficulty:");
  [...byDifficulty.entries()]
    .sort((a, b) => a[0] - b[0])
    .forEach(([d, n]) => console.log(`  ${d}/10: ${n}`));
  console.log("Questions by competency:");
  bank.competencies.forEach((c) =>
    console.log(`  ${c.id}: ${byCompetency.get(c.id) ?? 0}`)
  );
} else {
  result.errors.forEach((e) => console.log(`  ERROR    ${e.path}: ${e.message}`));
  console.log(`FAILED with ${result.errors.length} error(s).`);
  process.exit(1);
}
