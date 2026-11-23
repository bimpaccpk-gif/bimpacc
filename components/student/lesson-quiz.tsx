"use client"

import { useState } from "react"
import { CheckCircle, XCircle, Award, RotateCcw, AlertCircle, FileQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export interface QuizQuestion {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  points: number
}

export interface QuizData {
  id: string
  title: string
  passing_score: number
  questions: QuizQuestion[]
}

export interface PreviousAttempt {
  score: number
  passed: boolean
}

export interface LessonQuizProps {
  quiz: QuizData | null
  previousAttempt: PreviousAttempt | null
  /** Scores on the server; resolves with the result (incl. correct answers) or an error. */
  onSubmit?: (
    answers: Record<string, string>
  ) => Promise<{ result: QuizSubmissionView | null; error: string }>
}

const optionLabels = ["a", "b", "c", "d"] as const

function getOptionText(question: QuizQuestion, opt: string): string {
  switch (opt) {
    case "a": return question.option_a
    case "b": return question.option_b
    case "c": return question.option_c
    case "d": return question.option_d
    default: return ""
  }
}

/** What the server returns after scoring a submission (correct answers are revealed here only). */
export interface QuizSubmissionView {
  score: number
  passed: boolean
  earnedPoints: number
  totalPoints: number
  /** question id -> correct option ("a".."d") */
  correctAnswers: Record<string, string>
}

export function LessonQuiz({ quiz, previousAttempt, onSubmit }: LessonQuizProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizSubmissionView | null>(null)
  const [retaking, setRetaking] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  function startRetake() {
    setAnswers({})
    setResult(null)
    setError("")
    setRetaking(true)
  }

  async function handleSubmit() {
    if (!onSubmit || !quiz || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const response = await onSubmit(answers)
      if (response.error || !response.result) {
        setError(response.error || "Could not submit your quiz. Please try again.")
        return
      }
      setResult(response.result)
    } catch {
      setError("Could not submit your quiz. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!quiz) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center gap-2 py-6 text-center">
            <FileQuestion className="h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">No quiz for this lesson</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // If a previous attempt exists and user hasn't started a retake yet, show it
  if (previousAttempt && !retaking && !result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{quiz.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-4 py-4">
            <div
              className={cn(
                "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
                previousAttempt.passed
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {previousAttempt.passed ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              {previousAttempt.passed ? "Passed" : "Not Passed"}
            </div>

            <p className="text-center text-sm text-muted-foreground">
              Your score: <span className="font-medium text-foreground">{previousAttempt.score}%</span>
              {` · Passing score: ${quiz.passing_score}%`}
            </p>

            <Button variant="outline" size="sm" onClick={startRetake}>
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Retake Quiz
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Results mode
  if (result) {
    const passed = result.passed

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{quiz.title} — Results</CardTitle>
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium",
                passed
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
              )}
            >
              {passed ? (
                <>
                  <CheckCircle className="h-3.5 w-3.5" />
                  Passed
                </>
              ) : (
                <>
                  <XCircle className="h-3.5 w-3.5" />
                  Not Passed
                </>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {/* Score summary */}
          <div className="flex flex-col items-center gap-2 rounded-lg border border-border/50 bg-muted/50 p-4">
            <div className="text-3xl font-bold">
              {result.score}%
            </div>
            <p className="text-sm text-muted-foreground">
              {result.earnedPoints}/{result.totalPoints} points
              {` · Passing: ${quiz.passing_score}%`}
            </p>
            {passed && (
              <div className="flex items-center gap-1.5 text-sm text-green-600 dark:text-green-400">
                <Award className="h-4 w-4" />
                Certificate eligible
              </div>
            )}
          </div>

          {/* Question-by-question breakdown */}
          {quiz.questions.map((q, i) => {
            const userAnswer = answers[q.id]
            const correctOption = result.correctAnswers[q.id]
            const isCorrect = userAnswer === correctOption

            return (
              <div key={q.id} className="rounded-lg border border-border/30 p-4">
                <div className="mb-2 flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
                  ) : (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {i + 1}. {q.question_text}
                    </p>

                    {/* Options */}
                    <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                      {optionLabels.map((opt) => {
                        const optionText = getOptionText(q, opt)
                        const isUserChoice = userAnswer === opt
                        const isCorrectOption = correctOption === opt

                        return (
                          <div
                            key={opt}
                            className={cn(
                              "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
                              isCorrectOption && isUserChoice && "border-green-400 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-300 dark:border-green-700",
                              isCorrectOption && !isUserChoice && "border-green-400 bg-green-50/50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
                              isUserChoice && !isCorrectOption && "border-red-300 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
                              !isCorrectOption && !isUserChoice && "border-border/30"
                            )}
                          >
                            <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs uppercase">
                              {opt}
                            </span>
                            <span className="flex-1 truncate">{optionText}</span>
                            {isCorrectOption && (
                              <CheckCircle className="h-3.5 w-3.5 shrink-0 text-green-600 dark:text-green-400" />
                            )}
                            {isUserChoice && !isCorrectOption && (
                              <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* Retake */}
          <Button
            variant="outline"
            size="sm"
            className="self-start"
            onClick={startRetake}
          >
            <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
            Retake Quiz
          </Button>
        </CardContent>
      </Card>
    )
  }

  // Quiz taking mode
  const allAnswered = quiz.questions.every((q) => answers[q.id] !== undefined)

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{quiz.title}</CardTitle>
          {previousAttempt && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <AlertCircle className="h-3.5 w-3.5" />
              Previous: {previousAttempt.score}%{" "}
              {previousAttempt.passed ? "(Passed)" : "(Not Passed)"}
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {quiz.questions.length} question{quiz.questions.length !== 1 ? "s" : ""} · Passing score: {quiz.passing_score}%
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {quiz.questions.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-border/30 p-4">
            <p className="mb-3 text-sm font-medium">
              {i + 1}. {q.question_text}
              {q.points > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  ({q.points} point{q.points !== 1 ? "s" : ""})
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {optionLabels.map((opt) => {
                const optionText = q[`option_${opt}` as keyof QuizQuestion] as string
                const selected = answers[q.id] === opt

                return (
                  <label
                    key={opt}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                      selected
                        ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/20"
                        : "border-border/30 hover:border-border hover:bg-muted/50"
                    )}
                  >
                    <input
                      type="radio"
                      name={`quiz-${quiz.id}-q-${q.id}`}
                      value={opt}
                      checked={selected}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      className="h-4 w-4 shrink-0 accent-primary"
                    />
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs uppercase">
                      {opt}
                    </span>
                    <span className="flex-1 truncate">{optionText}</span>
                  </label>
                )
              })}
            </div>
          </div>
        ))}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {Object.keys(answers).length}/{quiz.questions.length} answered
          </p>
          <Button size="sm" disabled={!allAnswered || submitting} onClick={handleSubmit}>
            {submitting ? "Submitting…" : "Submit Quiz"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
