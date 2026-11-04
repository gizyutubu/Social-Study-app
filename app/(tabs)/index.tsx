import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ScreenContainer } from "@/components/screen-container";
import {
  categories,
  difficulties,
  questions,
  type Category,
  type Difficulty,
  type Question,
} from "@/data/questions";
import {
  emptyProgress,
  loadProgress,
  levelExperience,
  levelForExperience,
  nextTitleForPoints,
  percentage,
  recordAnswer,
  rewardForAnswer,
  saveProgress,
  titleForPoints,
  type ProgressState,
} from "@/lib/progress";

type QuizMode = "input" | "choice";
type CategoryFilter = Category | "すべて";
type DifficultyFilter = Difficulty | "すべて";
type QuestionCount = 5 | 10 | 15 | 20 | "すべて";
type Screen = "setup" | "quiz" | "summary";
type AnswerState = {
  correct: boolean;
  submitted: string;
  experienceGained: number;
  pointsGained: number;
};

const COLORS = {
  ink: "#17233C",
  muted: "#65718A",
  paper: "#F8F9FC",
  card: "#FFFFFF",
  line: "#E3E8F2",
  blue: "#2F5BFF",
  blueSoft: "#EAF0FF",
  green: "#14866B",
  greenSoft: "#E7F7F0",
  red: "#C84657",
  redSoft: "#FFF0F2",
  amber: "#C47B0B",
  amberSoft: "#FFF6DF",
};

const categoryColors: Record<Category, { background: string; text: string }> = {
  公民: { background: "#EAF0FF", text: "#2F5BFF" },
  歴史: { background: "#FFF1E6", text: "#C7682B" },
  地理: { background: "#E8F7F0", text: "#14866B" },
  人物史: { background: "#F3EDFF", text: "#7541B6" },
};

const questionCounts: QuestionCount[] = [5, 10, 15, 20, "すべて"];

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function normalizeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[\s　]/g, "")
    .replace(/[「」『』（）()・]/g, "");
}

function formatFilter(value: string): string {
  return value === "すべて" ? "すべて" : value;
}

function StatChip({ label, value, accent = COLORS.blue }: { label: string; value: string; accent?: string }) {
  return (
    <View style={styles.statChip}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: accent }]}>{value}</Text>
    </View>
  );
}

function SelectChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.selectChip, selected && styles.selectChipSelected]}
    >
      <Text style={[styles.selectChipText, selected && styles.selectChipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <View style={styles.sectionTitleWrap}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const [screen, setScreen] = useState<Screen>("setup");
  const [mode, setMode] = useState<QuizMode>("choice");
  const [category, setCategory] = useState<CategoryFilter>("すべて");
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("すべて");
  const [questionCount, setQuestionCount] = useState<QuestionCount>("すべて");
  const [progress, setProgress] = useState<ProgressState>(emptyProgress);
  const [sessionQuestions, setSessionQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answerState, setAnswerState] = useState<AnswerState | null>(null);
  const [draft, setDraft] = useState("");
  const [sessionCorrect, setSessionCorrect] = useState(0);
  const [sessionAnswered, setSessionAnswered] = useState(0);
  const [sessionExperience, setSessionExperience] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const previousFirstQuestionId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    loadProgress().then((saved) => {
      if (active) {
        setProgress(saved);
        setIsLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const availableQuestions = useMemo(
    () =>
      questions.filter(
        (question) =>
          (category === "すべて" || question.category === category) &&
          (difficulty === "すべて" || question.difficulty === difficulty),
      ),
    [category, difficulty],
  );

  const currentQuestion = sessionQuestions[currentIndex];
  const overallPercentage = percentage(progress.totalCorrect, progress.totalAttempts);
  const currentLevel = levelForExperience(progress.experience);
  const levelProgress = levelExperience(progress.experience);
  const currentTitle = titleForPoints(progress.points);
  const nextTitle = nextTitleForPoints(progress.points);

  const startQuiz = () => {
    const shuffledQuestions = shuffle(availableQuestions);
    const selectedQuestions = questionCount === "すべて"
      ? shuffledQuestions
      : shuffledQuestions.slice(0, Math.min(questionCount, shuffledQuestions.length));
    const randomizedQuestions = selectedQuestions.map((question) => ({
      ...question,
      choices: shuffle(question.choices),
    }));
    if (
      randomizedQuestions.length > 1 &&
      randomizedQuestions[0].id === previousFirstQuestionId.current
    ) {
      const swapIndex = 1 + Math.floor(Math.random() * (randomizedQuestions.length - 1));
      [randomizedQuestions[0], randomizedQuestions[swapIndex]] = [
        randomizedQuestions[swapIndex],
        randomizedQuestions[0],
      ];
    }
    previousFirstQuestionId.current = randomizedQuestions[0]?.id ?? null;
    setSessionQuestions(randomizedQuestions);
    setCurrentIndex(0);
    setAnswerState(null);
    setDraft("");
    setSessionCorrect(0);
    setSessionAnswered(0);
    setSessionExperience(0);
    setSessionPoints(0);
    setScreen("quiz");
  };

  const submitAnswer = (value: string) => {
    if (!currentQuestion || answerState) return;
    Keyboard.dismiss();
    const accepted = currentQuestion.acceptedAnswers ?? [currentQuestion.answer];
    const correct = accepted.some((answer) => normalizeAnswer(answer) === normalizeAnswer(value));
    const nextStreak = correct ? progress.streak + 1 : 0;
    const reward = rewardForAnswer(correct, nextStreak);
    const nextProgress = recordAnswer(progress, currentQuestion.id, correct);
    setProgress(nextProgress);
    void saveProgress(nextProgress);
    setAnswerState({ correct, submitted: value, experienceGained: reward.experience, pointsGained: reward.points });
    setSessionAnswered((count) => count + 1);
    if (correct) setSessionCorrect((count) => count + 1);
    setSessionExperience((total) => total + reward.experience);
    setSessionPoints((total) => total + reward.points);
  };

  const moveNext = () => {
    if (currentIndex >= sessionQuestions.length - 1) {
      setScreen("summary");
      return;
    }
    setCurrentIndex((index) => index + 1);
    setAnswerState(null);
    setDraft("");
  };

  const returnToSetup = () => {
    setScreen("setup");
    setAnswerState(null);
    setDraft("");
  };

  if (isLoading) {
    return (
      <ScreenContainer safeAreaClassName="bg-background">
        <View style={styles.loadingScreen}>
          <View style={styles.logoMark}><Text style={styles.logoText}>社</Text></View>
          <ActivityIndicator color={COLORS.blue} size="small" />
          <Text style={styles.loadingText}>学習データを読み込んでいます</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (screen === "quiz" && currentQuestion) {
    return (
      <ScreenContainer safeAreaClassName="bg-background">
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.quizScreen}>
            <ScrollView
              contentContainerStyle={[styles.quizScroll, answerState && styles.quizScrollWithAction]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
            <View style={styles.quizHeader}>
              <Pressable onPress={returnToSetup} style={styles.ghostButton}>
                <Text style={styles.ghostButtonText}>条件変更</Text>
              </Pressable>
              <Text style={styles.progressCount}>
                {currentIndex + 1} / {sessionQuestions.length}
              </Text>
              <View style={styles.streakPill}>
                <Text style={styles.streakPillText}>連続 {progress.streak}</Text>
              </View>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${((currentIndex + (answerState ? 1 : 0)) / sessionQuestions.length) * 100}%` },
                ]}
              />
            </View>

            <View style={styles.questionMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: categoryColors[currentQuestion.category].background }]}>
                <Text style={[styles.categoryBadgeText, { color: categoryColors[currentQuestion.category].text }]}>
                  {currentQuestion.category}
                </Text>
              </View>
              <Text style={styles.difficultyText}>{currentQuestion.difficulty} • {mode === "choice" ? "4択" : "入力"}</Text>
            </View>

            <View style={styles.questionCard}>
              <View style={styles.noteLabel}>
                <Text style={styles.noteLabelText}>今日の一問</Text>
              </View>
              <Text style={styles.questionText}>{currentQuestion.prompt}</Text>
            </View>

            {mode === "choice" ? (
              <View style={styles.answerList}>
                {currentQuestion.choices.map((choice, index) => {
                  const selected = answerState?.submitted === choice;
                  const isCorrect = choice === currentQuestion.answer;
                  const optionStyle = answerState
                    ? isCorrect
                      ? styles.optionCorrect
                      : selected
                        ? styles.optionWrong
                        : styles.optionDisabled
                    : styles.option;
                  return (
                    <Pressable
                      key={choice}
                      disabled={Boolean(answerState)}
                      onPress={() => submitAnswer(choice)}
                      style={optionStyle}
                    >
                      <View style={[styles.optionLetter, answerState && isCorrect && styles.optionLetterCorrect, answerState && selected && !isCorrect && styles.optionLetterWrong]}>
                        <Text style={[styles.optionLetterText, answerState && (isCorrect || selected) && styles.optionLetterTextActive]}>
                          {String.fromCharCode(65 + index)}
                        </Text>
                      </View>
                      <Text style={[styles.optionText, answerState && isCorrect && styles.optionTextCorrect, answerState && selected && !isCorrect && styles.optionTextWrong]}>
                        {choice}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.inputArea}>
                <Text style={styles.inputHint}>キーワードを入力してください</Text>
                <TextInput
                  value={draft}
                  onChangeText={setDraft}
                  editable={!answerState}
                  placeholder="答えを入力"
                  placeholderTextColor="#9AA5B8"
                  style={styles.textInput}
                  returnKeyType="done"
                  onSubmitEditing={() => submitAnswer(draft)}
                />
                <Pressable
                  disabled={!draft.trim() || Boolean(answerState)}
                  onPress={() => submitAnswer(draft)}
                  style={[styles.primaryButton, (!draft.trim() || answerState) && styles.primaryButtonDisabled]}
                >
                  <Text style={styles.primaryButtonText}>答え合わせをする</Text>
                </Pressable>
              </View>
            )}

            {answerState && (
              <View style={[styles.feedbackCard, answerState.correct ? styles.feedbackCorrect : styles.feedbackWrong]}>
                <View style={styles.feedbackHeader}>
                  <View style={[styles.feedbackIcon, answerState.correct ? styles.feedbackIconCorrect : styles.feedbackIconWrong]}>
                    <Text style={styles.feedbackIconText}>{answerState.correct ? "✓" : "!"}</Text>
                  </View>
                  <View style={styles.flex}>
                    <Text style={[styles.feedbackTitle, { color: answerState.correct ? COLORS.green : COLORS.red }]}>
                      {answerState.correct ? "正解！その調子" : "おしい、復習しよう"}
                    </Text>
                    <Text style={styles.feedbackSubtext}>
                      {answerState.correct ? "知識が1つ積み上がりました。" : "正答とポイントを確認しましょう。"}
                    </Text>
                  </View>
                </View>
                <View style={styles.answerReveal}>
                  <Text style={styles.answerRevealLabel}>正答</Text>
                  <Text style={styles.answerRevealText}>{currentQuestion.answer}</Text>
                </View>
                <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
                {answerState.correct && (
                  <View style={styles.rewardRow}>
                    <Text style={styles.rewardText}>+{answerState.experienceGained} XP</Text>
                    <Text style={styles.rewardText}>+{answerState.pointsGained} ポイント</Text>
                    <Text style={styles.rewardStreakText}>連続 {progress.streak}</Text>
                  </View>
                )}
              </View>
            )}
            </ScrollView>
            {answerState && (
              <View style={styles.quizActionBar}>
                <View style={styles.quizActionHint}>
                  <Text style={styles.quizActionHintTitle}>
                    {answerState.correct ? "正解を記録しました" : "解説を確認しましたか？"}
                  </Text>
                  <Text style={styles.quizActionHintText}>ボタンで次の問題へ進めます</Text>
                </View>
                <Pressable onPress={moveNext} style={styles.nextButtonFixed}>
                  <Text style={styles.nextButtonText}>
                    {currentIndex >= sessionQuestions.length - 1 ? "結果を見る" : "次の一問へ"}
                  </Text>
                  <Text style={styles.nextButtonArrow}>→</Text>
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </ScreenContainer>
    );
  }

  if (screen === "summary") {
    const sessionPercentage = percentage(sessionCorrect, sessionAnswered);
    return (
      <ScreenContainer safeAreaClassName="bg-background">
        <ScrollView contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.brandRow}>
            <View style={styles.logoMark}><Text style={styles.logoText}>社</Text></View>
            <View>
              <Text style={styles.brandName}>中学社会 総合対策</Text>
              <Text style={styles.brandSubline}>学習ノート</Text>
            </View>
          </View>
          <View style={styles.summaryHero}>
            <Text style={styles.eyebrow}>SESSION COMPLETE</Text>
            <Text style={styles.summaryTitle}>おつかれさま！</Text>
            <Text style={styles.summarySubtitle}>今日の学習を記録しました。少しずつ続けるほど、得点力になります。</Text>
            <View style={styles.summaryScoreCircle}>
              <Text style={styles.summaryScore}>{sessionPercentage}</Text>
              <Text style={styles.summaryScoreUnit}>%</Text>
            </View>
            <Text style={styles.summaryScoreLabel}>{sessionAnswered}問中 {sessionCorrect}問正解</Text>
            <Text style={styles.summaryRankText}>Lv.{currentLevel}　{currentTitle}</Text>
          </View>
          <View style={styles.statRow}>
            <StatChip label="今回の正答率" value={`${sessionPercentage}%`} accent={COLORS.blue} />
            <StatChip label="連続正解" value={`${progress.streak}問`} accent={COLORS.green} />
            <StatChip label="ベスト" value={`${progress.bestStreak}問`} accent={COLORS.amber} />
          </View>
          <View style={styles.summaryNote}>
            <Text style={styles.summaryNoteTitle}>次のおすすめ</Text>
            <Text style={styles.summaryNoteText}>間違えた問題は、同じカテゴリをもう一度解くと記憶に残りやすくなります。</Text>
          </View>
          <View style={styles.rewardSummary}>
            <View>
              <Text style={styles.rewardSummaryLabel}>今回の獲得</Text>
              <Text style={styles.rewardSummaryTitle}>連続正解でポイントアップ</Text>
            </View>
            <View style={styles.rewardSummaryValues}>
              <Text style={styles.rewardSummaryXp}>+{sessionExperience} XP</Text>
              <Text style={styles.rewardSummaryPoints}>+{sessionPoints} pt</Text>
            </View>
          </View>
          <Pressable onPress={startQuiz} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>同じ条件でもう一度</Text>
          </Pressable>
          <Pressable onPress={returnToSetup} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>条件を変えて学習する</Text>
          </Pressable>
        </ScrollView>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer safeAreaClassName="bg-background">
      <ScrollView contentContainerStyle={styles.setupScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={styles.logoMark}><Text style={styles.logoText}>社</Text></View>
          <View style={styles.brandCopy}>
            <Text style={styles.brandName}>中学社会 総合対策</Text>
            <Text style={styles.brandSubline}>テスト前の5分を、社会の得点に</Text>
          </View>
          <View style={styles.streakTopPill}>
            <Text style={styles.streakTopValue}>{progress.streak}</Text>
            <Text style={styles.streakTopLabel}>連続</Text>
          </View>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>STUDY DASHBOARD</Text>
          <Text style={styles.heroTitle}>今日はどこから攻める？</Text>
          <Text style={styles.heroSubtitle}>教材から厳選した一問で、知識をすばやく定着。</Text>
        </View>

        <View style={styles.rankPanel}>
          <View style={styles.levelBadge}>
            <Text style={styles.levelBadgeLabel}>LV</Text>
            <Text style={styles.levelBadgeValue}>{currentLevel}</Text>
          </View>
          <View style={styles.rankCopy}>
            <View style={styles.rankTitleRow}>
              <Text style={styles.rankTitle}>{currentTitle}</Text>
              <Text style={styles.pointsLabel}>{progress.points} pt</Text>
            </View>
            <View style={styles.levelTrack}>
              <View style={[styles.levelFill, { width: `${levelProgress.current}%` }]} />
            </View>
            <Text style={styles.rankSubtext}>
              {nextTitle ? `あと${nextTitle.required - progress.points}ptで「${nextTitle.title}」` : "最高ランクの称号を獲得中"}
            </Text>
          </View>
        </View>

        <View style={styles.statRow}>
          <StatChip label="全体の正答率" value={`${overallPercentage}%`} accent={COLORS.blue} />
          <StatChip label="回答した問題" value={`${progress.totalAttempts}問`} accent={COLORS.green} />
          <StatChip label="ベスト連続" value={`${progress.bestStreak}問`} accent={COLORS.amber} />
        </View>

        <View style={styles.setupCard}>
          <SectionTitle eyebrow="01 / MODE" title="答え方を選ぶ" />
          <View style={styles.modeRow}>
            <Pressable onPress={() => setMode("choice")} style={[styles.modeCard, mode === "choice" && styles.modeCardSelected]}>
              <View style={[styles.modeIcon, mode === "choice" && styles.modeIconSelected]}><Text style={styles.modeIconText}>A</Text></View>
              <Text style={[styles.modeTitle, mode === "choice" && styles.modeTitleSelected]}>4択問題</Text>
              <Text style={styles.modeDescription}>選んですぐ答え合わせ</Text>
              {mode === "choice" && <View style={styles.selectedDot} />}
            </Pressable>
            <Pressable onPress={() => setMode("input")} style={[styles.modeCard, mode === "input" && styles.modeCardSelected]}>
              <View style={[styles.modeIcon, mode === "input" && styles.modeIconSelected]}><Text style={styles.modeIconText}>⌨</Text></View>
              <Text style={[styles.modeTitle, mode === "input" && styles.modeTitleSelected]}>答えを入力</Text>
              <Text style={styles.modeDescription}>自分の言葉で思い出す</Text>
              {mode === "input" && <View style={styles.selectedDot} />}
            </Pressable>
          </View>
        </View>

        <View style={styles.setupCard}>
          <SectionTitle eyebrow="02 / RANGE" title="出題範囲を決める" />
          <Text style={styles.fieldLabel}>カテゴリ</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {categories.map((item) => (
              <SelectChip key={item} label={item} selected={category === item} onPress={() => setCategory(item)} />
            ))}
          </ScrollView>
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>難易度</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {difficulties.map((item) => (
              <SelectChip key={item} label={item} selected={difficulty === item} onPress={() => setDifficulty(item)} />
            ))}
          </ScrollView>
          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>問題数</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipScroll}>
            {questionCounts.map((count) => (
              <SelectChip
                key={String(count)}
                label={count === "すべて" ? "すべて" : `${count}問`}
                selected={questionCount === count}
                onPress={() => setQuestionCount(count)}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.startPanel}>
          <View style={styles.startPanelCopy}>
            <Text style={styles.startPanelEyebrow}>READY TO GO</Text>
            <Text style={styles.startPanelTitle}>{questionCount === "すべて" ? availableQuestions.length : Math.min(questionCount, availableQuestions.length)}問からスタート</Text>
            <Text style={styles.startPanelText}>{formatFilter(category)} / {formatFilter(difficulty)} / {mode === "choice" ? "4択" : "入力"}</Text>
          </View>
          <Pressable onPress={startQuiz} style={styles.startButton}>
            <Text style={styles.startButtonText}>学習開始</Text>
            <Text style={styles.startButtonArrow}>→</Text>
          </Pressable>
        </View>

        <Text style={styles.sourceText}>出典：添付教材「中学社会総合対策まとめ」の記述・用語・人物史500問を収録</Text>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  quizScreen: { flex: 1, backgroundColor: COLORS.paper },
  loadingScreen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16, backgroundColor: COLORS.paper },
  loadingText: { color: COLORS.muted, fontSize: 13 },
  setupScroll: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 36, gap: 18, backgroundColor: COLORS.paper },
  quizScroll: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 36, gap: 18, backgroundColor: COLORS.paper, flexGrow: 1 },
  quizScrollWithAction: { paddingBottom: 18 },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  brandCopy: { flex: 1 },
  logoMark: { width: 42, height: 42, borderRadius: 13, backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center", shadowColor: COLORS.blue, shadowOpacity: 0.2, shadowRadius: 10, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  logoText: { color: "#FFFFFF", fontSize: 24, fontWeight: "900" },
  brandName: { color: COLORS.ink, fontSize: 16, fontWeight: "800", letterSpacing: 0.1 },
  brandSubline: { color: COLORS.muted, fontSize: 11, marginTop: 2 },
  streakTopPill: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.amberSoft, borderRadius: 14, minWidth: 52, height: 48 },
  streakTopValue: { color: COLORS.amber, fontSize: 18, fontWeight: "900", lineHeight: 20 },
  streakTopLabel: { color: COLORS.amber, fontSize: 10, fontWeight: "700" },
  heroBlock: { marginTop: 10, gap: 5 },
  eyebrow: { color: COLORS.blue, fontSize: 10, fontWeight: "900", letterSpacing: 1.7 },
  heroTitle: { color: COLORS.ink, fontSize: 30, fontWeight: "900", letterSpacing: -0.7 },
  heroSubtitle: { color: COLORS.muted, fontSize: 14, lineHeight: 21 },
  rankPanel: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.ink, borderRadius: 19, padding: 13 },
  levelBadge: { width: 52, height: 52, borderRadius: 17, backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center" },
  levelBadgeLabel: { color: "#C9D4FF", fontSize: 9, fontWeight: "900", letterSpacing: 1 },
  levelBadgeValue: { color: "#FFFFFF", fontSize: 23, fontWeight: "900", lineHeight: 25 },
  rankCopy: { flex: 1, gap: 5 },
  rankTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rankTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  pointsLabel: { color: "#A8B9FF", fontSize: 12, fontWeight: "900" },
  levelTrack: { height: 6, borderRadius: 6, backgroundColor: "#3A4767", overflow: "hidden" },
  levelFill: { height: "100%", borderRadius: 6, backgroundColor: "#8EA2FF" },
  rankSubtext: { color: "#CBD3E9", fontSize: 10 },
  statRow: { flexDirection: "row", gap: 8 },
  statChip: { flex: 1, paddingVertical: 12, paddingHorizontal: 10, backgroundColor: COLORS.card, borderRadius: 14, borderWidth: 1, borderColor: COLORS.line },
  statLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "700", marginBottom: 3 },
  statValue: { fontSize: 18, fontWeight: "900" },
  setupCard: { backgroundColor: COLORS.card, borderRadius: 22, borderWidth: 1, borderColor: COLORS.line, padding: 16, gap: 14 },
  sectionTitleWrap: { gap: 3 },
  sectionTitle: { color: COLORS.ink, fontSize: 18, fontWeight: "900" },
  modeRow: { flexDirection: "row", gap: 10 },
  modeCard: { flex: 1, minHeight: 122, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 17, padding: 13, backgroundColor: COLORS.paper, position: "relative" },
  modeCardSelected: { borderColor: COLORS.blue, backgroundColor: COLORS.blueSoft },
  modeIcon: { width: 30, height: 30, borderRadius: 10, backgroundColor: "#E4E8F1", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  modeIconSelected: { backgroundColor: COLORS.blue },
  modeIconText: { color: COLORS.ink, fontSize: 14, fontWeight: "900" },
  modeTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "800" },
  modeTitleSelected: { color: COLORS.blue },
  modeDescription: { color: COLORS.muted, fontSize: 11, lineHeight: 16, marginTop: 4 },
  selectedDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.blue, position: "absolute", top: 13, right: 13 },
  fieldLabel: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  fieldLabelSpaced: { marginTop: 2 },
  chipScroll: { gap: 8 },
  selectChip: { borderWidth: 1, borderColor: COLORS.line, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, backgroundColor: COLORS.paper },
  selectChipSelected: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  selectChipText: { color: COLORS.muted, fontSize: 13, fontWeight: "800" },
  selectChipTextSelected: { color: "#FFFFFF" },
  startPanel: { borderRadius: 22, padding: 17, backgroundColor: COLORS.ink, flexDirection: "row", alignItems: "center", gap: 14, shadowColor: COLORS.ink, shadowOpacity: 0.14, shadowRadius: 12, shadowOffset: { width: 0, height: 7 }, elevation: 3 },
  startPanelCopy: { flex: 1, gap: 3 },
  startPanelEyebrow: { color: "#A8B9FF", fontSize: 9, fontWeight: "900", letterSpacing: 1.5 },
  startPanelTitle: { color: "#FFFFFF", fontSize: 17, fontWeight: "900" },
  startPanelText: { color: "#CBD3E9", fontSize: 11, marginTop: 3 },
  startButton: { backgroundColor: COLORS.blue, paddingHorizontal: 15, paddingVertical: 13, borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 9 },
  startButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  startButtonArrow: { color: "#FFFFFF", fontSize: 18, fontWeight: "800" },
  sourceText: { color: "#8994A9", fontSize: 10, lineHeight: 15, textAlign: "center", paddingHorizontal: 8 },
  quizHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  ghostButton: { paddingVertical: 8, paddingRight: 8 },
  ghostButtonText: { color: COLORS.muted, fontSize: 12, fontWeight: "800" },
  progressCount: { color: COLORS.ink, fontSize: 15, fontWeight: "900" },
  streakPill: { backgroundColor: COLORS.amberSoft, borderRadius: 999, paddingHorizontal: 11, paddingVertical: 7 },
  streakPillText: { color: COLORS.amber, fontSize: 11, fontWeight: "900" },
  progressTrack: { height: 6, borderRadius: 6, backgroundColor: COLORS.line, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 6, backgroundColor: COLORS.blue },
  questionMeta: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 2 },
  categoryBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  categoryBadgeText: { fontSize: 11, fontWeight: "900" },
  difficultyText: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  questionCard: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, borderRadius: 23, padding: 21, paddingTop: 26, marginTop: 2, shadowColor: COLORS.ink, shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 1 },
  noteLabel: { alignSelf: "flex-start", backgroundColor: COLORS.blueSoft, borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5, marginBottom: 16 },
  noteLabelText: { color: COLORS.blue, fontSize: 10, fontWeight: "900", letterSpacing: 0.4 },
  questionText: { color: COLORS.ink, fontSize: 23, fontWeight: "900", lineHeight: 34, letterSpacing: -0.3 },
  answerList: { gap: 10 },
  option: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 17, minHeight: 58, padding: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  optionCorrect: { backgroundColor: COLORS.greenSoft, borderWidth: 1.5, borderColor: "#70C4A9", borderRadius: 17, minHeight: 58, padding: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  optionWrong: { backgroundColor: COLORS.redSoft, borderWidth: 1.5, borderColor: "#E6A8B1", borderRadius: 17, minHeight: 58, padding: 10, flexDirection: "row", alignItems: "center", gap: 12 },
  optionDisabled: { backgroundColor: "#F4F5F8", borderWidth: 1.5, borderColor: "#EFF1F5", borderRadius: 17, minHeight: 58, padding: 10, flexDirection: "row", alignItems: "center", gap: 12, opacity: 0.55 },
  optionLetter: { width: 34, height: 34, borderRadius: 12, backgroundColor: COLORS.paper, alignItems: "center", justifyContent: "center" },
  optionLetterCorrect: { backgroundColor: COLORS.green },
  optionLetterWrong: { backgroundColor: COLORS.red },
  optionLetterText: { color: COLORS.muted, fontSize: 13, fontWeight: "900" },
  optionLetterTextActive: { color: "#FFFFFF" },
  optionText: { color: COLORS.ink, fontSize: 15, fontWeight: "800", flex: 1 },
  optionTextCorrect: { color: COLORS.green },
  optionTextWrong: { color: COLORS.red },
  inputArea: { gap: 10 },
  inputHint: { color: COLORS.muted, fontSize: 12, fontWeight: "700" },
  textInput: { backgroundColor: COLORS.card, borderWidth: 1.5, borderColor: COLORS.line, borderRadius: 17, paddingHorizontal: 16, paddingVertical: 17, color: COLORS.ink, fontSize: 17, fontWeight: "700" },
  primaryButton: { backgroundColor: COLORS.blue, minHeight: 54, borderRadius: 16, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  primaryButtonDisabled: { backgroundColor: "#BBC5E2" },
  primaryButtonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "900" },
  feedbackCard: { borderRadius: 21, padding: 16, gap: 14, marginTop: 2 },
  feedbackCorrect: { backgroundColor: COLORS.greenSoft, borderWidth: 1, borderColor: "#B7E5D2" },
  feedbackWrong: { backgroundColor: COLORS.redSoft, borderWidth: 1, borderColor: "#F1C8CE" },
  feedbackHeader: { flexDirection: "row", alignItems: "center", gap: 11 },
  feedbackIcon: { width: 38, height: 38, borderRadius: 13, alignItems: "center", justifyContent: "center" },
  feedbackIconCorrect: { backgroundColor: COLORS.green },
  feedbackIconWrong: { backgroundColor: COLORS.red },
  feedbackIconText: { color: "#FFFFFF", fontSize: 21, fontWeight: "900" },
  feedbackTitle: { fontSize: 16, fontWeight: "900" },
  feedbackSubtext: { color: COLORS.muted, fontSize: 11, marginTop: 3 },
  answerReveal: { borderTopWidth: 1, borderTopColor: "rgba(23,35,60,0.10)", paddingTop: 11, gap: 3 },
  answerRevealLabel: { color: COLORS.muted, fontSize: 10, fontWeight: "800" },
  answerRevealText: { color: COLORS.ink, fontSize: 19, fontWeight: "900" },
  explanationText: { color: COLORS.ink, fontSize: 13, lineHeight: 20 },
  rewardRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  rewardText: { color: COLORS.blue, backgroundColor: COLORS.blueSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "900" },
  rewardStreakText: { color: COLORS.amber, backgroundColor: COLORS.amberSoft, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11, fontWeight: "900" },
  quizActionBar: { minHeight: 74, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: COLORS.card, borderTopWidth: 1, borderTopColor: COLORS.line, flexDirection: "row", alignItems: "center", gap: 12, shadowColor: COLORS.ink, shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: -4 }, elevation: 5 },
  quizActionHint: { flex: 1, gap: 2 },
  quizActionHintTitle: { color: COLORS.ink, fontSize: 12, fontWeight: "900" },
  quizActionHintText: { color: COLORS.muted, fontSize: 10 },
  nextButtonFixed: { backgroundColor: COLORS.ink, borderRadius: 14, minHeight: 50, paddingHorizontal: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", minWidth: 142 },
  nextButtonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "900" },
  nextButtonArrow: { color: "#A8B9FF", fontSize: 22, fontWeight: "800" },
  summaryHero: { backgroundColor: COLORS.blueSoft, borderRadius: 24, borderWidth: 1, borderColor: "#CFD9FF", padding: 22, alignItems: "center", gap: 8, marginTop: 8 },
  summaryTitle: { color: COLORS.ink, fontSize: 30, fontWeight: "900" },
  summarySubtitle: { color: COLORS.muted, fontSize: 13, lineHeight: 19, textAlign: "center" },
  summaryScoreCircle: { width: 104, height: 104, borderRadius: 52, backgroundColor: COLORS.blue, alignItems: "center", justifyContent: "center", flexDirection: "row", marginTop: 8 },
  summaryScore: { color: "#FFFFFF", fontSize: 37, fontWeight: "900", letterSpacing: -1 },
  summaryScoreUnit: { color: "#C9D4FF", fontSize: 15, fontWeight: "900", marginTop: 17 },
  summaryScoreLabel: { color: COLORS.blue, fontSize: 13, fontWeight: "900" },
  summaryRankText: { color: COLORS.ink, fontSize: 13, fontWeight: "900", marginTop: 4 },
  summaryNote: { backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.line, borderRadius: 17, padding: 16, gap: 6 },
  summaryNoteTitle: { color: COLORS.ink, fontSize: 14, fontWeight: "900" },
  summaryNoteText: { color: COLORS.muted, fontSize: 12, lineHeight: 18 },
  rewardSummary: { backgroundColor: COLORS.amberSoft, borderWidth: 1, borderColor: "#F3D58D", borderRadius: 17, padding: 15, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  rewardSummaryLabel: { color: COLORS.amber, fontSize: 10, fontWeight: "900", letterSpacing: 0.7 },
  rewardSummaryTitle: { color: COLORS.ink, fontSize: 13, fontWeight: "900", marginTop: 4 },
  rewardSummaryValues: { alignItems: "flex-end", gap: 2 },
  rewardSummaryXp: { color: COLORS.blue, fontSize: 16, fontWeight: "900" },
  rewardSummaryPoints: { color: COLORS.amber, fontSize: 13, fontWeight: "900" },
  secondaryButton: { minHeight: 52, borderRadius: 16, borderWidth: 1.5, borderColor: COLORS.line, alignItems: "center", justifyContent: "center" },
  secondaryButtonText: { color: COLORS.ink, fontSize: 14, fontWeight: "900" },
});
