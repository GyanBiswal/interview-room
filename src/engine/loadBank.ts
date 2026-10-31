import backendFresher from "../data/questionBanks/backend-fresher.json";
import backendFresherMatch from "../data/questionBanks/backend-fresher.match.json";
import type { QuestionBank } from "./questionTypes";
import { validateMatchBank } from "./validateMatchBank";
import type { MatchValidationResult } from "./validateMatchBank";
import { validateQuestionBank } from "./validateQuestionBank";
import type { ValidationResult } from "./validateQuestionBank";

// To add a role later: create a question bank JSON and a match JSON, import
// them here, and add them to this registry. No other code needs to change.
const registry: Record<string, { questions: unknown; match: unknown }> = {
  "backend-fresher": { questions: backendFresher, match: backendFresherMatch },
};

export function loadBank(bankId: string): ValidationResult {
  const entry = registry[bankId];
  if (entry === undefined) {
    return {
      ok: false,
      errors: [{ path: "$", message: `Unknown question bank "${bankId}".` }],
      warnings: [],
    };
  }
  // Always validate before an interview starts.
  return validateQuestionBank(entry.questions);
}

export function loadMatchBank(
  bankId: string,
  bank: QuestionBank
): MatchValidationResult {
  const entry = registry[bankId];
  if (entry === undefined) {
    return {
      ok: false,
      errors: [{ path: "$", message: `Unknown question bank "${bankId}".` }],
      warnings: [],
    };
  }
  return validateMatchBank(entry.match, bank);
}
