import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "shakaiquiz-progress-v1";

export type QuestionRecord = {
  attempts: number;
  correct: number;
  lastAnsweredAt: string;
};

export type SavedQuizSession = {
  mode: "input" | "choice";
  weaknessMode: boolean;
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
  selectedTitle: string | null;
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
  selectedTitle: null,
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
      selectedTitle: parsed.selectedTitle ?? null,
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
    selectedTitle: progress.selectedTitle,
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

const levelNames = [
  "社会科ビギナー",
  "用語の見習い",
  "地図読みルーキー",
  "時代の探検家",
  "文化の案内人",
  "資料の読み手",
  "歴史の研究員",
  "社会の戦略家",
  "知識の航海士",
  "社会科マスター",
  "学びの賢者",
  "総合対策の達人",
];

export function levelNameForLevel(level: number): string {
  return levelNames[Math.min(Math.max(level - 1, 0), levelNames.length - 1)];
}

export function levelExperience(experience: number): { current: number; next: number; remaining: number } {
  const currentLevelExperience = experience % 100;
  return { current: currentLevelExperience, next: 100, remaining: 100 - currentLevelExperience };
}

export function titleForPoints(points: number): string {
  return unlockedTitles(points).at(-1)?.name ?? "社会科ビギナー";
}

export function nextTitleForPoints(points: number): { title: string; required: number } | null {
  const next = titleDefinitions.find((title) => title.required > points);
  return next ? { title: next.name, required: next.required } : null;
}

export type TitleDefinition = { name: string; required: number };

export const titleDefinitions: TitleDefinition[] = [
  { name: "社会科ビギナー", required: 0 },
  { name: "用語ハンター", required: 25 },
  { name: "地理の旅人", required: 60 },
  { name: "歴史の発掘者", required: 120 },
  { name: "公民の観察者", required: 200 },
  { name: "文化の案内人", required: 300 },
  { name: "時代の探究者", required: 450 },
  { name: "資料読解マスター", required: 650 },
  { name: "社会科の達人", required: 900 },
  { name: "総合対策の賢者", required: 1200 },
];

export function unlockedTitles(points: number): TitleDefinition[] {
  return titleDefinitions.filter((title) => title.required <= points);
}

export function percentage(correct: number, total: number): number {
  return total === 0 ? 0 : Math.round((correct / total) * 100);
}
