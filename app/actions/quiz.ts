"use server";

import { verifySession } from "@/lib/dal";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number;
  created_at: string;
  updated_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string;
  points: number;
  order_index: number;
}

export interface QuizWithQuestions {
  id: string;
  title: string;
  passing_score: number;
  questions: QuizQuestion[];
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

/**
 * Get a quiz with its questions for a lesson.
 */
export async function getQuizForLesson(
  lessonId: string
): Promise<{ data: QuizWithQuestions | null; error: string }> {
  await verifySession();

  const admin = createAdminClient();

  // Get quiz for this lesson
  const { data: quiz, error: quizError } = await admin
    .from("quizzes")
    .select("*")
    .eq("lesson_id", lessonId)
    .single();

  if (quizError || !quiz) {
    return { data: null, error: quizError?.message ?? "" };
  }

  // Get questions
  const { data: questions, error: questionsError } = await admin
    .from("quiz_questions")
    .select("*")
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
      questions: (questions ?? []) as unknown as QuizQuestion[],
    },
    error: "",
  };
}

/**
 * Submit a quiz attempt.
 */
export async function submitQuiz(
  quizId: string,
  answers: QuizAnswer[]
): Promise<{ data: QuizAttempt | null; error: string }> {
  const session = await verifySession();
  const admin = createAdminClient();

  // Get quiz with correct answers
  const { data: quiz } = await admin
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .single();

  if (!quiz) {
    return { data: null, error: "Quiz not found." };
  }

  const { data: questions } = await admin
    .from("quiz_questions")
    .select("*")
    .eq("quiz_id", quizId);

  if (!questions || questions.length === 0) {
    return { data: null, error: "No questions found for this quiz." };
  }

  // Calculate score
  const correctQuestions = questions as unknown as QuizQuestion[];
  let earnedPoints = 0;
  const totalPoints = correctQuestions.reduce((sum, q) => sum + q.points, 0);

  for (const q of correctQuestions) {
    const userAnswer = answers.find((a) => a.question_id === q.id);
    if (userAnswer && userAnswer.selected_option === q.correct_option) {
      earnedPoints += q.points;
    }
  }

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passed = score >= quiz.passing_score;

  // Save attempt
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quiz_attempts")
    .insert({
      quiz_id: quizId,
      user_id: session.userId,
      score,
      passed,
    } as never)
    .select("*")
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  // Save individual answers
  const answerRows = answers.map((a) => ({
    attempt_id: (data as { id: string }).id,
    question_id: a.question_id,
    selected_option: a.selected_option,
  }));

  await supabase.from("quiz_answers").insert(answerRows as never);

  return {
    data: data as unknown as QuizAttempt,
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
