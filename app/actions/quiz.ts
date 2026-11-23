"use server";

import { verifySession, canAccessLesson } from "@/lib/dal";
import { rateLimit } from "@/lib/rate-limit";
import { createClient, createAdminClient } from "@/lib/supabase/server";

/**
 * Quiz integrity model:
 *  - Correct answers NEVER leave the server before a submission. The questions sent to the
 *    browser have no `correct_option`, and the database revokes column SELECT on it for
 *    signed-in users (see migration 20261123120000_protect_quiz_integrity.sql), so a student
 *    cannot read it through the public API either.
 *  - Scoring happens here, and attempts/answers are written with the service role after
 *    scoring. Students have no INSERT policy on quiz_attempts, so a passing attempt (which
 *    feeds certificate issuance) cannot be forged from the browser.
 *  - The correct options are returned only in the response to a submission.
 */

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number;
  created_at: string;
  updated_at: string;
}

/** A question as sent to the browser: no correct answer. */
export interface PublicQuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  points: number;
  order_index: number;
}

export interface QuizWithQuestions {
  id: string;
  title: string;
  passing_score: number;
  questions: PublicQuizQuestion[];
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  user_id: string;
  score: number;
  passed: boolean;
  created_at: string;
}

export interface QuizAnswer {
  question_id: string;
  selected_option: string;
}

/** Result of a submission, including the answers revealed after scoring. */
export interface QuizSubmissionResult {
  attempt: QuizAttempt;
  score: number;
  passed: boolean;
  earnedPoints: number;
  totalPoints: number;
  /** question id -> correct option ("a".."d"); revealed only after submitting. */
  correctAnswers: Record<string, string>;
}

const OPTIONS = ["a", "b", "c", "d"] as const;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ANSWERS = 200;

const PUBLIC_QUESTION_COLUMNS =
  "id, quiz_id, question_text, option_a, option_b, option_c, option_d, points, order_index";

/**
 * Get a quiz with its questions for a lesson (without the correct answers).
 */
export async function getQuizForLesson(
  lessonId: string
): Promise<{ data: QuizWithQuestions | null; error: string }> {
  const session = await verifySession();

  // Service-role reads: students must be enrolled in the lesson's course.
  if (!(await canAccessLesson(session.userId, lessonId))) {
    return { data: null, error: "You are not enrolled in this course." };
  }

  const admin = createAdminClient();

  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select("id, title, passing_score")
    .eq("lesson_id", lessonId)
    .single();

  if (quizError || !quiz) {
    return { data: null, error: quizError?.message ?? "" };
  }

  // Explicit column list: never `select("*")`, which would include correct_option.
  const { data: questions, error: questionsError } = await admin
    .from("quiz_questions")
    .select(PUBLIC_QUESTION_COLUMNS)
    .eq("quiz_id", quiz.id)
    .order("order_index", { ascending: true });

  if (questionsError) {
    return { data: null, error: questionsError.message };
  }

  return {
    data: {
      id: quiz.id,
      title: quiz.title,
      passing_score: quiz.passing_score,
      questions: (questions ?? []) as unknown as PublicQuizQuestion[],
    },
    error: "",
  };
}

/**
 * Submit a quiz attempt. Scores on the server and returns the correct answers.
 */
export async function submitQuiz(
  quizId: string,
  answers: QuizAnswer[]
): Promise<{ data: QuizSubmissionResult | null; error: string }> {
  const session = await verifySession();

  if (typeof quizId !== "string" || !UUID_RE.test(quizId)) {
    return { data: null, error: "Quiz not found." };
  }
  if (!Array.isArray(answers) || answers.length > MAX_ANSWERS) {
    return { data: null, error: "Invalid answers." };
  }

  // Each answer must be well-formed; keep only the first answer per question.
  const chosen = new Map<string, string>();
  for (const answer of answers) {
    if (
      !answer ||
      typeof answer.question_id !== "string" ||
      !UUID_RE.test(answer.question_id) ||
      !(OPTIONS as readonly string[]).includes(answer.selected_option)
    ) {
      return { data: null, error: "Invalid answers." };
    }
    if (!chosen.has(answer.question_id)) chosen.set(answer.question_id, answer.selected_option);
  }

  // Limit rapid-fire attempts (a retake reveals the answers, so unlimited tries are guessable).
  const limit = await rateLimit(`quiz:${session.userId}:${quizId}`, 10, 10 * 60 * 1000);
  if (!limit.allowed) {
    const mins = Math.max(1, Math.ceil((limit.retryAfterMs ?? 60_000) / 60000));
    return { data: null, error: `Too many attempts. Try again in ${mins} minute(s).` };
  }

  const admin = createAdminClient();

  const { data: quiz } = await admin
    .from("quizzes")
    .select("id, lesson_id, passing_score")
    .eq("id", quizId)
    .single();

  if (!quiz) {
    return { data: null, error: "Quiz not found." };
  }

  if (!(await canAccessLesson(session.userId, quiz.lesson_id as string))) {
    return { data: null, error: "You are not enrolled in this course." };
  }

  const { data: questions } = await admin
    .from("quiz_questions")
    .select("id, correct_option, points")
    .eq("quiz_id", quizId);

  if (!questions || questions.length === 0) {
    return { data: null, error: "No questions found for this quiz." };
  }

  const rows = questions as { id: string; correct_option: string; points: number }[];
  const validIds = new Set(rows.map((q) => q.id));
  for (const questionId of chosen.keys()) {
    if (!validIds.has(questionId)) {
      return { data: null, error: "Invalid answers." };
    }
  }

  // Score
  let earnedPoints = 0;
  let totalPoints = 0;
  const correctAnswers: Record<string, string> = {};
  for (const q of rows) {
    totalPoints += q.points;
    correctAnswers[q.id] = q.correct_option;
    if (chosen.get(q.id) === q.correct_option) earnedPoints += q.points;
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = score >= (quiz.passing_score as number);

  // Write with the service role: students cannot insert attempts themselves.
  const { data: attempt, error: attemptError } = await admin
    .from("quiz_attempts")
    .insert({ quiz_id: quizId, user_id: session.userId, score, passed } as never)
    .select("*")
    .single();

  if (attemptError || !attempt) {
    return { data: null, error: attemptError?.message ?? "Could not save your attempt." };
  }

  const answerRows = [...chosen.entries()].map(([question_id, selected_option]) => ({
    attempt_id: (attempt as { id: string }).id,
    question_id,
    selected_option,
  }));
  if (answerRows.length > 0) {
    await admin.from("quiz_answers").insert(answerRows as never);
  }

  return {
    data: {
      attempt: attempt as unknown as QuizAttempt,
      score,
      passed,
      earnedPoints,
      totalPoints,
      correctAnswers,
    },
    error: "",
  };
}

/**
 * Get the best (highest score) quiz attempt for the current user.
 */
export async function getBestQuizAttempt(
  quizId: string
): Promise<{ data: QuizAttempt | null; error: string }> {
  const session = await verifySession();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("quiz_attempts")
    .select("*")
    .eq("quiz_id", quizId)
    .eq("user_id", session.userId)
    .order("score", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as unknown as QuizAttempt, error: "" };
}
