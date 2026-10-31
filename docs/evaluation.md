# Evaluation (rule-based scoring)

Answers are scored against each question's rubric by transparent rules. The rules live in
`src/data/questionBanks/backend-fresher.match.json`, next to the question bank, so the
question bank itself is never modified.

## How a score is produced

1. The answer is lowercased and punctuation is stripped ("Promise.all" -> "promise all").
2. Each rubric criterion (matched by id) has a list of concepts. A concept is covered if
   any of its `terms` or `patterns` appears in the answer. A trailing `*` in a term means
   "a word that starts with" (`validat*`).
3. `needed` is how many concepts give full credit (default: all). credit = covered / needed, capped at 1.
4. Points = credit x criterion points, rounded to the nearest half point.
5. Score = sum of criterion points out of the rubric's `total_points`, shown out of 10.

Results store, per criterion, which concepts were covered and which phrase matched, so any
score can be explained.

## Follow-ups

- `ask_when` conditions must ALL hold; any `skip_when` condition skips the follow-up.
- Condition kinds: `coverageAtLeast`, `coverageBelow`, `conceptCovered`, `conceptMissed`, `answerEmpty`.
- `signal_concepts` earn no points but feed these conditions.
- Follow-ups are never asked after an empty answer, when there is not enough spare time,
  or more than once per question.
- Follow-ups without rules use the default: a harder follow-up after a strong answer, an
  easier one after a weak answer.

## Adding or tuning rules

- Run `npm run validate:match` after editing the match file.
- Run `npm run eval:test` to check sample answers and reference answers still score as expected.
- Add terms for the different ways people actually say things, including how speech
  recognition writes them ("promise dot all", "four oh four").

## Known limitations

- This detects whether ideas were MENTIONED. It does not understand meaning, so a wrong
  answer that uses the right words can score well, and a correct answer in unusual wording
  can be missed.
- Keyword lists can be gamed. Short answers get a reliability warning.
- `critical_errors` from the question bank are not detected automatically (keyword rules
  cannot tell "never store plaintext passwords" from "store plaintext passwords"). They are
  shown as reminders on the results page.
- Spoken code is hard to score; use text mode for coding questions.
- Treat scores as a revision guide, not a verdict. A more capable evaluator can replace
  `evaluateAnswer` later without changing the UI.
