import { beforeEach, describe, expect, it, vi } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────
// A tiny chainable stand-in for the Supabase query builder. Each table gets a programmed
// result; every call is recorded so tests can assert what was selected or inserted.

type Result = { data: unknown; error: { message: string } | null };

const state = {
  tables: {} as Record<string, Result>,
  selects: [] as { table: string; columns: string }[],
  inserts: [] as { table: string; rows: unknown }[],
};

function builder(table: string) {
  const result = () => state.tables[table] ?? { data: null, error: null };
  const chain: Record<string, unknown> = {
    select: (columns: string) => {
      state.selects.push({ table, columns });
      return chain;
    },
    insert: (rows: unknown) => {
      state.inserts.push({ table, rows });
      return chain;
    },
    eq: () => chain,
    order: () => chain,
    single: () => Promise.resolve(result()),
    // awaiting the chain itself (no .single()) resolves to the programmed result
    then: (resolve: (value: Result) => unknown) => Promise.resolve(result()).then(resolve),
  };
  return chain;
}

const canAccessLesson = vi.fn();
const rateLimit = vi.fn();

vi.mock("@/lib/dal", () => ({
  verifySession: async () => ({ userId: "user-1", email: "u@gmail.com", aal: "aal2" }),
  canAccessLesson: (...args: unknown[]) => canAccessLesson(...args),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: (...args: unknown[]) => rateLimit(...args) }));
vi.mock("@/lib/supabase/server", () => ({
  createAdminClient: () => ({ from: (table: string) => builder(table) }),
  createClient: async () => ({ from: (table: string) => builder(table) }),
}));

import { getQuizForLesson, submitQuiz } from "@/app/actions/quiz";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const QUIZ_ID = "11111111-1111-4111-8111-111111111111";
const Q1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const Q2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function programQuiz() {
  state.tables = {
    quizzes: { data: { id: QUIZ_ID, lesson_id: "lesson-1", title: "Quick check", passing_score: 70 }, error: null },
    quiz_questions: {
      data: [
        { id: Q1, correct_option: "b", points: 1 },
        { id: Q2, correct_option: "d", points: 3 },
      ],
      error: null,
    },
    quiz_attempts: { data: { id: "attempt-1", quiz_id: QUIZ_ID, user_id: "user-1", score: 0, passed: false }, error: null },
    quiz_answers: { data: null, error: null },
  };
}

beforeEach(() => {
  state.tables = {};
  state.selects = [];
  state.inserts = [];
  canAccessLesson.mockReset().mockResolvedValue(true);
  rateLimit.mockReset().mockResolvedValue({ allowed: true, remaining: 9 });
  programQuiz();
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("getQuizForLesson", () => {
  it("never selects the correct answer column", async () => {
    await getQuizForLesson("lesson-1");
    const questionSelects = state.selects.filter((s) => s.table === "quiz_questions");
    expect(questionSelects.length).toBeGreaterThan(0);
    for (const s of questionSelects) {
      expect(s.columns).not.toContain("correct_option");
      expect(s.columns).not.toBe("*");
    }
  });

  it("refuses users who cannot access the lesson", async () => {
    canAccessLesson.mockResolvedValue(false);
    const r = await getQuizForLesson("lesson-1");
    expect(r.data).toBeNull();
    expect(state.selects).toHaveLength(0);
  });
});

describe("submitQuiz", () => {
  it("scores on the server by points and reveals the correct answers", async () => {
    // Q1 correct (1 pt), Q2 wrong (3 pts) -> 1/4 = 25%
    const r = await submitQuiz(QUIZ_ID, [
      { question_id: Q1, selected_option: "b" },
      { question_id: Q2, selected_option: "a" },
    ]);
    expect(r.error).toBe("");
    expect(r.data).toMatchObject({
      score: 25,
      passed: false,
      earnedPoints: 1,
      totalPoints: 4,
      correctAnswers: { [Q1]: "b", [Q2]: "d" },
    });
  });

  it("passes at the passing score and records the attempt with the SERVER-computed score", async () => {
    const r = await submitQuiz(QUIZ_ID, [
      { question_id: Q1, selected_option: "b" },
      { question_id: Q2, selected_option: "d" },
    ]);
    expect(r.data?.passed).toBe(true);
    const attempt = state.inserts.find((i) => i.table === "quiz_attempts")?.rows as Record<string, unknown>;
    expect(attempt).toMatchObject({ quiz_id: QUIZ_ID, user_id: "user-1", score: 100, passed: true });
  });

  it("counts unanswered questions as wrong", async () => {
    const r = await submitQuiz(QUIZ_ID, [{ question_id: Q1, selected_option: "b" }]);
    expect(r.data?.score).toBe(25);
  });

  it("keeps only the first answer per question", async () => {
    const r = await submitQuiz(QUIZ_ID, [
      { question_id: Q1, selected_option: "a" },
      { question_id: Q1, selected_option: "b" },
    ]);
    expect(r.data?.earnedPoints).toBe(0);
  });

  it("rejects questions that do not belong to the quiz and malformed answers", async () => {
    const foreign = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    expect((await submitQuiz(QUIZ_ID, [{ question_id: foreign, selected_option: "a" }])).data).toBeNull();
    expect((await submitQuiz(QUIZ_ID, [{ question_id: Q1, selected_option: "e" }])).data).toBeNull();
    expect((await submitQuiz(QUIZ_ID, [{ question_id: "nope", selected_option: "a" }])).data).toBeNull();
    expect((await submitQuiz("not-a-uuid", [])).data).toBeNull();
    expect(state.inserts).toHaveLength(0);
  });

  it("does not trust a client-supplied score (the action has no such parameter)", async () => {
    expect(submitQuiz.length).toBe(2);
  });

  it("refuses students who are not enrolled, and writes nothing", async () => {
    canAccessLesson.mockResolvedValue(false);
    const r = await submitQuiz(QUIZ_ID, [{ question_id: Q1, selected_option: "b" }]);
    expect(r.data).toBeNull();
    expect(state.inserts).toHaveLength(0);
  });

  it("is rate limited", async () => {
    rateLimit.mockResolvedValue({ allowed: false, remaining: 0, retryAfterMs: 120000 });
    const r = await submitQuiz(QUIZ_ID, [{ question_id: Q1, selected_option: "b" }]);
    expect(r.data).toBeNull();
    expect(r.error).toMatch(/Too many attempts/);
    expect(state.inserts).toHaveLength(0);
  });
});
