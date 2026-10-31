import { readFileSync } from "node:fs";
import { validateMatchBank } from "../src/engine/validateMatchBank";
import { validateQuestionBank } from "../src/engine/validateQuestionBank";

const bankFile = "src/data/questionBanks/backend-fresher.json";
const matchFile = process.argv[2] ?? "src/data/questionBanks/backend-fresher.match.json";

const bankResult = validateQuestionBank(JSON.parse(readFileSync(bankFile, "utf8")));
if (!("bank" in bankResult)) {
  console.log("The question bank itself is invalid. Run npm run validate:bank first.");
  process.exit(1);
}

const result = validateMatchBank(JSON.parse(readFileSync(matchFile, "utf8")), bankResult.bank);
console.log(`Validating ${matchFile}`);
result.warnings.forEach((w) => console.log(`  warning  ${w.path}: ${w.message}`));

if ("match" in result) {
  let criteria = 0;
  let concepts = 0;
  let terms = 0;
  let patterns = 0;
  const countEntry = (c: Record<string, { concepts: { terms?: string[]; patterns?: string[] }[] }>) => {
    Object.values(c).forEach((crit) => {
      criteria++;
      crit.concepts.forEach((k) => {
        concepts++;
        terms += k.terms?.length ?? 0;
        patterns += k.patterns?.length ?? 0;
      });
    });
  };
  Object.values(result.match.questions).forEach((q) => {
    countEntry(q.criteria);
    Object.values(q.follow_ups ?? {}).forEach((f) => countEntry(f.criteria));
  });
  console.log(`OK: ${Object.keys(result.match.questions).length} questions, ${criteria} criteria, ${concepts} concepts, ${terms} terms, ${patterns} patterns.`);
} else {
  result.errors.forEach((e) => console.log(`  ERROR    ${e.path}: ${e.message}`));
  console.log(`FAILED with ${result.errors.length} error(s).`);
  process.exit(1);
}
