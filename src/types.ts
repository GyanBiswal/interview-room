export type View = "dashboard" | "setup" | "pending";

export type Difficulty = "target" | "stretch";
export type InterviewMode = "voice" | "text";

export interface SetupConfig {
  role: "backend";
  experience: "fresher";
  difficulty: Difficulty;
  durationMin: number;
  focusAreas: string[]; // competency ids from the question bank
  mode: InterviewMode;
}

export interface RecentSession {
  id: string;
  date: string;
  focus: string;
  score: number; // out of 10
  durationMin: number;
  status: "Completed" | "Ended early";
}

export interface WeakTopic {
  topic: string;
  mastery: number; // 0-100
  trend: "improving" | "steady" | "declining";
}
