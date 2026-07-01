// One-shot handoff from the Question banks prototype into the quiz builder.
// Question banks sets the payload, then navigates to /quiz-builder; the builder
// reads it once on mount and seeds itself. Module-level state is fine for a
// prototype — there's no router state to thread.

// An item handed to the builder is either a single question pulled from a bank,
// or a whole bank pulled in (all of it, or a random N) that stays grouped.
export type HandoffItem =
  | { kind: 'question'; typeLabel: string; prompt: string; fromBank?: string }
  | { kind: 'bank'; bankName: string; count: number; random: boolean; pointsPerQuestion?: number }

export type QuizHandoff = {
  mode: 'new' | 'existing'
  quizTitle: string
  items: HandoffItem[]
}

let pending: QuizHandoff | null = null

export const setQuizHandoff = (h: QuizHandoff) => {
  pending = h
}

// Returns the pending handoff once, then clears it so a refresh doesn't re-apply it.
export const takeQuizHandoff = (): QuizHandoff | null => {
  const p = pending
  pending = null
  return p
}
