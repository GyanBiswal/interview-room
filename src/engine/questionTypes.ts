// Question bank types. They mirror the JSON file exactly (snake_case keys).
// To support a new role: add a JSON file with the same structure and register
// it in loadBank.ts.

export const MAIN_TOTAL_POINTS = 10;

export interface BankMetadata {
  role: string;
  experience_level: string;
  technology_stack: string[];
  target_difficulty: number;
  stretch_difficulty: number;
  language: string;
  schema_version: string;
}

export interface Competency {
  id: string;
  name: string;
  priority: string;
  reason: string;
}

export interface ReferenceAnswer {
  summary: string;
  detailed_explanation: string;
  key_points: string[];
  acceptable_alternatives: string[];
  common_mistakes: string[];
}

export interface RubricCriterion {
  id: string;
  description: string;
  points: number;
  full_credit_condition: string;
  partial_credit_condition?: string;
}

export interface Evaluation {
  total_points: number;
  criteria: RubricCriterion[];
  critical_errors?: string[];
}

export interface FollowUp {
  id: string;
  question: string;
  competency_id: string;
  difficulty: number;
  question_type: string;
  assessment_goal: string;
  estimated_duration_seconds: number;
  // Human-readable conditions. A rule-based engine cannot evaluate these,
  // so they are kept for people (and for a future, more capable evaluator).
  trigger_conditions: string[];
  skip_conditions: string[];
  reference_answer: ReferenceAnswer;
  evaluation: Evaluation;
}

export interface Question {
  id: string;
  competency_id: string;
  subtopic: string;
  difficulty: number;
  question_type: string;
  question: string;
  assessment_goal: string;
  why_asked: string;
  estimated_duration_seconds: number;
  reference_answer: ReferenceAnswer;
  evaluation: Evaluation;
  follow_ups?: FollowUp[];
}

export interface QuestionBank {
  metadata: BankMetadata;
  competencies: Competency[];
  questions: Question[];
}
