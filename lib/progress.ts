import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "shakaiquiz-progress-v1";

export type QuestionRecord = {
  attempts: number;
  correct: number;
  lastAnsweredAt: string;
};

export type ProgressState = {
  records: Record<string, QuestionRecord>;
  totalAttempts: number;
  totalCorrect: number;
  streak: number;
  bestStreak: number;
};

export const emptyProgress: ProgressState = {
  records: {},
  totalAttempts: 0,
  totalCorrect: 0,
  streak: 0,
  bestStreak: 0,
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
  };
  return updated;
}

export function percentage(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}
