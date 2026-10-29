import type { RecentSession, WeakTopic } from "../types";

// SAMPLE DATA ONLY. Real history arrives in Phase 5.

export const sampleLastInterview = {
  date: "Sample · 2 days ago",
  score: 6.8,
  strongAreas: ["JavaScript", "REST APIs"],
  weakAreas: ["SQL joins", "Indexing"],
};

export const sampleWeakTopics: WeakTopic[] = [
  { topic: "SQL joins and indexing", mastery: 35, trend: "improving" },
  { topic: "Node.js event loop", mastery: 48, trend: "steady" },
  { topic: "MongoDB aggregation", mastery: 55, trend: "improving" },
  { topic: "Express error handling", mastery: 62, trend: "steady" },
];

export const sampleRecentSessions: RecentSession[] = [
  {
    id: "s3",
    date: "Sample · 2 days ago",
    focus: "Full backend interview",
    score: 6.8,
    durationMin: 30,
    status: "Completed",
  },
  {
    id: "s2",
    date: "Sample · 5 days ago",
    focus: "SQL and MongoDB",
    score: 5.9,
    durationMin: 15,
    status: "Completed",
  },
  {
    id: "s1",
    date: "Sample · 9 days ago",
    focus: "Node.js and Express",
    score: 5.2,
    durationMin: 20,
    status: "Ended early",
  },
];