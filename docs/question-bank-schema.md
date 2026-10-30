# Question bank schema (schema_version "1.0")

Question banks are JSON files that follow the types in `src/engine/questionTypes.ts`.
To support a new role, add a new JSON file and register it in `src/engine/loadBank.ts`.
Every bank is validated by `src/engine/validateQuestionBank.ts` before an interview.

    npm run validate:bank
    npm run validate:bank -- path/to/other-bank.json

## Top level

- `metadata`: `role`, `experience_level`, `technology_stack[]`, `target_difficulty`,
  `stretch_difficulty`, `language`, `schema_version`
- `competencies[]`: `id`, `name`, `priority`, `reason`. These are also the focus areas
  shown in interview setup.
- `questions[]`

## Main question

`id`, `competency_id`, `subtopic`, `difficulty`, `question_type`, `question`,
`assessment_goal`, `why_asked`, `estimated_duration_seconds`,
`reference_answer` (`summary`, `detailed_explanation`, `key_points[]`,
`acceptable_alternatives[]`, `common_mistakes[]`), `evaluation`, `follow_ups[]` (optional).

`evaluation`: `total_points` (10 for main questions), `criteria[]` (`id`, `description`,
`points`, `full_credit_condition`, optional `partial_credit_condition`), optional
`critical_errors[]`. Criteria points must add up to `total_points`.

## Follow-up

`id`, `question`, `competency_id`, `difficulty`, `question_type`, `assessment_goal`,
`estimated_duration_seconds`, `trigger_conditions[]`, `skip_conditions[]`,
`reference_answer`, `evaluation` (points must add up to its own `total_points`).

IDs of questions and follow-ups must be unique across the whole bank.

## Selection rules

- Base questions: difficulty `target_difficulty - 1` or `target_difficulty`.
- Target mode uses base questions only.
- Stretch mix also uses `stretch_difficulty` questions, roughly every third slot.
- Main questions use at most 75% of the interview time (from `estimated_duration_seconds`).
- Focus areas rotate so one competency does not dominate.
- Final order is easiest to hardest.
- A question whose difficulty is none of the above is never selected (the validator warns).

## Follow-up policy

`trigger_conditions` and `skip_conditions` are sentences for humans. A rule-based
engine cannot evaluate them, so the engine uses this default policy:

- No follow-up after an empty answer.
- Skip when there is not enough spare interview time or the follow-up limit is reached.
- A follow-up harder than its question is a stretch: asked only after a strong answer.
- A follow-up at the same or lower difficulty is a probe: asked only after a weak answer.

"Strong" will come from the Phase 4 evaluator (share of key points covered).

## Known limitations

- `key_points` and the rubric conditions are prose with no match terms, so they cannot
  be scored by keyword rules yet. Phase 4 adds a companion file of match terms.
- Keyword matching never equals real understanding: a correct answer in unusual wording
  can be missed, and an answer that just names the right terms can be over-credited.
- Reference answers should be reviewed by a human before they are trusted.
