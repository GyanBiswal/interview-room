import { MAIN_TOTAL_POINTS } from "./questionTypes";
import type { QuestionBank } from "./questionTypes";

export const SUPPORTED_SCHEMA_VERSION = "1.0";

export interface ValidationIssue {
  path: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; bank: QuestionBank; warnings: ValidationIssue[] }
  | { ok: false; errors: ValidationIssue[]; warnings: ValidationIssue[] };

type Obj = Record<string, unknown>;

function isObj(v: unknown): v is Obj {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

// Validates unknown JSON against the question bank schema.
// Collects ALL problems instead of stopping at the first one.
export function validateQuestionBank(input: unknown): ValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const err = (path: string, message: string) => errors.push({ path, message });
  const warn = (path: string, message: string) =>
    warnings.push({ path, message });

  function str(o: Obj, key: string, path: string): string {
    const v = o[key];
    if (typeof v !== "string" || v.trim() === "") {
      err(`${path}.${key}`, "Required non-empty text is missing.");
      return "";
    }
    return v;
  }

  function optStr(o: Obj, key: string, path: string) {
    if (o[key] !== undefined) str(o, key, path);
  }

  function num(
    o: Obj,
    key: string,
    path: string,
    min: number,
    max: number
  ): number {
    const v = o[key];
    if (typeof v !== "number" || Number.isNaN(v)) {
      err(`${path}.${key}`, "Required number is missing.");
      return 0;
    }
    if (v < min || v > max) {
      err(`${path}.${key}`, `Must be between ${min} and ${max}.`);
    }
    return v;
  }

  function strList(
    o: Obj,
    key: string,
    path: string,
    minLength: number
  ): string[] {
    const v = o[key];
    if (!Array.isArray(v)) {
      err(`${path}.${key}`, "Required list is missing.");
      return [];
    }
    const out: string[] = [];
    v.forEach((item, i) => {
      if (typeof item !== "string" || item.trim() === "") {
        err(`${path}.${key}[${i}]`, "Must be non-empty text.");
      } else {
        out.push(item);
      }
    });
    if (out.length < minLength) {
      err(`${path}.${key}`, `Needs at least ${minLength} item(s).`);
    }
    return out;
  }

  function objList(
    o: Obj,
    key: string,
    path: string,
    minLength: number
  ): Obj[] {
    const v = o[key];
    if (!Array.isArray(v)) {
      err(`${path}.${key}`, "Required list is missing.");
      return [];
    }
    const out: Obj[] = [];
    v.forEach((item, i) => {
      if (!isObj(item)) err(`${path}.${key}[${i}]`, "Must be an object.");
      else out.push(item);
    });
    if (out.length < minLength) {
      err(`${path}.${key}`, `Needs at least ${minLength} item(s).`);
    }
    return out;
  }

  function obj(o: Obj, key: string, path: string): Obj | null {
    const v = o[key];
    if (!isObj(v)) {
      err(`${path}.${key}`, "Required object is missing.");
      return null;
    }
    return v;
  }

  function checkReferenceAnswer(parent: Obj, path: string) {
    const ref = obj(parent, "reference_answer", path);
    if (!ref) return;
    const p = `${path}.reference_answer`;
    str(ref, "summary", p);
    str(ref, "detailed_explanation", p);
    strList(ref, "key_points", p, 1);
    const alternatives = strList(ref, "acceptable_alternatives", p, 0);
    if (alternatives.length === 0) {
      warn(`${p}.acceptable_alternatives`, "No acceptable alternatives listed.");
    }
    strList(ref, "common_mistakes", p, 1);
  }

  function checkEvaluation(parent: Obj, path: string, isMain: boolean) {
    const ev = obj(parent, "evaluation", path);
    if (!ev) return;
    const p = `${path}.evaluation`;
    const declared = num(ev, "total_points", p, 1, 100);
    if (isMain && declared !== MAIN_TOTAL_POINTS) {
      err(`${p}.total_points`, `total_points must be ${MAIN_TOTAL_POINTS} for main questions.`);
    }
    const criteria = objList(ev, "criteria", p, 1);
    const ids = new Set<string>();
    let total = 0;
    criteria.forEach((c, i) => {
      const cp = `${p}.criteria[${i}]`;
      const id = str(c, "id", cp);
      if (id) {
        if (ids.has(id)) err(`${cp}.id`, `Duplicate criterion id "${id}".`);
        ids.add(id);
      }
      str(c, "description", cp);
      total += num(c, "points", cp, 0.1, 100);
      str(c, "full_credit_condition", cp);
      optStr(c, "partial_credit_condition", cp);
    });
    if (criteria.length > 0 && Math.abs(total - declared) > 1e-9) {
      err(`${p}.criteria`, `Criteria points total ${total} but total_points is ${declared}.`);
    }
    if (ev.critical_errors !== undefined) {
      strList(ev, "critical_errors", p, 0);
    }
  }

  if (!isObj(input)) {
    err("$", "Question bank must be a JSON object.");
    return { ok: false, errors, warnings };
  }

  // Metadata
  let target = 0;
  let stretch = 0;
  const meta = obj(input, "metadata", "$");
  if (meta) {
    str(meta, "role", "metadata");
    str(meta, "experience_level", "metadata");
    str(meta, "language", "metadata");
    strList(meta, "technology_stack", "metadata", 1);
    target = num(meta, "target_difficulty", "metadata", 1, 10);
    stretch = num(meta, "stretch_difficulty", "metadata", 1, 10);
    if (target && stretch && stretch <= target) {
      err("metadata.stretch_difficulty", "Must be higher than target_difficulty.");
    }
    const version = str(meta, "schema_version", "metadata");
    if (version && version !== SUPPORTED_SCHEMA_VERSION) {
      err("metadata.schema_version", `Expected "${SUPPORTED_SCHEMA_VERSION}" but found "${version}".`);
    }
  }

  // Competencies
  const competencyIds = new Set<string>();
  objList(input, "competencies", "$", 1).forEach((c, i) => {
    const p = `competencies[${i}]`;
    const id = str(c, "id", p);
    if (id) {
      if (competencyIds.has(id)) err(`${p}.id`, `Duplicate competency id "${id}".`);
      competencyIds.add(id);
    }
    str(c, "name", p);
    str(c, "priority", p);
    str(c, "reason", p);
  });

  // Questions and follow-ups
  const seenIds = new Map<string, string>();
  const seenText = new Map<string, string>();

  function claimId(id: string, path: string) {
    if (!id) return;
    const existing = seenIds.get(id);
    if (existing) {
      err(`${path}.id`, `Duplicate id "${id}" (also used at ${existing}).`);
    } else {
      seenIds.set(id, path);
    }
  }

  function checkCompetency(o: Obj, path: string) {
    const cid = str(o, "competency_id", path);
    if (cid && !competencyIds.has(cid)) {
      err(`${path}.competency_id`, `Unknown competency "${cid}".`);
    }
  }

  objList(input, "questions", "$", 1).forEach((q, i) => {
    const p = `questions[${i}]`;
    claimId(str(q, "id", p), p);
    checkCompetency(q, p);
    str(q, "subtopic", p);
    const difficulty = num(q, "difficulty", p, 1, 10);
    if (
      target && stretch && difficulty &&
      difficulty !== target && difficulty !== target - 1 && difficulty !== stretch
    ) {
      warn(
        `${p}.difficulty`,
        `Difficulty ${difficulty} is not ${target - 1}, ${target} or ${stretch}, so this question will never be selected.`
      );
    }
    str(q, "question_type", p);
    const text = str(q, "question", p);
    if (text) {
      const key = text.trim().toLowerCase();
      const dup = seenText.get(key);
      if (dup) warn(`${p}.question`, `Same question text as ${dup}.`);
      else seenText.set(key, p);
    }
    str(q, "assessment_goal", p);
    str(q, "why_asked", p);
    num(q, "estimated_duration_seconds", p, 10, 1800);
    checkReferenceAnswer(q, p);
    checkEvaluation(q, p, true);

    if (q.follow_ups !== undefined) {
      objList(q, "follow_ups", p, 0).forEach((f, j) => {
        const fp = `${p}.follow_ups[${j}]`;
        claimId(str(f, "id", fp), fp);
        checkCompetency(f, fp);
        str(f, "question", fp);
        num(f, "difficulty", fp, 1, 10);
        str(f, "question_type", fp);
        str(f, "assessment_goal", fp);
        num(f, "estimated_duration_seconds", fp, 10, 900);
        strList(f, "trigger_conditions", fp, 1);
        strList(f, "skip_conditions", fp, 0);
        checkReferenceAnswer(f, fp);
        checkEvaluation(f, fp, false);
      });
    }
  });

  if (errors.length > 0) return { ok: false, errors, warnings };
  return { ok: true, bank: input as unknown as QuestionBank, warnings };
}
