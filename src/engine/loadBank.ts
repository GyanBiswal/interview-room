import backendFresher from "../data/questionBanks/backend-fresher.json";
import { validateQuestionBank } from "./validateQuestionBank";
import type { ValidationResult } from "./validateQuestionBank";

// To add a role later: create a new JSON file that follows the schema, import
// it here, and add it to this registry. No other code needs to change.
const registry: Record<string, unknown> = {
  "backend-fresher": backendFresher,
};

export function loadBank(bankId: string): ValidationResult {
  const raw = registry[bankId];
  if (raw === undefined) {
    return {
      ok: false,
      errors: [{ path: "$", message: `Unknown question bank "${bankId}".` }],
      warnings: [],
    };
  }
  // Always validate before an interview starts.
  return validateQuestionBank(raw);
}
