import { useState, useCallback, useEffect } from 'react'
import allQuestions from './data/questions.json'

const QUIZ_LENGTH = 23

const CATEGORIES = [
  { id: 'movie',     label: '🎬 Film' },
  { id: 'book',      label: '📚 Knihy' },
  { id: 'biography', label: '✍️ Tolkien' },
  { id: 'tcg',       label: '🃏 Karetní hra' },
]

// ── helpers ─────────────────────────────────────────────────────────────────

function normalize(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
}

function checkOpen(userAnswer, variants) {
  if (!userAnswer.trim()) return false
  const u = normalize(userAnswer)
  return variants.some(v => {
    const n = normalize(v)
    return u === n || u.includes(n) || n.includes(u)
  })
}

function pickRandom(arr, n) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy.slice(0, n)
}

function getCategoryLabel(cat) {
  return { movie: '🎬 Film', book: '📚 Knihy', biography: '✍️ Tolkien', tcg: '🃏 Karetní hra' }[cat] ?? cat
}

// ── StartScreen ──────────────────────────────────────────────────────────────

function StartScreen({ onStart, selected, onToggle }) {
  const noneSelected = selected.length === 0
  return (
    <div className="screen start-screen">
      <div className="ring-icon">💍</div>
      <h1>Pán prstenů</h1>
      <h2>Trivia Kvíz</h2>
      <p>Ověř si znalosti z filmů, knih a karetních her světa Středozemě!</p>
      <div className="quiz-info">
        <span>23 otázek</span>
        <span>·</span>
        <span>Střední & těžká</span>
      </div>
      <div className="cat-label">Kategorie</div>
      <div className="cat-toggles">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`cat-btn${selected.includes(cat.id) ? ' active' : ''}`}
            onClick={() => onToggle(cat.id)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <button className="btn-primary" onClick={onStart} disabled={noneSelected}>
        Spustit kvíz
      </button>
    </div>
  )
}

// ── QuizScreen ───────────────────────────────────────────────────────────────

function shuffleArray(arr) {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function QuizScreen({ question, questionNumber, total, onAnswer }) {
  const [openAnswer, setOpenAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [isCorrect, setIsCorrect] = useState(false)
  const [selectedOption, setSelectedOption] = useState(null)
  const [shuffledOptions, setShuffledOptions] = useState([])

  useEffect(() => {
    setOpenAnswer('')
    setSubmitted(false)
    setIsCorrect(false)
    setSelectedOption(null)
    if (question.type === 'ABCD') {
      setShuffledOptions(shuffleArray(question.options))
    }
  }, [question])

  const commit = (correct) => {
    setIsCorrect(correct)
    setSubmitted(true)
    setTimeout(() => onAnswer(correct), 1600)
  }

  const handleOption = (option) => {
    if (submitted) return
    setSelectedOption(option)
    commit(option === question.answer)
  }

  const handleOpenSubmit = () => {
    if (submitted || !openAnswer.trim()) return
    const variants = question.accepted_variants ?? [question.answer]
    commit(checkOpen(openAnswer, variants))
  }

  const optionClass = (option) => {
    if (!submitted) return 'option-btn'
    if (option === question.answer) return 'option-btn correct'
    if (option === selectedOption) return 'option-btn wrong'
    return 'option-btn disabled'
  }

  const progress = (questionNumber - 1) / total

  return (
    <div className="screen quiz-screen">
      <div className="progress-wrap">
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${progress * 100}%` }} />
        </div>
        <span className="progress-label">{questionNumber}/{total}</span>
      </div>

      <div className="category-badge">{getCategoryLabel(question.category)}</div>

      <div className="question-box">
        <p className="question-text">{question.question}</p>
      </div>

      {question.type === 'ABCD' ? (
        <div className="options">
          {shuffledOptions.map((opt, i) => (
            <button
              key={i}
              className={optionClass(opt)}
              onClick={() => handleOption(opt)}
              disabled={submitted}
            >
              <span className="option-letter">{String.fromCharCode(65 + i)}</span>
              {opt}
            </button>
          ))}
          {submitted && (
            <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✓ Správně!' : `✗ Správně: ${question.answer}`}
            </div>
          )}
        </div>
      ) : (
        <div className="open-answer">
          <input
            type="text"
            className={`open-input${submitted ? (isCorrect ? ' correct' : ' incorrect') : ''}`}
            placeholder="Napiš svou odpověď…"
            value={openAnswer}
            onChange={e => setOpenAnswer(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleOpenSubmit()}
            disabled={submitted}
            autoFocus
          />
          {submitted ? (
            <div className={`answer-feedback ${isCorrect ? 'correct' : 'incorrect'}`}>
              {isCorrect ? '✓ Správně!' : `✗ Správně: ${question.answer}`}
            </div>
          ) : (
            <button
              className="btn-primary"
              onClick={handleOpenSubmit}
              disabled={!openAnswer.trim()}
            >
              Potvrdit
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── ResultScreen ─────────────────────────────────────────────────────────────

function ResultScreen({ score, total, wrongQuestions, onReviewQuiz, onReviewList, onRestart }) {
  const pct = Math.round((score / total) * 100)
  const [barWidth, setBarWidth] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setBarWidth(pct), 100)
    return () => clearTimeout(t)
  }, [pct])

  const { msg, emoji } = (() => {
    if (pct >= 90) return { msg: 'Jsi skutečný Pán Středozemě!', emoji: '💍' }
    if (pct >= 70) return { msg: 'Hrdina hodný Společenstva!', emoji: '🧝' }
    if (pct >= 50) return { msg: 'Zdatný hobit z Kraje!', emoji: '🍂' }
    if (pct >= 30) return { msg: 'Ještě trochu trénovat…', emoji: '📖' }
    return { msg: 'Ani Glum by to lépe nedal!', emoji: '🐟' }
  })()

  const hasWrong = wrongQuestions.length > 0

  return (
    <div className="screen result-screen">
      <div className="result-emoji">{emoji}</div>
      <h2>Kvíz dokončen!</h2>
      <div className="score-display">
        <span className="score-number">{score}</span>
        <span className="score-total">/{total}</span>
      </div>
      <p className="score-percent">{pct} %</p>
      <div className="score-bar-wrap">
        <div className="score-bar-fill" style={{ width: `${barWidth}%` }} />
      </div>
      <p className="result-message">{msg}</p>

      {hasWrong && (
        <div className="review-prompt">
          <p className="review-prompt-text">
            Chceš procvičit {wrongQuestions.length} {wrongQuestions.length === 1 ? 'špatnou otázku' : wrongQuestions.length < 5 ? 'špatné otázky' : 'špatných otázek'}?
          </p>
          <div className="review-btns">
            <button className="btn-primary" onClick={onReviewQuiz}>
              Ano, procvičit
            </button>
            <button className="btn-secondary" onClick={onReviewList}>
              Ne, zobrazit odpovědi
            </button>
          </div>
        </div>
      )}

      <button className="btn-ghost" onClick={onRestart}>
        Hrát znovu
      </button>
    </div>
  )
}

// ── ReviewListScreen ──────────────────────────────────────────────────────────

function ReviewListScreen({ wrongQuestions, onRestart }) {
  return (
    <div className="screen review-screen">
      <h2 className="review-title">Správné odpovědi</h2>
      <p className="review-subtitle">{wrongQuestions.length} {wrongQuestions.length === 1 ? 'otázka' : wrongQuestions.length < 5 ? 'otázky' : 'otázek'}</p>
      <div className="review-list">
        {wrongQuestions.map((q, i) => (
          <div key={q.id} className="review-item">
            <div className="review-item-num">{i + 1}</div>
            <div className="review-item-body">
              <p className="review-item-q">{q.question}</p>
              <p className="review-item-a">✓ {q.answer}</p>
            </div>
          </div>
        ))}
      </div>
      <button className="btn-primary" onClick={onRestart} style={{ marginTop: '8px' }}>
        Hrát znovu
      </button>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  const [phase, setPhase] = useState('start')
  const [questions, setQuestions] = useState([])
  const [idx, setIdx] = useState(0)
  const [score, setScore] = useState(0)
  const [wrongQuestions, setWrongQuestions] = useState([])
  const [selected, setSelected] = useState(CATEGORIES.map(c => c.id))

  const toggleCategory = useCallback((id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    )
  }, [])

  const startQuiz = useCallback((pool) => {
    const source = pool ?? allQuestions.filter(q => selected.includes(q.category))
    setQuestions(pickRandom(source, Math.min(QUIZ_LENGTH, source.length)))
    setIdx(0)
    setScore(0)
    setWrongQuestions([])
    setPhase('quiz')
  }, [selected])

  const handleAnswer = useCallback((correct) => {
    const next = idx + 1
    const newScore = score + (correct ? 1 : 0)
    if (!correct) {
      setWrongQuestions(prev => [...prev, questions[idx]])
    }
    if (next >= questions.length) {
      setScore(newScore)
      setPhase('result')
    } else {
      setScore(newScore)
      setIdx(next)
    }
  }, [idx, score, questions])

  return (
    <div className="app">
      {phase === 'start' && (
        <StartScreen onStart={() => startQuiz()} selected={selected} onToggle={toggleCategory} />
      )}
      {phase === 'quiz' && questions[idx] && (
        <QuizScreen
          question={questions[idx]}
          questionNumber={idx + 1}
          total={questions.length}
          onAnswer={handleAnswer}
        />
      )}
      {phase === 'result' && (
        <ResultScreen
          score={score}
          total={questions.length}
          wrongQuestions={wrongQuestions}
          onReviewQuiz={() => startQuiz(wrongQuestions)}
          onReviewList={() => setPhase('review-list')}
          onRestart={() => setPhase('start')}
        />
      )}
      {phase === 'review-list' && (
        <ReviewListScreen
          wrongQuestions={wrongQuestions}
          onRestart={() => setPhase('start')}
        />
      )}
    </div>
  )
}
