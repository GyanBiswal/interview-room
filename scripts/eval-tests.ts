import { readFileSync } from "node:fs";
import { evaluateAnswer, evaluateForPrompt, signalsFromEvaluation } from "../src/engine/evaluate";
import type { EvaluationResult } from "../src/engine/evaluationTypes";
import { chooseFollowUp } from "../src/engine/followUps";
import type { MatchBank } from "../src/engine/matchTypes";
import type { QuestionBank } from "../src/engine/questionTypes";
import { normalizeText, termMatches } from "../src/engine/textMatch";
import { validateMatchBank } from "../src/engine/validateMatchBank";
import { validateQuestionBank } from "../src/engine/validateQuestionBank";

const rawBank: unknown = JSON.parse(readFileSync("src/data/questionBanks/backend-fresher.json", "utf8"));
const rawMatch: unknown = JSON.parse(readFileSync("src/data/questionBanks/backend-fresher.match.json", "utf8"));

const bankResult = validateQuestionBank(rawBank);
if (!("bank" in bankResult)) {
  console.log("Question bank invalid. Run npm run validate:bank.");
  process.exit(1);
}
const bank: QuestionBank = bankResult.bank;
const matchResult = validateMatchBank(rawMatch, bank);
if (!("match" in matchResult)) {
  matchResult.errors.slice(0, 15).forEach((e) => console.log(`  ERROR ${e.path}: ${e.message}`));
  console.log("Match rules invalid. Run npm run validate:match.");
  process.exit(1);
}
const match: MatchBank = matchResult.match;

const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) console.log(`PASS  ${name}`);
  else {
    console.log(`FAIL  ${name}${detail ? ` -> ${detail}` : ""}`);
    failures.push(name);
  }
}

function mainEval(qid: string, text: string): EvaluationResult {
  const q = bank.questions.find((x) => x.id === qid)!;
  const m = match.questions[qid];
  return evaluateAnswer(
    { questionId: qid, followUpId: null, evaluation: q.evaluation, criteria: m.criteria, signalConcepts: m.signal_concepts },
    text
  );
}
function followUpEval(qid: string, fid: string, text: string): EvaluationResult {
  const q = bank.questions.find((x) => x.id === qid)!;
  const f = q.follow_ups!.find((x) => x.id === fid)!;
  return evaluateAnswer(
    { questionId: qid, followUpId: fid, evaluation: f.evaluation, criteria: match.questions[qid].follow_ups![fid].criteria },
    text
  );
}
function missed(ev: EvaluationResult) {
  return ev.missedConcepts.map((m) => m.label).join("; ");
}

// 1. Text normalization and term matching
console.log("\n== Text matching ==");
check("normalizes punctuation and apostrophes", normalizeText("Promise.all() doesn't cancel; O(n)!") === "promise all doesnt cancel o n");
check("phrase match respects word boundaries", termMatches(" promise all ", "promise all") && !termMatches(" promises all ", "promise all"));
check("stem match works", termMatches(" validation rules ", "validat*") && !termMatches(" invalidate ", "validat*"));

// 2. The match validator catches mistakes
console.log("\n== Match validator ==");
function brokenMatch(mutate: (m: any) => void): string {
  const copy = structuredClone(rawMatch);
  mutate(copy);
  const r = validateMatchBank(copy, bank);
  return r.ok ? "" : r.errors.map((e) => `${e.path} ${e.message}`).join(" | ");
}
check("rejects a missing question entry", /No match rules for this question/.test(brokenMatch((m) => { delete m.questions.BACKEND_002; })));
check("rejects a missing criterion", /No match rules for this rubric criterion/.test(brokenMatch((m) => { delete m.questions.BACKEND_001.criteria.criterion_2; })));
check("rejects an unknown criterion", /Unknown rubric criterion id/.test(brokenMatch((m) => { m.questions.BACKEND_001.criteria.criterion_99 = { concepts: [] }; })));
check("rejects an invalid regular expression", /Invalid regular expression/.test(brokenMatch((m) => { m.questions.BACKEND_001.criteria.criterion_1.concepts[0].patterns = ["(unclosed"]; })));
check("rejects needed above concept count", /Must be a whole number/.test(brokenMatch((m) => { m.questions.BACKEND_001.criteria.criterion_1.needed = 99; })));
check("rejects a condition pointing at an unknown concept", /Unknown concept id/.test(brokenMatch((m) => { m.questions.BACKEND_001.follow_ups.BACKEND_001_F1.ask_when[1].conceptId = "nope"; })));
check("rejects a missing follow-up entry", /No match rules for this follow-up/.test(brokenMatch((m) => { delete m.questions.BACKEND_001.follow_ups.BACKEND_001_F1; })));

// 3. Basic behaviour
console.log("\n== Basic behaviour ==");
const offTopic = "My favourite recipe is pasta with tomato sauce and basil, which I cook on Sundays with my family.";
let offTopicMax = 0;
bank.questions.forEach((q) => {
  offTopicMax = Math.max(offTopicMax, mainEval(q.id, offTopic).awardedPoints);
});
check("empty answer scores zero everywhere", bank.questions.every((q) => { const e = mainEval(q.id, "   "); return e.awardedPoints === 0 && e.answerEmpty; }));
check("gibberish scores zero everywhere", bank.questions.every((q) => mainEval(q.id, "asdf qwer zxcv uiop").awardedPoints === 0));
check("off-topic text scores at most 1 point on every question", offTopicMax <= 1, `max was ${offTopicMax}`);
check("points never exceed the maximum", bank.questions.every((q) => { const e = mainEval(q.id, q.reference_answer.detailed_explanation + " " + q.reference_answer.key_points.join(" ")); return e.awardedPoints <= e.maxPoints; }));

// 4. Graded answers: correct, partial, incorrect, differently worded
console.log("\n== Graded sample answers ==");
type Kind = "strong" | "partial" | "wrong" | "reworded";
const BANDS: Record<Kind, [number, number]> = { strong: [8, 10], partial: [2.5, 7], wrong: [0, 2], reworded: [5, 10] };
const samples: { qid: string; kind: Kind; text: string }[] = [
  { qid: "BACKEND_001", kind: "strong", text: "I would use POST /users to create a user and return 201 Created. GET /users/123 retrieves a user and returns 200 OK, or 404 Not Found if the user does not exist. PUT /users/123 replaces the entire resource, while PATCH /users/123 partially updates only the selected fields. DELETE /users/123 deletes the user and returns 204 No Content. Invalid input returns 400 Bad Request, an unauthenticated request returns 401 Unauthorized, a missing permission returns 403 Forbidden, and a server failure returns 500 Internal Server Error. PUT is idempotent because repeating the same request gives the same result, while PATCH is not necessarily idempotent." },
  { qid: "BACKEND_001", kind: "partial", text: "POST is used to create a user and GET is used to fetch a user. PUT and PATCH update a user and DELETE removes it. For the status codes I would return 200 for success and 404 if it is not found. PUT and PATCH are almost the same." },
  { qid: "BACKEND_001", kind: "wrong", text: "I would use GET for everything and keep the API simple. I would just always send the same response and never use special status codes." },
  { qid: "BACKEND_001", kind: "reworded", text: "To make a new user the client sends a POST. To read one, you issue a GET on the user's address and the server answers with success, or says the user is not there with a not found code. A PUT swaps the whole record for the one you send, whereas PATCH only changes the fields you include. Removing a user is a DELETE which returns no content. If the payload is wrong it is a bad request, and if the caller isn't logged in it is unauthorized while lacking rights is forbidden. Unexpected faults give an internal server error. PUT can be repeated safely and ends in the same state; that property is called idempotent." },
  { qid: "BACKEND_004", kind: "strong", text: "The two calls are independent, so I can run them in parallel with Promise.all: const [user, orders] = await Promise.all([getUser(userId), getOrders(userId)]); This starts both at the same time instead of waiting for the first. If one of them rejects, Promise.all rejects immediately, so I would wrap it in try catch and handle the error. If partial results are acceptable I would use Promise.allSettled. Note that Promise.all does not cancel the other operation, and I would limit concurrency for large batches." },
  { qid: "BACKEND_004", kind: "partial", text: "The calls don't depend on each other so I would use Promise.all to run them together. I would put it in a try catch. I think it's faster because they run at the same time." },
  { qid: "BACKEND_004", kind: "wrong", text: "Nothing needs to change. Awaiting the calls one at a time is already the fastest approach, and anything more would just add complexity." },
  { qid: "BACKEND_004", kind: "reworded", text: "The user lookup and the orders lookup do not rely on each other, so there is no reason to wait for the first to finish before starting the second. I would start both requests at once with promise dot all, and take the two values out of the array it returns. If either request fails the whole thing fails right away, so I would handle the failure in a catch, or use allSettled if partial data is acceptable. Also the slower request is not stopped when the other one fails." },
  { qid: "BACKEND_005", kind: "strong", text: "SELECT u.id AS user_id, u.name, COUNT(o.id) AS completed_order_count, SUM(o.amount) AS total_amount FROM Users u JOIN Orders o ON o.user_id = u.id WHERE o.status = 'completed' GROUP BY u.id, u.name HAVING COUNT(o.id) >= 3; The WHERE clause filters rows before grouping, and HAVING filters the groups after aggregation." },
  { qid: "BACKEND_005", kind: "partial", text: "I would join the users and orders tables, group by the user and count the orders." },
  { qid: "BACKEND_005", kind: "wrong", text: "I would just select everything from the Users table and count the rows in the application code afterwards." },
  { qid: "BACKEND_005", kind: "reworded", text: "Connect each user to their orders using the user id, keep only orders marked completed, then group the rows per user, count them and add up the amounts. After grouping, only keep the groups where the count is at least three." },
  { qid: "BACKEND_008", kind: "strong", text: "I would hash passwords with bcrypt or Argon2 using a unique salt and never store plaintext passwords. At login I look up the user and use bcrypt compare to verify the password against the stored hash, and return a generic invalid credentials error. After a successful login I issue a JWT access token with an expiry, or a session cookie, and a middleware verifies the token signature on every request. For authorization, a user must only access their own data, so I check ownership by comparing the user id from the token with the resource owner instead of trusting a user id from the request. I would also add rate limiting against brute force, use HTTPS, and keep the signing secret in an environment variable." },
  { qid: "BACKEND_008", kind: "partial", text: "I would hash the password with bcrypt and use a JWT token for login." },
  { qid: "BACKEND_008", kind: "wrong", text: "I would store the password as plain text in the database so that I can email it to users who forget it. Anyone who logs in can see all the data." },
  { qid: "BACKEND_008", kind: "reworded", text: "Passwords should never be saved directly. I run them through a slow one way function with a random value mixed in, like scrypt, and store only the result. When someone signs in I run the same function on what they typed and compare it with what is stored. Then I hand them a signed token that expires, and a piece of middleware checks that token on each request. Being signed in doesn't mean they can see everything, so each endpoint also checks that the record belongs to the logged in user, taking the id from the token and never from the body. I would limit login attempts and keep the secret key out of the code in an environment variable." },
];
samples.forEach((s) => {
  const ev = mainEval(s.qid, s.text);
  const [lo, hi] = BANDS[s.kind];
  const ok = ev.score10 >= lo && ev.score10 <= hi;
  check(`${s.qid} ${s.kind} answer scores ${lo}-${hi}`, ok, `scored ${ev.score10}; missed: ${missed(ev) || "none"}`);
  if (ok) console.log(`        (scored ${ev.score10})`);
});

// 5. Reference answers should score well against their own rubric
console.log("\n== Reference answers score against their own rubric ==");
bank.questions.forEach((q) => {
  const text = [q.reference_answer.summary, q.reference_answer.detailed_explanation, ...q.reference_answer.key_points].join(" ");
  const ev = mainEval(q.id, text);
  const level = ev.score10 >= 8 ? "good" : ev.score10 >= 6 ? "ok" : "LOW";
  check(`${q.id} reference answer >= 6 (${ev.score10}, ${level})`, ev.score10 >= 6, `missed: ${missed(ev)}`);
  (q.follow_ups ?? []).forEach((f) => {
    const ftext = [f.reference_answer.summary, f.reference_answer.detailed_explanation, ...f.reference_answer.key_points].join(" ");
    const fev = followUpEval(q.id, f.id, ftext);
    check(`${f.id} reference answer >= 6 (${fev.score10})`, fev.score10 >= 6, `missed: ${missed(fev)}`);
  });
});

// 6. Follow-up decisions using the rules in the match file
console.log("\n== Follow-up decisions ==");
function decide(qid: string, text: string, spare = 1000, asked: string[] = []) {
  const q = bank.questions.find((x) => x.id === qid)!;
  const ev = mainEval(qid, text);
  return chooseFollowUp(q, signalsFromEvaluation(ev), { spareSeconds: spare, askedFollowUpIds: asked }, match.questions[qid].follow_ups);
}
const q1strong = samples.find((s) => s.qid === "BACKEND_001" && s.kind === "strong")!.text;
check("Q1: asks the idempotency follow-up after a strong answer", decide("BACKEND_001", q1strong).ask);
check("Q1: skips it when the answer already mentions an idempotency key", !decide("BACKEND_001", q1strong + " I would also use an idempotency key.").ask);
check("Q1: skips it after a weak answer", !decide("BACKEND_001", samples.find((s) => s.qid === "BACKEND_001" && s.kind === "wrong")!.text).ask);
check("Q1: skips it when there is no spare time", !decide("BACKEND_001", q1strong, 5).ask);
check("Q1: skips it when already asked", !decide("BACKEND_001", q1strong, 1000, ["BACKEND_001_F1"]).ask);
check("Q1: skips it after an empty answer", !decide("BACKEND_001", "  ").ask);
const q3 = "The handler sends the 404 but does not return, so execution continues and a second response is sent. I would return after the 404, use async await with try catch, return 400 for an invalid id, and call next err for other errors.";
check("Q3: asks the middleware follow-up when authentication was not mentioned", decide("BACKEND_003", q3).ask);
check("Q3: skips it when authentication middleware was already covered", !decide("BACKEND_003", q3 + " I would also use authentication middleware.").ask);
const q5 = samples.find((s) => s.qid === "BACKEND_005" && s.kind === "strong")!.text;
check("Q5: asks the performance follow-up after a correct query", decide("BACKEND_005", q5).ask);
check("Q5: skips it when EXPLAIN or indexes were already discussed", !decide("BACKEND_005", q5 + " I would check EXPLAIN too.").ask);
const q9 = "I scan the array from left to right and keep a hash set of values already seen. If the value is already in the set I return it immediately, otherwise I add it, and after the loop I return -1. Time is O(n) and space is O(n).";
check("Q9: asks the streaming follow-up after a correct set solution", decide("BACKEND_009", q9).ask);
check("Q9: skips it when streaming was already discussed", !decide("BACKEND_009", q9 + " If the data is too large for memory I would use an external store.").ask);
check("a question without follow-ups never asks one", !decide("BACKEND_002", "validate the schema").ask);

// 7. Follow-up answers are scored with the follow-up's own rubric
console.log("\n== Follow-up scoring ==");
const q1 = bank.questions.find((q) => q.id === "BACKEND_001")!;
const fev = evaluateForPrompt(match, { kind: "followUp", question: q1, followUp: q1.follow_ups![0] }, "Send an idempotency key with the request, store it with a unique constraint, and return the same response when the key repeats.");
check("follow-up evaluation uses the follow-up rubric and ids", fev.followUpId === "BACKEND_001_F1" && fev.awardedPoints >= 7, `scored ${fev.awardedPoints}`);

// 8. Known limitations (printed, not asserted)
console.log("\n== Known limitations (information only) ==");
const stuffing = "bcrypt argon2 hash salt compare jwt token session signature middleware authorization ownership rate limiting https csrf secret";
console.log(`INFO  keyword stuffing scores ${mainEval("BACKEND_008", stuffing).score10}/10 on BACKEND_008 (a real answer would not be a word list).`);
const wrongButKeywords = "Promise.all automatically cancels the other request, and awaiting one after another is always faster than Promise.all.";
console.log(`INFO  a wrong answer that uses the right words scores ${mainEval("BACKEND_004", wrongButKeywords).score10}/10 on BACKEND_004 (keywords cannot judge correctness).`);

console.log(failures.length === 0 ? "\nAll evaluation checks passed." : `\n${failures.length} check(s) failed. Paste this whole output to tune the rules.`);
if (failures.length > 0) process.exit(1);
