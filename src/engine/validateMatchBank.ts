import { CONDITION_KINDS } from "./matchTypes";
import type { MatchBank } from "./matchTypes";
import type { QuestionBank } from "./questionTypes";
import { normalizeText } from "./textMatch";
import type { ValidationIssue } from "./validateQuestionBank";

export const SUPPORTED_MATCH_SCHEMA_VERSION = "1.0";

export type MatchValidationResult =
  | { ok: true; match: MatchBank; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Checks the match rules against the question bank:
// every question, follow-up and rubric criterion needs rules; ids must be
// unique; patterns must compile; follow-up conditions must point at real concepts.
export function validateMatchBank(
  input: unknown,
  bank: QuestionBank
): MatchValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });
  const warn = (path: string, message: string) =>
    warnings.push({ path, message });

  function checkConcepts(list: unknown, path: string, ids: Set<string>) {
    if (!Array.isArray(list) || list.length === 0) {
      err(path, "Needs a non-empty list of concepts.");
      return 0;
    }
    list.forEach((c, i) => {
      const p = `${path}[${i}]`;
      if (!isObj(c)) {
        err(p, "Must be an object.");
        return;
      }
      const id = c.id;
      if (typeof id !== "string" || id.trim() === "") {
        err(`${p}.id`, "Concept id is required.");
      } else if (ids.has(id)) {
        err(`${p}.id`, `Duplicate concept id "${id}".`);
      } else {
        ids.add(id);
      }
      if (typeof c.label !== "string" || c.label.trim() === "") {
        err(`${p}.label`, "Concept label is required.");
      }
      const terms = c.terms;
      const patterns = c.patterns;
      const termCount = Array.isArray(terms) ? terms.length : 0;
      const patternCount = Array.isArray(patterns) ? patterns.length : 0;
      if (terms !== undefined && !Array.isArray(terms)) err(`${p}.terms`, "Must be a list.");
      if (patterns !== undefined && !Array.isArray(patterns)) err(`${p}.patterns`, "Must be a list.");
      if (termCount + patternCount === 0) {
        err(p, "Needs at least one term or pattern.");
      }
      if (Array.isArray(terms)) {
        terms.forEach((t, j) => {
          if (typeof t !== "string") {
            err(`${p}.terms[${j}]`, "Must be text.");
            return;
          }
          const base = normalizeText(t.endsWith("*") ? t.slice(0, -1) : t);
          if (base === "") err(`${p}.terms[${j}]`, `Term "${t}" is empty after normalization.`);
          else if (base.length < 3 && !t.endsWith("*") && !/^\d+$/.test(base)) {
            warn(`${p}.terms[${j}]`, `Term "${t}" is very short and may match too much.`);
          }
        });
      }
      if (Array.isArray(patterns)) {
        patterns.forEach((s, j) => {
          if (typeof s !== "string") {
            err(`${p}.patterns[${j}]`, "Must be text.");
            return;
          }
          try {
            new RegExp(s);
          } catch {
            err(`${p}.patterns[${j}]`, `Invalid regular expression: ${s}`);
          }
        });
      }
    });
    return list.length;
  }

  function checkCriteria(
    value: unknown,
    expectedIds: string[],
    path: string,
    ids: Set<string>
  ) {
    if (!isObj(value)) {
      err(path, "Required object is missing.");
      return;
    }
    expectedIds.forEach((cid) => {
      const rule = value[cid];
      const p = `${path}.${cid}`;
      if (!isObj(rule)) {
        err(p, "No match rules for this rubric criterion.");
        return;
      }
      const count = checkConcepts(rule.concepts, `${p}.concepts`, ids);
      if (rule.needed !== undefined) {
        if (
          typeof rule.needed !== "number" ||
          !Number.isInteger(rule.needed) ||
          rule.needed < 1 ||
          rule.needed > count
        ) {
          err(`${p}.needed`, `Must be a whole number from 1 to ${count}.`);
        }
      }
    });
    Object.keys(value).forEach((cid) => {
      if (!expectedIds.includes(cid)) {
        err(`${path}.${cid}`, "Unknown rubric criterion id.");
      }
    });
  }

  function checkConditions(value: unknown, path: string, ids: Set<string>) {
    if (value === undefined) return;
    if (!Array.isArray(value)) {
      err(path, "Must be a list.");
      return;
    }
    value.forEach((cond, i) => {
      const p = `${path}[${i}]`;
      if (!isObj(cond)) {
        err(p, "Must be an object.");
        return;
      }
      const kind = cond.kind;
      if (
        typeof kind !== "string" ||
        !(CONDITION_KINDS as readonly string[]).includes(kind)
      ) {
        err(`${p}.kind`, `Must be one of: ${CONDITION_KINDS.join(", ")}.`);
        return;
      }
      if (kind === "coverageBelow" || kind === "coverageAtLeast") {
        if (typeof cond.value !== "number" || cond.value < 0 || cond.value > 1) {
          err(`${p}.value`, "Must be a number from 0 to 1.");
        }
      }
      if (kind === "conceptMissed" || kind === "conceptCovered") {
        if (typeof cond.conceptId !== "string" || !ids.has(cond.conceptId)) {
          err(`${p}.conceptId`, `Unknown concept id "${String(cond.conceptId)}" (must belong to the main question).`);
        }
      }
    });
  }

  if (!isObj(input)) {
    err("$", "Match rules must be a JSON object.");
    return { ok: false, errors, warnings };
  }
  if (input.schema_version !== SUPPORTED_MATCH_SCHEMA_VERSION) {
    err("schema_version", `Expected "${SUPPORTED_MATCH_SCHEMA_VERSION}".`);
  }
  if (typeof input.bank_id !== "string" || input.bank_id === "") {
    err("bank_id", "Required text is missing.");
  }
  const questions = input.questions;
  if (!isObj(questions)) {
    err("questions", "Required object is missing.");
    return { ok: false, errors, warnings };
  }

  Object.keys(questions).forEach((id) => {
    if (!bank.questions.some((q) => q.id === id)) {
      err(`questions.${id}`, "Unknown question id.");
    }
  });

  bank.questions.forEach((q) => {
    const p = `questions.${q.id}`;
    const entry = questions[q.id];
    if (!isObj(entry)) {
      err(p, "No match rules for this question.");
      return;
    }
    const conceptIds = new Set<string>();
    checkCriteria(
      entry.criteria,
      q.evaluation.criteria.map((c) => c.id),
      `${p}.criteria`,
      conceptIds
    );
    if (entry.signal_concepts !== undefined) {
      checkConcepts(entry.signal_concepts, `${p}.signal_concepts`, conceptIds);
    }

    const followUps = q.follow_ups ?? [];
    const followUpEntries = isObj(entry.follow_ups) ? entry.follow_ups : {};
    if (entry.follow_ups !== undefined && !isObj(entry.follow_ups)) {
      err(`${p}.follow_ups`, "Must be an object keyed by follow-up id.");
    }
    Object.keys(followUpEntries).forEach((fid) => {
      if (!followUps.some((f) => f.id === fid)) {
        err(`${p}.follow_ups.${fid}`, "Unknown follow-up id.");
      }
    });
    followUps.forEach((f) => {
      const fp = `${p}.follow_ups.${f.id}`;
      const fe = followUpEntries[f.id];
      if (!isObj(fe)) {
        err(fp, "No match rules for this follow-up.");
        return;
      }
      checkCriteria(
        fe.criteria,
        f.evaluation.criteria.map((c) => c.id),
        `${fp}.criteria`,
        new Set<string>()
      );
      checkConditions(fe.ask_when, `${fp}.ask_when`, conceptIds);
      checkConditions(fe.skip_when, `${fp}.skip_when`, conceptIds);
    });
  });

  if (errors.length > 0) return { ok: false, errors, warnings };
  return { ok: true, match: input as unknown as MatchBank, warnings };
}
