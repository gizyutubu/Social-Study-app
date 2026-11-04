import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "shakaiquiz-progress-v1";

export type QuestionRecord = {
  attempts: number;
  correct: number;
  lastAnsweredAt: string;
};

export type SavedQuizSession = {
  mode: "input" | "choice";
  category: string;
  difficulty: string;
  questionCount: number | "すべて";
  questionIds: string[];
  choicesByQuestion: Record<string, string[]>;
  currentIndex: number;
  sessionCorrect: number;
  sessionAnswered: number;
  sessionExperience: number;
  sessionPoints: number;
  answerState: {
    correct: boolean;
    submitted: string;
    experienceGained: number;
    pointsGained: number;
  } | null;
  draft: string;
  savedAt: string;
};

export type ProgressState = {
  records: Record<string, QuestionRecord>;
  totalAttempts: number;
  totalCorrect: number;
  streak: number;
  bestStreak: number;
  experience: number;
  points: number;
  activeSession: SavedQuizSession | null;
};

export const emptyProgress: ProgressState = {
  records: {},
  totalAttempts: 0,
  totalCorrect: 0,
  streak: 0,
  bestStreak: 0,
  experience: 0,
  points: 0,
  activeSession: null,
};

export async function loadProgress(): Promise<ProgressState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyProgress;
    const parsed = JSON.parse(raw) as Partial<ProgressState>;
    return {
      records: parsed.records ?? {},
      totalAttempts: parsed.totalAttempts ?? 0,
      totalCorrect: parsed.totalCorrect ?? 0,
      streak: parsed.streak ?? 0,
      bestStreak: parsed.bestStreak ?? 0,
      experience: parsed.experience ?? 0,
      points: parsed.points ?? 0,
      activeSession: parsed.activeSession ?? null,
    };
  } catch {
    return emptyProgress;
  }
}

export async function saveProgress(progress: ProgressState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Progress is a convenience feature; a storage error must not interrupt a quiz.
  }
}

export function recordAnswer(
  progress: ProgressState,
  questionId: string,
  correct: boolean,
): ProgressState {
  const previous = progress.records[questionId] ?? {
    attempts: 0,
    correct: 0,
    lastAnsweredAt: "",
  };
  const streak = correct ? progress.streak + 1 : 0;
  const reward = rewardForAnswer(correct, streak);
  const updated: ProgressState = {
    records: {
      ...progress.records,
      [questionId]: {
        attempts: previous.attempts + 1,
        correct: previous.correct + (correct ? 1 : 0),
        lastAnsweredAt: new Date().toISOString(),
      },
    },
    totalAttempts: progress.totalAttempts + 1,
    totalCorrect: progress.totalCorrect + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(progress.bestStreak, streak),
    experience: progress.experience + reward.experience,
    points: progress.points + reward.points,
    activeSession: progress.activeSession,
  };
  return updated;
}

export function rewardForAnswer(correct: boolean, streak: number): { experience: number; points: number } {
  if (!correct) return { experience: 0, points: 0 };
  return {
    experience: 10 + Math.min(Math.max(streak - 1, 0), 5) * 2,
    points: 1 + Math.floor(Math.max(streak - 1, 0) / 3),
  };
}

export function levelForExperience(experience: number): number {
  return Math.floor(experience / 100) + 1;
}

export function levelExperience(experience: number): { current: number; next: number; remaining: number } {
  const currentLevelExperience = experience % 100;
  return { current: currentLevelExperience, next: 100, remaining: 100 - currentLevelExperience };
}

export function titleForPoints(points: number): string {
  if (points >= 1000) return "社会科の達人";
  if (points >= 600) return "時代の探究者";
  if (points >= 300) return "社会マスター";
  if (points >= 100) return "用語ハンター";
  return "社会科ビギナー";
}

export function nextTitleForPoints(points: number): { title: string; required: number } | null {
  if (points >= 1000) return null;
  if (points >= 600) return { title: "社会科の達人", required: 1000 };
  if (points >= 300) return { title: "時代の探究者", required: 600 };
  if (points >= 100) return { title: "社会マスター", required: 300 };
  return { title: "用語ハンター", required: 100 };
}

export function percentage(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}
