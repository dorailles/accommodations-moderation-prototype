import { useState, useMemo } from 'react'
import { useComputedTheme } from '@instructure/emotion'
import { View } from '@instructure/ui-view/latest'
import { Flex } from '@instructure/ui-flex/latest'
import { Heading } from '@instructure/ui-heading/latest'
import { Text } from '@instructure/ui-text/latest'
import { Link } from '@instructure/ui-link/latest'
import { Button, IconButton, CloseButton } from '@instructure/ui-buttons/latest'
import { Avatar } from '@instructure/ui-avatar/latest'
import { Pill } from '@instructure/ui-pill/latest'
import { Checkbox } from '@instructure/ui-checkbox/latest'
import { Alert } from '@instructure/ui-alerts/latest'
import { Table } from '@instructure/ui-table/latest'
import { SimpleSelect } from '@instructure/ui-simple-select/latest'
import { NumberInput } from '@instructure/ui-number-input/latest'
import { Modal } from '@instructure/ui-modal/latest'
import { Tray } from '@instructure/ui-tray/latest'
import { Tabs } from '@instructure/ui-tabs/latest'
import { SideNavBar } from '@instructure/ui-side-nav-bar/latest'
import { ScreenReaderContent } from '@instructure/ui-a11y-content'
import {
  SettingsInstUIIcon,
  LayoutDashboardInstUIIcon,
  BookOpenInstUIIcon,
  CalendarDaysInstUIIcon,
  InboxInstUIIcon,
  ClockInstUIIcon,
  CircleHelpInstUIIcon,
  InfoInstUIIcon,
  SunInstUIIcon,
  MoonInstUIIcon,
  RocketInstUIIcon,
  FolderInstUIIcon,
  TargetInstUIIcon,
  ChartColumnInstUIIcon,
  ClipboardListInstUIIcon,
  ClipboardCheckInstUIIcon,
  PanelLeftInstUIIcon,
  SquarePenInstUIIcon,
  NewspaperInstUIIcon,
  AlignJustifyInstUIIcon,
  PencilInstUIIcon,
  CopyInstUIIcon,
  GripVerticalInstUIIcon,
  Trash2InstUIIcon,
  PlusInstUIIcon,
  SparklesInstUIIcon,
  PaperclipInstUIIcon,
  GaugeInstUIIcon,
  CircleCheckInstUIIcon,
  CircleSlashInstUIIcon,
  EllipsisVerticalInstUIIcon,
  IconCanvasLogoSolid,
} from '@instructure/ui-icons'
import { Breadcrumb } from '@instructure/ui-breadcrumb/latest'
import type { PrototypeProps } from '../../registry'
import {
  ITEM_TYPES,
  DEFAULT_POINTS,
  INITIAL_QUESTIONS,
  SETTINGS,
  MOD_STUDENTS,
  BASE_ATTEMPTS,
  BASE_TIME_LIMIT_MIN,
  formatExtraTime,
  REPORTS,
  QUIZ_INDEX,
  QUIZ_GROUPS,
} from './model'
import type { Question, QuestionType, QuizListItem, ModStudent } from './model'
import { takeQuizHandoff } from './handoff'
import type { HandoffItem } from './handoff'

const TABS = ['Build', 'Schedule', 'Moderate', 'Reports']
const QUIZ_TITLE = 'Introduction to Biology — Quiz 1'

let seq = 100
function newId() {
  seq += 1
  return `q${seq}`
}

// Map a Question banks type label onto a builder QuestionType.
const TYPE_MAP: Record<string, QuestionType> = {
  'Multiple choice': 'Multiple Choice',
  'Multiple answer': 'Multiple Answer',
  'True/False': 'True or False',
  Essay: 'Essay',
  'Fill in the blank': 'Fill in the Blank',
  Matching: 'Matching',
  Numeric: 'Numeric',
  Categorization: 'Categorization',
  Ordering: 'Ordering',
}

// Turn a handed-off item into a builder question. A whole bank stays as one grouped
// item; a single question becomes a normal question marked as bank-sourced.
function fromHandoff(it: HandoffItem): Question {
  if (it.kind === 'bank') {
    const pts = it.pointsPerQuestion ?? 1
    return {
      id: newId(),
      type: 'Multiple Choice',
      points: pts * it.count,
      prompt: '',
      bankGroup: { bankName: it.bankName, count: it.count, random: it.random, pointsPerQuestion: pts },
    }
  }
  const type = TYPE_MAP[it.typeLabel] ?? 'Multiple Choice'
  return {
    id: newId(),
    type,
    points: DEFAULT_POINTS[type],
    prompt: it.prompt,
    fromBank: it.fromBank,
    ...(type === 'Multiple Choice' ? { choices: ['Choice A', 'Choice B', 'Choice C', 'Choice D'], correct: 0 } : {}),
    ...(type === 'True or False' ? { choices: ['True', 'False'], correct: 0 } : {}),
    ...(type === 'Fill in the Blank' ? { blank: 'answer' } : {}),
  }
}

export default function QuizBuilder({ isDark, onToggleTheme }: PrototypeProps) {
  const { sharedTokens } = useComputedTheme()

  // Read a one-shot handoff from Question banks (if the user arrived via Add/Create quiz).
  const handoff = useMemo(() => takeQuizHandoff(), [])
  // Total questions represented by the handoff (a bank group counts as its N questions).
  const addedFromBanks = handoff?.items.reduce((s, it) => s + (it.kind === 'bank' ? it.count : 1), 0) ?? 0

  // The prototype starts on the quizzes index. From there a teacher can open a
  // quiz (→ builder, Moderate tab) or jump to course-wide Quiz accommodations.
  const [screen, setScreen] = useState<'index' | 'builder' | 'result' | 'course-accom'>('index')
  const [tab, setTab] = useState(2)
  // The attempt result page a teacher drilled into, plus where to return to.
  const [result, setResult] = useState<{ studentId: string; attempt: number } | null>(null)
  const [resultReturn, setResultReturn] = useState<'builder' | 'course-accom'>('builder')
  const [questions, setQuestions] = useState<Question[]>(() => {
    if (!handoff) return INITIAL_QUESTIONS
    const added = handoff.items.map(fromHandoff)
    // A new quiz starts with just the added questions; an existing quiz keeps its own.
    return handoff.mode === 'new' ? added : [...INITIAL_QUESTIONS, ...added]
  })
  const [quizTitle, setQuizTitle] = useState(handoff ? handoff.quizTitle : QUIZ_TITLE)
  const [pickerAt, setPickerAt] = useState<number | null>(null)
  const [settings, setSettings] = useState<Record<string, boolean>>({})

  // ── Moderation state ──
  // mods holds the live, editable copy of every student's attempt state; the
  // table renders from it in the original MOD_STUDENTS order.
  const [mods, setMods] = useState<Record<string, ModStudent>>(() =>
    Object.fromEntries(MOD_STUDENTS.map((s) => [s.id, s])),
  )
  const [statusFilter, setStatusFilter] = useState('all')
  const [moderateId, setModerateId] = useState<string | null>(null)
  // Accommodation tray draft state. `accomScope` tracks whether the tray was
  // opened from a single quiz (Moderate tab) or the course-wide Quiz
  // accommodations page, which changes the tray copy.
  const [accomScope, setAccomScope] = useState<'quiz' | 'course'>('quiz')
  const [trayTab, setTrayTab] = useState(0)
  const [draftAttempts, setDraftAttempts] = useState(0)
  const [draftTimeMode, setDraftTimeMode] = useState<'add' | 'none' | 'unlimited'>('none')
  const [draftHours, setDraftHours] = useState(0)
  const [draftMinutes, setDraftMinutes] = useState(0)
  const [draftReduced, setDraftReduced] = useState(false)
  const [logRef, setLogRef] = useState<{ studentId: string; attempt: number } | null>(null)

  const modRows = MOD_STUDENTS.map((s) => mods[s.id])
  const visibleRows = modRows.filter((s) => {
    return (
      statusFilter === 'all' ||
      (statusFilter === 'submitted' && s.status === 'Submitted') ||
      (statusFilter === 'in-progress' && s.status === 'In progress') ||
      (statusFilter === 'not-started' && s.status === 'Not started') ||
      (statusFilter === 'locked' && s.status === 'Locked')
    )
  })
  const current = moderateId ? mods[moderateId] : null

  function patchStudent(id: string, patch: Partial<ModStudent>) {
    setMods((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
  }

  function openModerate(id: string, scope: 'quiz' | 'course' = 'quiz') {
    const s = mods[id]
    setAccomScope(scope)
    setModerateId(id)
    setTrayTab(0)
    setDraftAttempts(s.extraAttempts)
    setDraftReduced(!!s.reducedChoices)
    setDraftTimeMode(s.unlimitedTime ? 'unlimited' : s.extraTimeMin > 0 ? 'add' : 'none')
    setDraftHours(Math.floor(s.extraTimeMin / 60))
    setDraftMinutes(s.extraTimeMin % 60)
  }

  function saveModerate() {
    if (!moderateId) return
    const extraTimeMin = draftTimeMode === 'add' ? draftHours * 60 + draftMinutes : 0
    patchStudent(moderateId, {
      extraAttempts: draftAttempts,
      extraTimeMin,
      unlimitedTime: draftTimeMode === 'unlimited',
      reducedChoices: draftReduced,
    })
    setModerateId(null)
  }

  // Additional minutes the draft is granting (0 unless in "add" mode).
  const draftExtraMin = draftTimeMode === 'add' ? draftHours * 60 + draftMinutes : 0
  // "Xh Ym" duration label used in the tray summary rows.
  const fmtDuration = (min: number) => `${Math.floor(min / 60)}h ${min % 60} min`

  function openResult(studentId: string, attempt: number) {
    setResultReturn(screen === 'course-accom' ? 'course-accom' : 'builder')
    setResult({ studentId, attempt })
    setScreen('result')
  }

  function backFromResult() {
    setResult(null)
    setScreen(resultReturn)
    if (resultReturn === 'builder') setTab(2)
  }

  const logStudent = logRef ? mods[logRef.studentId] : null

  // A plausible activity timeline for one of a student's attempts, most recent
  // first. The latest attempt reflects the row's current status; earlier
  // attempts are treated as completed submissions.
  function buildLog(s: ModStudent, attempt: number): { time: string; label: string }[] {
    const isLatest = attempt === s.attemptsUsed
    const entries: { time: string; label: string }[] = []
    if (isLatest && s.status === 'Paused') {
      entries.push({ time: 'Mar 17, 10:18 AM', label: 'Attempt paused by teacher' })
      entries.push({ time: 'Mar 17, 10:00 AM', label: `Started attempt ${attempt}` })
    } else if (isLatest && s.status === 'In progress') {
      entries.push({ time: 'Mar 17, 10:15 AM', label: 'Answered question 2' })
      entries.push({ time: 'Mar 17, 10:00 AM', label: `Started attempt ${attempt}` })
    } else if (isLatest && s.status === 'Locked') {
      entries.push({ time: 'Mar 17, 10:22 AM', label: 'Attempt locked — multiple sessions detected' })
      entries.push({ time: 'Mar 17, 10:00 AM', label: `Started attempt ${attempt}` })
    } else {
      entries.push({ time: 'Mar 17, 10:41 AM', label: `Submitted attempt ${attempt}${isLatest && s.score !== '—' ? ` — scored ${s.score}` : ''}` })
      entries.push({ time: 'Mar 17, 10:01 AM', label: 'Answered all questions' })
      entries.push({ time: 'Mar 17, 10:00 AM', label: `Started attempt ${attempt}` })
    }
    return entries
  }

  const card = {
    background: 'primary' as const,
    themeOverride: { backgroundPrimary: sharedTokens.background.containerColor },
    borderRadius: sharedTokens.borderRadius.card.lg,
    shadow: 'resting' as const,
  }

  function insertQuestion(type: QuestionType, at: number) {
    const q: Question = {
      id: newId(),
      type,
      points: DEFAULT_POINTS[type],
      prompt:
        type === 'Multiple Choice'
          ? 'Untitled multiple choice question'
          : type === 'True or False'
            ? 'Untitled true/false statement'
            : type === 'Fill in the Blank'
              ? 'Untitled fill in the blank'
              : `Untitled ${type.toLowerCase()} question`,
      ...(type === 'Multiple Choice'
        ? { choices: ['Choice A', 'Choice B', 'Choice C', 'Choice D'], correct: 0 }
        : {}),
      ...(type === 'True or False' ? { choices: ['True', 'False'], correct: 0 } : {}),
      ...(type === 'Fill in the Blank' ? { blank: 'answer' } : {}),
    }
    setQuestions((prev) => {
      const next = [...prev]
      next.splice(at, 0, q)
      return next
    })
    setPickerAt(null)
  }

  function duplicateQuestion(id: string) {
    setQuestions((prev) => {
      const i = prev.findIndex((q) => q.id === id)
      if (i < 0) return prev
      const copy = { ...prev[i], id: newId() }
      const next = [...prev]
      next.splice(i + 1, 0, copy)
      return next
    })
  }

  function deleteQuestion(id: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  // ── Index ↔ builder navigation ──
  function openQuiz(item: QuizListItem) {
    setQuizTitle(item.title)
    // The canonical quiz carries real content; siblings open empty for prototyping.
    setQuestions(item.id === 'biology-1' ? INITIAL_QUESTIONS : [])
    setTab(0)
    setPickerAt(null)
    setScreen('builder')
  }

  function createQuiz() {
    setQuizTitle('Untitled Quiz')
    setQuestions([])
    setTab(0)
    setPickerAt(null)
    setScreen('builder')
  }

  /* ── Shared bits ── */
  function numberBadge(label: React.ReactNode) {
    return (
      <View
        as="div"
        display="inline-block"
        background="brand"
        themeOverride={{ backgroundBrand: sharedTokens.background.brandColor }}
        borderRadius={sharedTokens.borderRadius.card.md}
        padding="xxx-small x-small"
      >
        <Text color="primary-inverse" weight="bold">{label}</Text>
      </View>
    )
  }

  const radioDot = (filled: boolean) =>
    filled ? (
      <View
        as="div"
        display="inline-block"
        width="0.9rem"
        height="0.9rem"
        borderRadius="circle"
        background="brand"
        themeOverride={{ backgroundBrand: sharedTokens.background.brandColor }}
      />
    ) : (
      <View
        as="div"
        display="inline-block"
        width="0.9rem"
        height="0.9rem"
        borderRadius="circle"
        borderWidth="small"
      />
    )

  /* ── Question body, rendered per type ── */
  function questionBody(q: Question) {
    if (q.type === 'Multiple Choice' || q.type === 'True or False') {
      return (
        <Flex direction="column" gap="x-small">
          <Text as="p">{q.prompt}</Text>
          <Flex direction="column" gap="x-small" margin="x-small 0 0 0">
            {(q.choices ?? []).map((c, i) => (
              <Flex key={c} gap="x-small" alignItems="center">
                {radioDot(q.correct === i)}
                <Text weight={q.correct === i ? 'bold' : 'normal'}>{c}</Text>
              </Flex>
            ))}
          </Flex>
        </Flex>
      )
    }
    if (q.type === 'Fill in the Blank') {
      return (
        <Flex gap="x-small" alignItems="center" wrap="wrap">
          <Text>{q.prompt}</Text>
          <View
            as="div"
            display="inline-block"
            borderWidth="small"
            borderRadius={sharedTokens.borderRadius.card.md}
            padding="xxx-small small"
            background="secondary"
            themeOverride={{ backgroundSecondary: sharedTokens.background.pageColor }}
          >
            <Text>{q.blank}</Text>
          </View>
          <Text>.</Text>
        </Flex>
      )
    }
    if (q.type === 'Essay') {
      return (
        <Flex direction="column" gap="x-small">
          <Text as="p">{q.prompt}</Text>
          <View
            as="div"
            display="block"
            borderWidth="small"
            borderRadius={sharedTokens.borderRadius.card.md}
            margin="x-small 0 0 0"
          >
            <View
              as="div"
              display="block"
              borderWidth="0 0 small 0"
              padding="x-small small"
            >
              <Text size="small" color="secondary">Edit   View   Insert   Format   Tools   Table</Text>
            </View>
            <View as="div" display="block" height="6rem" padding="small" />
          </View>
        </Flex>
      )
    }
    // Generic placeholder for the other inserted item types
    return (
      <Text as="p" color="secondary">Configure this {q.type.toLowerCase()} question.</Text>
    )
  }

  /* ── Insert Content picker ── */
  function picker(at: number) {
    return (
      <View as="div" {...card} display="block" padding="medium" margin="x-small 0">
        <Flex justifyItems="space-between" alignItems="center" margin="0 0 small 0">
          <Heading level="h4" margin="0">Insert content</Heading>
          <Flex gap="x-small" alignItems="center">
            <IconButton size="small" withBackground={false} screenReaderLabel="Insert from item bank" renderIcon={<FolderInstUIIcon />} />
            <CloseButton size="small" screenReaderLabel="Close insert content" onClick={() => setPickerAt(null)} />
          </Flex>
        </Flex>
        <Button color="ai-primary" renderIcon={<SparklesInstUIIcon />} onClick={() => insertQuestion('Multiple Choice', at)}>
          Generate with AI
        </Button>
        <Flex margin="small 0 0 0" gap="medium" alignItems="start">
          {(['left', 'right'] as const).map((col) => (
            <Flex.Item key={col} shouldGrow shouldShrink size="0">
              <Flex direction="column">
                {ITEM_TYPES.map((row) => (
                  <Button
                    key={row[col]}
                    display="block"
                    withBackground={false}
                    renderIcon={<PlusInstUIIcon />}
                    onClick={() => insertQuestion(row[col], at)}
                  >
                    {row[col]}
                  </Button>
                ))}
              </Flex>
            </Flex.Item>
          ))}
        </Flex>
      </View>
    )
  }

  /* ── Welcome / Exit screen card ── */
  function screenCard(label: string) {
    return (
      <View as="div" display="block" borderWidth="small" borderRadius={sharedTokens.borderRadius.card.lg} padding="medium">
        <Flex justifyItems="space-between" alignItems="start" gap="small">
          <Flex.Item shouldGrow shouldShrink>
            <Text weight="bold" size="small" color="secondary">{label}</Text>
            <View as="div" display="block" margin="x-small 0 0 0">
              <Text>Please click <Text weight="bold">Start</Text> when you are ready to begin activity.</Text>
            </View>
          </Flex.Item>
          <IconButton size="small" withBackground={false} screenReaderLabel={`Edit ${label.toLowerCase()}`} renderIcon={<PencilInstUIIcon />} />
        </Flex>
      </View>
    )
  }

  /* ── A single question card in the Build canvas ── */
  function questionCard(q: Question, range: [number, number]) {
    const label = range[0] === range[1] ? `${range[0]}` : `${range[0]} - ${range[1]}`
    const g = q.bankGroup
    const pointsText = (n: number) => `${n} ${n === 1 ? 'point' : 'points'}`
    return (
      <View as="div" display="block" key={q.id} margin="0 0 small 0">
        <View as="div" {...card} display="block" padding="medium">
          <Flex justifyItems="space-between" alignItems="start" margin="0 0 small 0">
            <Flex gap="small" alignItems="center">
              {numberBadge(label)}
              {/* A bank icon marks anything pulled from a question bank. */}
              {g || q.fromBank ? <Text color="secondary"><FolderInstUIIcon /></Text> : null}
              {g ? (
                <>
                  <Text color="secondary" size="small">{pointsText(g.pointsPerQuestion)}</Text>
                  <Text color="secondary" size="small">{g.bankName}</Text>
                </>
              ) : (
                <>
                  <Pill>{q.type}</Pill>
                  <Text color="secondary" size="small">{pointsText(q.points)}</Text>
                </>
              )}
            </Flex>
            <Flex gap="xxx-small">
              <IconButton size="small" withBackground={false} screenReaderLabel={`Edit item ${label}`} renderIcon={<PencilInstUIIcon />} />
              <IconButton size="small" withBackground={false} screenReaderLabel={`Duplicate item ${label}`} renderIcon={<CopyInstUIIcon />} onClick={() => duplicateQuestion(q.id)} />
              <IconButton size="small" withBackground={false} screenReaderLabel={`Move item ${label}`} renderIcon={<GripVerticalInstUIIcon />} />
              <IconButton size="small" withBackground={false} screenReaderLabel={`Delete item ${label}`} renderIcon={<Trash2InstUIIcon />} onClick={() => deleteQuestion(q.id)} />
            </Flex>
          </Flex>
          {g ? (
            <View as="div" display="block">
              <Text as="div">
                {g.count} {g.count === 1 ? 'question' : 'questions'} {g.random ? 'pulled randomly from bank' : 'from bank'}: <Text weight="bold">{g.bankName}</Text>
              </Text>
              <Text as="div">{pointsText(g.pointsPerQuestion)} per question</Text>
            </View>
          ) : (
            questionBody(q)
          )}
        </View>
      </View>
    )
  }

  /* ─────────────── Build tab ─────────────── */
  const buildPanel = (
    <View as="div" {...card} display="block" padding="large">
      {/* Panel header */}
      <Flex justifyItems="space-between" alignItems="center" margin="0 0 medium 0" wrap="wrap" gap="small">
        <Heading level="h2" variant="titleSection" margin="0">Build</Heading>
        <Flex gap="small" wrap="wrap" alignItems="center">
          <Button renderIcon={<ChartColumnInstUIIcon />}>Overview</Button>
          <Button renderIcon={<ClipboardListInstUIIcon />}>Rubrics</Button>
          <Button renderIcon={<TargetInstUIIcon />}>Outcomes</Button>
          <Button renderIcon={<PaperclipInstUIIcon />}>Resources</Button>
          <IconButton withBackground={false} screenReaderLabel="More options" renderIcon={<EllipsisVerticalInstUIIcon />} />
        </Flex>
      </Flex>

      {addedFromBanks > 0 ? (
        <Alert variant="success" margin="0 0 medium 0" renderCloseButtonLabel="Close">
          {addedFromBanks} {addedFromBanks === 1 ? 'question' : 'questions'} added from Question banks.
        </Alert>
      ) : null}

      <Flex alignItems="stretch" gap="medium">
        {/* Builder tool rail */}
        <Flex.Item>
          <View as="div" display="block" borderWidth="small" borderRadius={sharedTokens.borderRadius.card.lg} padding="x-small">
            <Flex direction="column" alignItems="center" gap="small">
              <IconButton size="small" withBackground={false} screenReaderLabel="Toggle outline" renderIcon={<PanelLeftInstUIIcon />} />
              <View
                as="div"
                display="block"
                background="primary-inverse"
                borderRadius="circle"
                width="1.75rem"
                height="1.75rem"
                textAlign="center"
              >
                <Text color="primary-inverse" weight="bold" size="small" lineHeight="double">{questions.reduce((s, q) => s + (q.bankGroup ? q.bankGroup.count : 1), 0)}</Text>
              </View>
              <IconButton size="small" withBackground={false} screenReaderLabel="Edit" renderIcon={<SquarePenInstUIIcon />} />
              <IconButton size="small" withBackground={false} screenReaderLabel="Item checklist" renderIcon={<ClipboardCheckInstUIIcon />} />
            </Flex>
          </View>
        </Flex.Item>

        {/* Canvas */}
        <Flex.Item shouldGrow shouldShrink>
          {/* Welcome screen */}
          {screenCard('Welcome screen')}

          {/* Quiz content */}
          <View as="div" display="block" textAlign="center" margin="medium 0 small 0">
            <Text color="secondary" weight="bold">Quiz content</Text>
          </View>

          {questions.length === 0 ? (
            <View as="div" display="block" textAlign="center" padding="medium 0">
              <Text color="secondary"><NewspaperInstUIIcon size="large" /></Text>
            </View>
          ) : (
            <View as="div" display="block">
              {(() => {
                // A bank group occupies a range of question numbers (e.g. "1 - 3").
                let start = 1
                return questions.map((q) => {
                  const span = q.bankGroup ? q.bankGroup.count : 1
                  const range: [number, number] = [start, start + span - 1]
                  start += span
                  return questionCard(q, range)
                })
              })()}
            </View>
          )}

          {/* Add */}
          <View as="div" display="block" textAlign="center" margin="medium 0">
            <Button
              color="primary"
              onClick={() => setPickerAt(pickerAt === questions.length ? null : questions.length)}
            >
              Add
            </Button>
            {pickerAt === questions.length ? (
              <View as="div" display="block" margin="small 0 0 0">
                {picker(questions.length)}
              </View>
            ) : null}
          </View>

          {/* Exit screen */}
          {screenCard('Exit screen')}
        </Flex.Item>
      </Flex>
    </View>
  )

  /* ─────────────── Schedule tab ─────────────── */
  const settingsPanel = (
    <View as="div" {...card} display="block" padding="large">
      <Heading level="h2" variant="titleSection" margin="0 0 medium 0">Schedule</Heading>
      <Alert variant="warning" margin="0 0 medium 0">
        Students have already attempted this assessment. Be cautious about making changes to settings.
      </Alert>
      <View as="div" {...card} display="block" padding="x-small medium">
        {SETTINGS.map((s, i) => (
          <View
            as="div"
            display="block"
            key={s}
            borderWidth={i < SETTINGS.length - 1 ? '0 0 small 0' : '0'}
            padding="small 0"
          >
            <Checkbox
              variant="toggle"
              labelPlacement="end"
              size="small"
              label={s}
              checked={!!settings[s]}
              onChange={(e) => setSettings((prev) => ({ ...prev, [s]: e.target.checked }))}
            />
          </View>
        ))}
      </View>
    </View>
  )

  /* ── Accommodation badges for a row. Attempts aren't a course-level accommodation,
     so the attempts pill only shows on the quiz (Moderate) table. ── */
  function accommodationCell(s: ModStudent, scope: 'quiz' | 'course' = 'quiz') {
    const time = formatExtraTime(s.extraTimeMin)
    const hasAttempts = scope === 'quiz' && s.extraAttempts > 0
    if (!time && !s.unlimitedTime && !s.reducedChoices && !hasAttempts) return <Text color="secondary">—</Text>
    return (
      <Flex gap="x-small" wrap="wrap">
        {s.unlimitedTime ? <Pill color="info">Unlimited time</Pill> : time ? <Pill color="info">{`Time ${time}`}</Pill> : null}
        {hasAttempts ? (
          <Pill color="info">{`+${s.extraAttempts} ${s.extraAttempts === 1 ? 'attempt' : 'attempts'}`}</Pill>
        ) : null}
        {s.reducedChoices ? <Pill color="info">Reduced choices</Pill> : null}
      </Flex>
    )
  }

  /* ── Shared student table (status filter + table). `scope` is passed to the
     accommodation tray so its copy reflects quiz-level vs course-wide. ── */
  // The quiz Moderate table shows live attempt data (attempts, score, time, activity log)
  // and a status filter. The course-wide accommodations table is a plain roster — just who
  // has course accommodations — so attempt data and the status filter are dropped. Keeping
  // the two tables structurally different is the main signal that one page is course-wide.
  function studentTable(scope: 'quiz' | 'course') {
    const showAttemptData = scope === 'quiz'
    const rows = showAttemptData ? visibleRows : modRows
    return (
      <>
        {/* Status filter — quiz scope only; it filters by attempt status */}
        {showAttemptData ? (
        <Flex justifyItems="end" margin="0 0 medium 0">
          <Flex.Item>
            <SimpleSelect
              renderLabel={<ScreenReaderContent>Filter by status</ScreenReaderContent>}
              value={statusFilter}
              onChange={(_e, { value }) => setStatusFilter(String(value))}
            >
              <SimpleSelect.Option id="show-all" value="all">Show all</SimpleSelect.Option>
              <SimpleSelect.Option id="show-not-started" value="not-started">Not started</SimpleSelect.Option>
              <SimpleSelect.Option id="show-in-progress" value="in-progress">In progress</SimpleSelect.Option>
              <SimpleSelect.Option id="show-submitted" value="submitted">Submitted</SimpleSelect.Option>
              <SimpleSelect.Option id="show-locked" value="locked">Locked</SimpleSelect.Option>
            </SimpleSelect>
          </Flex.Item>
        </Flex>
        ) : null}

        {/* Quiz scope sits in its own card; the course table already lives inside the
            page card, so it renders flat (no nested/inner shadow). */}
        <View as="div" display="block" padding="x-small medium" {...(showAttemptData ? card : {})}>
          <Table caption={showAttemptData ? 'Student attempts and moderation' : 'Student course accommodations'} layout="auto">
            <Table.Head>
              <Table.Row>
                <Table.ColHeader id="m-student">Student</Table.ColHeader>
                {showAttemptData ? <Table.ColHeader id="m-attempts">Attempts</Table.ColHeader> : null}
                {showAttemptData ? <Table.ColHeader id="m-score">Score</Table.ColHeader> : null}
                {showAttemptData ? <Table.ColHeader id="m-time">Time</Table.ColHeader> : null}
                {showAttemptData ? <Table.ColHeader id="m-log">Activity log</Table.ColHeader> : null}
                <Table.ColHeader id="m-accom">Accommodations</Table.ColHeader>
                <Table.ColHeader id="m-actions" textAlign={showAttemptData ? undefined : 'end'}>Action</Table.ColHeader>
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {rows.map((s) => (
                <Table.Row key={s.id}>
                  <Table.Cell>
                    <Flex gap="x-small" alignItems="center">
                      <Flex.Item shouldShrink={false}>
                        <Avatar name={s.name} size="x-small" />
                      </Flex.Item>
                      <Flex.Item shouldShrink shouldGrow size="0">
                        <Link>{s.name}</Link>
                      </Flex.Item>
                    </Flex>
                  </Table.Cell>
                  {showAttemptData ? (
                    <Table.Cell>
                      {s.attemptsUsed === 0 ? (
                        <Text color="secondary">—</Text>
                      ) : (
                        <Flex direction="column" gap="xxx-small" alignItems="start">
                          {Array.from({ length: s.attemptsUsed }, (_, i) => i + 1).map((n) => (
                            <Link key={n} onClick={() => openResult(s.id, n)}>Attempt {n}</Link>
                          ))}
                        </Flex>
                      )}
                    </Table.Cell>
                  ) : null}
                  {showAttemptData ? <Table.Cell>{s.score}</Table.Cell> : null}
                  {showAttemptData ? (
                    <Table.Cell>
                      <Flex gap="x-small" alignItems="center">
                        <Text>{s.time}</Text>
                        {s.status === 'Paused' ? <Pill color="warning">Paused</Pill> : null}
                      </Flex>
                    </Table.Cell>
                  ) : null}
                  {showAttemptData ? (
                    <Table.Cell>
                      {s.attemptsUsed === 0 ? (
                        <Text color="secondary">—</Text>
                      ) : (
                        <Flex direction="column" gap="xxx-small" alignItems="start">
                          {Array.from({ length: s.attemptsUsed }, (_, i) => i + 1).map((n) => (
                            <Link key={n} onClick={() => setLogRef({ studentId: s.id, attempt: n })}>Log {n}</Link>
                          ))}
                        </Flex>
                      )}
                    </Table.Cell>
                  ) : null}
                  <Table.Cell>{accommodationCell(s, scope)}</Table.Cell>
                  <Table.Cell textAlign={showAttemptData ? undefined : 'end'}>
                    <Button size="small" renderIcon={<PlusInstUIIcon />} onClick={() => openModerate(s.id, scope)}>Accommodation</Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </View>
      </>
    )
  }

  /* ─────────────── Moderate tab ─────────────── */
  const moderatePanel = (
    <View as="div" {...card} display="block" padding="large">
      <Flex justifyItems="space-between" alignItems="start" margin="0 0 small 0" wrap="wrap" gap="small">
        <Heading level="h2" variant="titleSection" margin="0">Moderate</Heading>
        <Button renderIcon={<GaugeInstUIIcon />}>SpeedGrader</Button>
      </Flex>
      <View as="div" display="block" margin="0 0 medium 0">
        <Text color="secondary" size="small">
          Quiz default: {BASE_ATTEMPTS} {BASE_ATTEMPTS === 1 ? 'attempt' : 'attempts'}, {BASE_TIME_LIMIT_MIN}-minute time limit.
        </Text>
      </View>

      {studentTable('quiz')}
    </View>
  )

  /* ─────────────── Course accommodations (course-wide) screen ─────────────── */
  const courseAccommodationsScreen = (
    <View as="div" display="block">
      <View as="div" display="block" margin="0 0 small 0">
        <Link onClick={() => setScreen('index')}>Back to Quizzes</Link>
      </View>
      <Flex justifyItems="space-between" alignItems="start" wrap="wrap" gap="small" margin="0 0 small 0">
        <Flex.Item shouldGrow shouldShrink>
          <Heading level="h1" variant="titlePageDesktop" margin="0">Course accommodations</Heading>
        </Flex.Item>
      </Flex>
      <Alert variant="info" hasShadow={false} margin="0 0 medium 0">
        These accommodations apply to every quiz in this course.
      </Alert>
      <View as="div" {...card} display="block" padding="large">
        {studentTable('course')}
      </View>
    </View>
  )

  /* ─────────────── Accommodation tray + activity log (shared overlays) ─────────────── */
  const accommodationOverlays = (
    <>
      {/* Accommodations tray — opened by a row's "Accommodation" button */}
      <Tray
        label={accomScope === 'course' ? 'Course accommodations' : 'Current quiz accommodations'}
        open={current !== null}
        onDismiss={() => setModerateId(null)}
        placement="end"
        size="regular"
      >
        {current ? (
          <View as="div" display="block" height="100vh" position="relative">
            {/* Scrollable region (header + body); footer is pinned below it */}
            <View as="div" display="block" height="100%" overflowY="auto" padding="medium">
              {/* Header */}
              <Flex justifyItems="space-between" alignItems="start" gap="small">
                <Heading level="h3" margin="0">{accomScope === 'course' ? 'Course accommodations' : 'Current quiz accommodations'}</Heading>
                <CloseButton screenReaderLabel="Close" onClick={() => setModerateId(null)} />
              </Flex>
              <View as="div" display="block" margin="small 0 medium 0">
                <Text weight="bold">{current.name}</Text>
              </View>

              <Alert variant="info" margin="0 0 medium 0">
                {accomScope === 'course'
                  ? 'These settings apply to every quiz in this course.'
                  : (
                    <>
                      These settings apply to the current quiz only, including the in-progress attempts.{' '}
                      <Link onClick={() => { setModerateId(null); setScreen('course-accom') }}>
                        View course accommodations
                      </Link>
                    </>
                  )}
              </Alert>

              <View as="div" display="block" margin="0 0 medium 0">
                <Checkbox
                  variant="toggle"
                  labelPlacement="end"
                  size="small"
                  checked={draftReduced}
                  onChange={(e) => setDraftReduced(e.target.checked)}
                  label={
                    <Flex gap="x-small" alignItems="center">
                      <Text>Reduced answer choices</Text>
                      <Text color="secondary"><InfoInstUIIcon /></Text>
                    </Flex>
                  }
                />
              </View>

              {(() => {
                const timeLimitBody = (
                  <>
                    <Flex direction="column" gap="small">
                      <Flex justifyItems="space-between" alignItems="center">
                        <Text weight="bold">{accomScope === 'course' ? 'Default time limit:' : 'Quiz time limit:'}</Text>
                        <Text>{fmtDuration(BASE_TIME_LIMIT_MIN)}</Text>
                      </Flex>
                      {accomScope === 'quiz' ? (
                        <Flex justifyItems="space-between" alignItems="start" gap="small">
                          <Text weight="bold">Course accommodation:</Text>
                          <Flex direction="column" alignItems="end">
                            <Text>None</Text>
                          </Flex>
                        </Flex>
                      ) : null}
                      <Flex justifyItems="space-between" alignItems="center">
                        <Text weight="bold">Time adjustment:</Text>
                        <Text>+{fmtDuration(draftExtraMin)}</Text>
                      </Flex>
                      <View as="div" display="block" borderWidth="small 0 0 0" padding="small 0 0 0">
                        <Flex justifyItems="space-between" alignItems="center">
                          <Text weight="bold">Total:</Text>
                          <Text weight="bold">{draftTimeMode === 'unlimited' ? 'Unlimited' : fmtDuration(BASE_TIME_LIMIT_MIN + draftExtraMin)}</Text>
                        </Flex>
                      </View>
                      {accomScope === 'quiz' ? (
                        <Text color="secondary" size="small">
                          {current.time !== '—' ? `${current.time} has been used` : 'No time has been used yet'}
                        </Text>
                      ) : null}
                    </Flex>

                    <View as="div" display="block" margin="medium 0 0 0">
                      <SimpleSelect
                        renderLabel="Time adjustment"
                        value={draftTimeMode}
                        onChange={(_e, { value }) => setDraftTimeMode(value as 'add' | 'none' | 'unlimited')}
                      >
                        <SimpleSelect.Option id="time-add" value="add">Give additional time</SimpleSelect.Option>
                        <SimpleSelect.Option id="time-none" value="none">No additional time</SimpleSelect.Option>
                        <SimpleSelect.Option id="time-unlimited" value="unlimited">Give unlimited time</SimpleSelect.Option>
                      </SimpleSelect>
                    </View>

                    {draftTimeMode === 'add' ? (
                      <>
                        <Flex gap="small" margin="medium 0 0 0">
                          <Flex.Item shouldGrow shouldShrink size="0">
                            <NumberInput
                              renderLabel="Hours"
                              value={String(draftHours)}
                              onChange={(_e, value) => setDraftHours(Math.max(0, parseInt(value || '0', 10) || 0))}
                              onIncrement={() => setDraftHours((n) => n + 1)}
                              onDecrement={() => setDraftHours((n) => Math.max(0, n - 1))}
                            />
                          </Flex.Item>
                          <Flex.Item shouldGrow shouldShrink size="0">
                            <NumberInput
                              renderLabel="Minutes"
                              value={String(draftMinutes)}
                              onChange={(_e, value) => setDraftMinutes(Math.min(59, Math.max(0, parseInt(value || '0', 10) || 0)))}
                              onIncrement={() => setDraftMinutes((n) => Math.min(59, n + 5))}
                              onDecrement={() => setDraftMinutes((n) => Math.max(0, n - 5))}
                            />
                          </Flex.Item>
                        </Flex>
                        <View as="div" display="block" margin="x-small 0 0 0">
                          <Text color="secondary" size="small">
                            {accomScope === 'course'
                              ? 'This applies to every quiz in this course.'
                              : 'This sets the total additional time available for this attempt.'}
                          </Text>
                        </View>
                        {accomScope === 'quiz' && draftExtraMin > 0 ? (
                          <Alert variant="warning" margin="medium 0 0 0">
                            The added time extends past this quiz's Until Time of Mar 17, 10:30 AM. The quiz will auto-submit at the Until Time. To avoid this, raise the Until Time on the Assignment Details page or lower the adjusted time.
                          </Alert>
                        ) : null}
                      </>
                    ) : null}
                  </>
                )

                const attemptsBody = (
                  <>
                    <Flex direction="column" gap="small">
                      <Flex justifyItems="space-between" alignItems="center">
                        <Text weight="bold">Default:</Text>
                        <Text>{BASE_ATTEMPTS} {BASE_ATTEMPTS === 1 ? 'attempt' : 'attempts'}</Text>
                      </Flex>
                      <Flex justifyItems="space-between" alignItems="center">
                        <Text weight="bold">Additional:</Text>
                        <Text>{draftAttempts} {draftAttempts === 1 ? 'attempt' : 'attempts'}</Text>
                      </Flex>
                      <View as="div" display="block" borderWidth="small 0 0 0" padding="small 0 0 0">
                        <Flex justifyItems="space-between" alignItems="center">
                          <Text weight="bold">Total:</Text>
                          <Text weight="bold">{BASE_ATTEMPTS + draftAttempts} {BASE_ATTEMPTS + draftAttempts === 1 ? 'attempt' : 'attempts'}</Text>
                        </Flex>
                      </View>
                      <Text color="secondary" size="small">
                        {current.attemptsUsed === 0 ? 'No attempts have been recorded yet' : `${current.attemptsUsed} ${current.attemptsUsed === 1 ? 'attempt' : 'attempts'} recorded`}
                      </Text>
                    </Flex>

                    <View as="div" display="block" margin="medium 0 0 0">
                      <NumberInput
                        renderLabel="Additional attempt"
                        value={String(draftAttempts)}
                        onChange={(_e, value) => setDraftAttempts(Math.max(0, parseInt(value || '0', 10) || 0))}
                        onIncrement={() => setDraftAttempts((n) => n + 1)}
                        onDecrement={() => setDraftAttempts((n) => Math.max(0, n - 1))}
                      />
                    </View>
                  </>
                )

                // Course scope has only time-limit accommodations, so the tab strip is
                // dropped and the content renders directly. Quiz scope keeps both tabs.
                return accomScope === 'quiz' ? (
                  <Tabs onRequestTabChange={(_e, { index }) => setTrayTab(index)}>
                    <Tabs.Panel renderTitle="Time limit" isSelected={trayTab === 0} padding="medium 0 0 0">
                      {timeLimitBody}
                    </Tabs.Panel>
                    <Tabs.Panel renderTitle="Attempts" isSelected={trayTab === 1} padding="medium 0 0 0">
                      {attemptsBody}
                    </Tabs.Panel>
                  </Tabs>
                ) : (
                  <View as="div" display="block" padding="small 0 0 0">
                    {timeLimitBody}
                  </View>
                )
              })()}

              {/* Spacer so the last field clears the pinned footer */}
              <View as="div" display="block" height="3.5rem" />
            </View>

            {/* Sticky footer pinned to the bottom of the tray */}
            <View
              as="div"
              display="block"
              position="absolute"
              insetBlockEnd="0"
              insetInlineStart="0"
              insetInlineEnd="0"
              padding="small medium"
              background="secondary"
              themeOverride={{ backgroundSecondary: sharedTokens.background.pageColor }}
              borderWidth="small 0 0 0"
            >
              <Flex justifyItems="end" gap="small">
                <Button onClick={() => setModerateId(null)}>Cancel</Button>
                <Button color="primary" onClick={saveModerate}>Apply</Button>
              </Flex>
            </View>
          </View>
        ) : null}
      </Tray>

      {/* Activity log dialog */}
      <Modal
        open={logStudent !== null}
        onDismiss={() => setLogRef(null)}
        label="Activity log"
        size="small"
      >
        <Modal.Header>
          <CloseButton placement="end" offset="small" onClick={() => setLogRef(null)} screenReaderLabel="Close" />
          <Heading level="h3">Activity log — {logStudent?.name}, Attempt {logRef?.attempt}</Heading>
        </Modal.Header>
        <Modal.Body>
          {logStudent && logRef ? (
            <Flex direction="column" gap="medium">
              {buildLog(logStudent, logRef.attempt).map((e, i) => (
                <Flex key={`${e.time}-${i}`} gap="small" alignItems="start">
                  <Flex.Item shouldShrink={false}>
                    <Text color="secondary" size="small"><ClockInstUIIcon /></Text>
                  </Flex.Item>
                  <Flex.Item shouldGrow shouldShrink size="0">
                    <Text as="div">{e.label}</Text>
                    <Text as="div" color="secondary" size="small">{e.time}</Text>
                  </Flex.Item>
                </Flex>
              ))}
            </Flex>
          ) : null}
        </Modal.Body>
        <Modal.Footer>
          <Button color="primary" onClick={() => setLogRef(null)}>Close</Button>
        </Modal.Footer>
      </Modal>
    </>
  )

  /* ─────────────── Reports tab ─────────────── */
  const reportsPanel = (
    <View as="div" {...card} display="block" padding="large">
      <Heading level="h2" variant="titleSection" margin="0 0 medium 0">Reports</Heading>
      <Flex gap="medium" alignItems="stretch" wrap="wrap">
        {REPORTS.map((r) => (
          <Flex.Item key={r.title} shouldGrow shouldShrink size="16rem">
            <View as="div" {...card} display="block" padding="medium" height="100%">
              <Flex direction="column" gap="large" height="100%" justifyItems="space-between">
                <Flex justifyItems="space-between" alignItems="start" gap="small">
                  <Heading level="h3" variant="titleCardRegular" margin="0">{r.title}</Heading>
                  {r.action === 'Export CSV' ? (
                    <Button size="small" interaction="disabled">Export CSV</Button>
                  ) : null}
                </Flex>
                <Flex justifyItems={r.link ? 'end' : 'start'}>
                  {r.action === 'View Report' ? (
                    <Link>View Report</Link>
                  ) : (
                    <Link>{r.link}</Link>
                  )}
                </Flex>
              </Flex>
            </View>
          </Flex.Item>
        ))}
      </Flex>
    </View>
  )

  const panels = [buildPanel, settingsPanel, moderatePanel, reportsPanel]

  /* ─────────────── Quizzes index (first screen) ─────────────── */
  function quizRow(item: QuizListItem, last: boolean) {
    return (
      <View
        as="div"
        display="block"
        key={item.id}
        borderWidth={last ? '0' : '0 0 small 0'}
        padding="small 0"
      >
        <Flex justifyItems="space-between" alignItems="center" gap="small">
          <Flex gap="small" alignItems="start">
            <Text color={item.published ? 'success' : 'secondary'}>
              {item.published ? <CircleCheckInstUIIcon /> : <CircleSlashInstUIIcon />}
              <ScreenReaderContent>{item.published ? 'Published' : 'Unpublished'}</ScreenReaderContent>
            </Text>
            <Flex direction="column" gap="xxx-small">
              <Flex gap="x-small" alignItems="center">
                <Text color="secondary" size="small"><RocketInstUIIcon /></Text>
                <Link onClick={() => openQuiz(item)}>{item.title}</Link>
              </Flex>
              <Text size="small" color="secondary">
                {item.due === 'No due date' ? 'No due date' : `Due ${item.due}`}
                {' · '}{item.points} {item.points === 1 ? 'pt' : 'pts'}
                {' · '}{item.questions} {item.questions === 1 ? 'question' : 'questions'}
              </Text>
            </Flex>
          </Flex>
          <IconButton
            size="small"
            withBackground={false}
            screenReaderLabel={`Options for ${item.title}`}
            renderIcon={<EllipsisVerticalInstUIIcon />}
          />
        </Flex>
      </View>
    )
  }

  const indexScreen = (
    <View as="div" display="block">
      <Flex justifyItems="space-between" alignItems="center" margin="0 0 large 0" wrap="wrap" gap="small">
        <Heading level="h1" variant="titlePageDesktop" margin="0">Quizzes</Heading>
        <Flex gap="small" wrap="wrap" alignItems="center">
          <Button>Manage presets</Button>
          <Button onClick={() => setScreen('course-accom')}>Course accommodations</Button>
          <Button color="primary" renderIcon={<PlusInstUIIcon />} onClick={createQuiz}>Quiz</Button>
        </Flex>
      </Flex>

      <Flex direction="column" gap="large">
        {QUIZ_GROUPS.map((group) => {
          const items = QUIZ_INDEX.filter((q) => q.group === group)
          if (items.length === 0) return null
          return (
            <View as="div" display="block" key={group}>
              <Heading level="h2" variant="titleSection" margin="0 0 small 0">{group}</Heading>
              <View as="div" {...card} display="block" padding="x-small medium">
                {items.map((item, i) => quizRow(item, i === items.length - 1))}
              </View>
            </View>
          )
        })}
      </Flex>
    </View>
  )

  /* ─────────────── Builder screen ─────────────── */
  const builderScreen = (
    <View as="div" display="block">
      {/* Page header */}
      <Flex justifyItems="space-between" alignItems="start" wrap="wrap" gap="small" margin="0 0 medium 0">
        <Flex.Item shouldGrow shouldShrink>
          <Flex gap="x-small" alignItems="center">
            <Heading level="h1" variant="titlePageDesktop" margin="0">{quizTitle}</Heading>
            <IconButton withBackground={false} size="small" screenReaderLabel="Rename quiz" renderIcon={<PencilInstUIIcon />} />
          </Flex>
          <View as="div" display="block" margin="xx-small 0 0 0">
            <Text size="small" color="secondary">Created by alex.rivera@instructure.com on Jun 22, 2026 | Saved just now</Text>
          </View>
        </Flex.Item>
        <Button color="primary" renderIcon={<RocketInstUIIcon />}>Publish</Button>
      </Flex>

      {/* Tabs (InstUI) */}
      <Tabs onRequestTabChange={(_e, { index }) => setTab(index)}>
        {TABS.map((title, i) => (
          <Tabs.Panel
            key={title}
            renderTitle={title}
            isSelected={tab === i}
            padding="none"
            themeOverride={{ defaultOverflowY: 'visible' }}
          >
            <View as="div" display="block" margin="medium 0 0 0">
              {panels[i]}
            </View>
          </Tabs.Panel>
        ))}
      </Tabs>
    </View>
  )

  /* ─────────────── Attempt result page ─────────────── */
  const resultStudent = result ? mods[result.studentId] : null
  const resultScreen =
    resultStudent && result ? (
      <View as="div" display="block">
        <View as="div" display="block" margin="0 0 small 0">
          <Link onClick={backFromResult}>{resultReturn === 'course-accom' ? 'Back to Course accommodations' : 'Back to Moderate'}</Link>
        </View>

        {/* Page header */}
        <Flex justifyItems="space-between" alignItems="start" wrap="wrap" gap="small" margin="0 0 medium 0">
          <Flex.Item shouldGrow shouldShrink>
            <Heading level="h1" variant="titlePageDesktop" margin="0">
              {resultStudent.name} — Attempt {result.attempt}
            </Heading>
            <View as="div" display="block" margin="xx-small 0 0 0">
              <Text size="small" color="secondary">{quizTitle}</Text>
            </View>
          </Flex.Item>
          <Button renderIcon={<GaugeInstUIIcon />}>SpeedGrader</Button>
        </Flex>

        {/* Attempt summary */}
        <View as="div" {...card} display="block" padding="medium" margin="0 0 medium 0">
          <Flex gap="x-large" wrap="wrap">
            {[
              { label: 'Score', value: resultStudent.score },
              { label: 'Time', value: resultStudent.time },
              { label: 'Attempt', value: `${result.attempt} of ${resultStudent.baseAttempts + resultStudent.extraAttempts}` },
              { label: 'Submitted', value: 'Mar 17, 2026' },
            ].map((stat) => (
              <Flex.Item key={stat.label}>
                <Text as="div" size="small" color="secondary">{stat.label}</Text>
                <Text as="div" weight="bold">{stat.value}</Text>
              </Flex.Item>
            ))}
          </Flex>
        </View>

        {/* Per-question breakdown */}
        <View as="div" {...card} display="block" padding="medium">
          <Heading level="h3" variant="titleCardRegular" margin="0 0 small 0">Question breakdown</Heading>
          {(() => {
            const graded = resultStudent.score.endsWith('%')
            const pct = graded ? parseInt(resultStudent.score, 10) / 100 : 0
            const totalPoints = INITIAL_QUESTIONS.reduce((sum, q) => sum + q.points, 0)
            let remaining = graded ? Math.round(pct * totalPoints) : 0
            return INITIAL_QUESTIONS.map((q, i) => {
              const correct = graded && remaining >= q.points
              if (correct) remaining -= q.points
              const earned = correct ? q.points : 0
              return (
                <View
                  as="div"
                  display="block"
                  key={q.id}
                  borderWidth={i < INITIAL_QUESTIONS.length - 1 ? '0 0 small 0' : '0'}
                  padding="small 0"
                >
                  <Flex justifyItems="space-between" alignItems="start" gap="small">
                    <Flex gap="small" alignItems="start">
                      <Flex.Item shouldShrink={false}>{numberBadge(i + 1)}</Flex.Item>
                      <Flex direction="column" gap="xxx-small">
                        <Text>{q.prompt}</Text>
                        <Flex.Item>
                          {graded ? (
                            <Pill color={correct ? 'success' : 'warning'}>{correct ? 'Correct' : 'Incorrect'}</Pill>
                          ) : (
                            <Pill color="info">Not graded</Pill>
                          )}
                        </Flex.Item>
                      </Flex>
                    </Flex>
                    <Flex.Item shouldShrink={false}>
                      <Text color="secondary">{graded ? `${earned} / ${q.points} pts` : `— / ${q.points} pts`}</Text>
                    </Flex.Item>
                  </Flex>
                </View>
              )
            })
          })()}
        </View>
      </View>
    ) : null

  /* ─────────────── Chrome ─────────────── */
  return (
    <View
      as="div"
      height="100vh"
      overflowX="hidden"
      overflowY="hidden"
      background="secondary"
      themeOverride={{ backgroundSecondary: sharedTokens.background.pageColor }}
      display="block"
      padding="medium"
    >
      <Flex height="100%" width="100%" alignItems="stretch" gap="small">
        {/* Global navigation rail (first layer) — permanent, same card as the others */}
        <View as="div" {...card} height="100%" display="block" overflowY="hidden">
          <SideNavBar
            label="Main navigation"
            toggleLabel={{ expandedLabel: 'Minimize navigation', minimizedLabel: 'Expand navigation' }}
            themeOverride={{ boxShadow: [] } as Record<string, unknown>}
          >
            <SideNavBar.Item
              icon={<IconCanvasLogoSolid size="medium" />}
              label={<ScreenReaderContent>Canvas</ScreenReaderContent>}
              href="#"
              themeOverride={{ contentPadding: '1em 0.375rem 1em 0.375rem' }}
            />
            <SideNavBar.Item icon={<Avatar name="Instructor" size="x-small" />} label="Account" href="#" />
            <SideNavBar.Item icon={<SettingsInstUIIcon />} label="Admin" href="#" />
            <SideNavBar.Item icon={<LayoutDashboardInstUIIcon />} label="Dashboard" href="#" />
            <SideNavBar.Item icon={<BookOpenInstUIIcon />} label="Courses" href="#" selected />
            <SideNavBar.Item icon={<CalendarDaysInstUIIcon />} label="Calendar" href="#" />
            <SideNavBar.Item icon={<InboxInstUIIcon />} label="Inbox" href="#" />
            <SideNavBar.Item icon={<ClockInstUIIcon />} label="History" href="#" />
            <SideNavBar.Item icon={<CircleHelpInstUIIcon />} label="Help" href="#" />
            <SideNavBar.Item
              icon={isDark ? <SunInstUIIcon /> : <MoonInstUIIcon />}
              label="Theme"
              onClick={onToggleTheme}
            />
          </SideNavBar>
        </View>

        {/* Right area: permanent breadcrumb bar, then course nav + content */}
        <Flex.Item shouldGrow shouldShrink>
          <Flex direction="column" height="100%" gap="small">
            {/* Top breadcrumb bar (permanent) */}
            <Flex.Item padding="0 xx-small">
              <View as="div" {...card} display="block" padding="small medium">
                <Flex gap="small" alignItems="center">
                  <IconButton withBackground={false} size="small" screenReaderLabel="Course menu" renderIcon={<AlignJustifyInstUIIcon />} />
                  <Breadcrumb label="You are here:" size="medium">
                    <Breadcrumb.Link onClick={() => setScreen('index')}>Level 1</Breadcrumb.Link>
                    <Breadcrumb.Link>Current Level</Breadcrumb.Link>
                  </Breadcrumb>
                </Flex>
              </View>
            </Flex.Item>

            {/* Content. padding gives the card shadows a gutter so overflow:hidden doesn't clip them. */}
            <Flex.Item shouldGrow shouldShrink overflowY="auto" padding="xx-small">
              <View as="div" maxWidth="68rem" display="block" margin="0 auto" width="100%">
                {screen === 'index'
                  ? indexScreen
                  : screen === 'result'
                    ? resultScreen
                    : screen === 'course-accom'
                      ? courseAccommodationsScreen
                      : builderScreen}
              </View>
            </Flex.Item>
          </Flex>
        </Flex.Item>
      </Flex>
      {accommodationOverlays}
    </View>
  )
}
