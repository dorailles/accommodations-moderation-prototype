// New Quizzes builder content, mapped from the real "Introduction to Biology — Quiz 1"
// in Canvas (course 479163, assignment 718792). 4 questions, 20 points.

export type QuestionType =
  | 'Multiple Choice'
  | 'True or False'
  | 'Fill in the Blank'
  | 'Essay'
  | 'Categorization'
  | 'File Upload'
  | 'Formula'
  | 'Hot Spot'
  | 'Matching'
  | 'Multiple Answer'
  | 'Numeric'
  | 'Ordering'
  | 'Stimulus'
  | 'Text Block'

export type Question = {
  id: string
  type: QuestionType
  points: number
  prompt: string
  choices?: string[]
  correct?: number // index into choices, or 0/1 for true/false
  blank?: string // answer token for Fill in the Blank
  // Set when the item came from a question bank (shows a bank icon in the builder).
  fromBank?: string
  // Set when the item represents a whole bank pulled in (all of it, or a random N)
  // and stays grouped rather than expanding into individual questions.
  bankGroup?: { bankName: string; count: number; random: boolean; pointsPerQuestion: number }
}

// The 14 item types shown in the "Insert Content" picker, in the builder's two-column order.
export const ITEM_TYPES: { left: QuestionType; right: QuestionType }[] = [
  { left: 'Categorization', right: 'Essay' },
  { left: 'File Upload', right: 'Fill in the Blank' },
  { left: 'Formula', right: 'Hot Spot' },
  { left: 'Matching', right: 'Multiple Answer' },
  { left: 'Multiple Choice', right: 'Numeric' },
  { left: 'Ordering', right: 'True or False' },
  { left: 'Stimulus', right: 'Text Block' },
]

// Default points per type when a new item is inserted.
export const DEFAULT_POINTS: Record<QuestionType, number> = {
  'Multiple Choice': 1,
  'True or False': 1,
  'Fill in the Blank': 1,
  Essay: 1,
  Categorization: 1,
  'File Upload': 1,
  Formula: 1,
  'Hot Spot': 1,
  Matching: 1,
  'Multiple Answer': 1,
  Numeric: 1,
  Ordering: 1,
  Stimulus: 0,
  'Text Block': 0,
}

export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 'q1',
    type: 'Multiple Choice',
    points: 5,
    prompt: 'Which organelle is known as the powerhouse of the cell?',
    choices: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus'],
    correct: 2,
  },
  {
    id: 'q2',
    type: 'True or False',
    points: 3,
    prompt: 'DNA is made up of four nucleotide bases.',
    choices: ['True', 'False'],
    correct: 0,
  },
  {
    id: 'q3',
    type: 'Fill in the Blank',
    points: 4,
    prompt: 'The process by which plants convert sunlight into energy is called',
    blank: 'Photosynthesis',
  },
  {
    id: 'q4',
    type: 'Essay',
    points: 8,
    prompt: 'In your own words, describe what happens during mitosis. Include at least two key stages.',
  },
]

// Settings toggles, in the order the real Settings tab lists them.
export const SETTINGS: string[] = [
  'Shuffle questions',
  'Shuffle answers',
  'One question at a time',
  'Require a student access code',
  'Time limit',
  'Detect Multiple Sessions',
  'Filter IP addresses',
  'Allow Calculator',
  'Allow clearing selection (Multiple Choice)',
  'Show custom feedback with results',
  'Editor default font',
  'Disable Document Uploads',
  'Allow multiple attempts',
  'Hide results from students',
]

// ── Moderation model ──
// Each row is one student's attempt state on this quiz, plus any moderation
// overrides a teacher has applied. The quiz allows 1 attempt by default
// (baseAttempts); extraAttempts and extraTimeMin are the teacher's overrides.
export type AttemptStatus = 'Not started' | 'In progress' | 'Paused' | 'Submitted' | 'Locked'

export type ModStudent = {
  id: string
  name: string
  initials: string
  status: AttemptStatus
  attemptsUsed: number
  baseAttempts: number
  extraAttempts: number
  score: string // '—' until graded
  time: string // time spent on the current/last attempt, '—' if not started
  extraTimeMin: number // accommodation: extra minutes per attempt (0 = none)
  unlimitedTime?: boolean // accommodation: no time limit on this quiz
  reducedChoices?: boolean // accommodation: reduced answer choices
  log: boolean
}

// The quiz default for every student. Shown in the moderate header so a teacher
// knows what an override is relative to.
export const BASE_ATTEMPTS = 1
export const BASE_TIME_LIMIT_MIN = 60

export const MOD_STUDENTS: ModStudent[] = [
  { id: 's1', name: 'Robert Horvath', initials: 'RH', status: 'Not started', attemptsUsed: 0, baseAttempts: 1, extraAttempts: 0, score: '—', time: '—', extraTimeMin: 120, log: false },
  { id: 's2', name: 'Andras Student', initials: 'AS', status: 'Submitted', attemptsUsed: 2, baseAttempts: 1, extraAttempts: 1, score: '20%', time: '00:40', extraTimeMin: 0, log: true },
  { id: 's3', name: 'Balazs Student', initials: 'BS', status: 'In progress', attemptsUsed: 1, baseAttempts: 1, extraAttempts: 0, score: '—', time: '00:15', extraTimeMin: 0, log: true },
  { id: 's4', name: 'Cason Student', initials: 'CS', status: 'Not started', attemptsUsed: 0, baseAttempts: 1, extraAttempts: 0, score: '—', time: '—', extraTimeMin: 120, log: false },
  { id: 's5', name: 'Dmitry Student', initials: 'DS', status: 'Locked', attemptsUsed: 1, baseAttempts: 1, extraAttempts: 0, score: '—', time: '00:22', extraTimeMin: 30, log: true },
  { id: 's6', name: 'Gergely Student', initials: 'GS', status: 'Submitted', attemptsUsed: 3, baseAttempts: 1, extraAttempts: 2, score: '88%', time: '00:31', extraTimeMin: 60, log: true },
  { id: 's7', name: 'Karoly Student', initials: 'KS', status: 'Not started', attemptsUsed: 0, baseAttempts: 1, extraAttempts: 0, score: '—', time: '—', extraTimeMin: 0, log: false },
  { id: 's8', name: 'Marton Student', initials: 'MS', status: 'Not started', attemptsUsed: 0, baseAttempts: 1, extraAttempts: 0, score: '—', time: '—', extraTimeMin: 0, log: false },
]

// Format extra-time minutes the way Canvas shows accommodations: "+2 hr 0 min".
export function formatExtraTime(min: number): string {
  if (min <= 0) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `+${m} min`
  return `+${h} hr ${m} min`
}

export type ReportCard = {
  title: string
  action: 'Export CSV' | 'View Report'
  link: string
}

export const REPORTS: ReportCard[] = [
  { title: 'Quiz and Item Analysis', action: 'Export CSV', link: 'Generate Report' },
  { title: 'Outcomes Analysis', action: 'View Report', link: '' },
  { title: 'Student Analysis', action: 'Export CSV', link: 'Generate Report' },
]

export const INITIAL_EXPORTS: string[] = [
  'Quiz Export from May 28, 2026 12:51:11 PM',
  'Quiz Export from May 18, 2026 2:59:06 PM',
]

// ── Quizzes index ──
// The course-level list of quizzes, the first screen before entering the builder.
// 'biology-1' is the canonical quiz mapped in INITIAL_QUESTIONS; the rest are
// realistic siblings in the same Biology course.
export type QuizGroup = 'Assignment quizzes'

export type QuizListItem = {
  id: string
  title: string
  group: QuizGroup
  due: string
  points: number
  questions: number
  published: boolean
}

export const QUIZ_INDEX: QuizListItem[] = [
  { id: 'biology-1', title: 'Introduction to Biology — Quiz 1', group: 'Assignment quizzes', due: 'Mar 17', points: 20, questions: 4, published: true },
  { id: 'cell-structure', title: 'Cell Structure and Function', group: 'Assignment quizzes', due: 'Mar 24', points: 30, questions: 12, published: true },
  { id: 'genetics', title: 'Genetics and Heredity', group: 'Assignment quizzes', due: 'Apr 7', points: 25, questions: 10, published: false },
  { id: 'midterm', title: 'Midterm Exam', group: 'Assignment quizzes', due: 'Apr 21', points: 100, questions: 40, published: false },
]

export const QUIZ_GROUPS: QuizGroup[] = ['Assignment quizzes']

// Course-level (second-layer) navigation shown on the quizzes index, in Canvas order.
export const COURSE_NAV: string[] = [
  'Home',
  'Announcements',
  'Assignments',
  'Discussions',
  'Grades',
  'People',
  'Pages',
  'Syllabus',
  'Outcomes',
  'Quizzes',
  'Modules',
  'Conferences',
  'Collaborations',
  'Settings',
]

export const ACTIVE_COURSE_NAV = 'Quizzes'
