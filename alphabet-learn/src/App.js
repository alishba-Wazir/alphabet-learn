import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import axios from 'axios';
import './App.css';

// Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(false);
  const [username] = useState('learner_' + Math.floor(Math.random() * 1000));

  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved) setDarkMode(JSON.parse(saved));
  }, []);

  const toggleTheme = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', JSON.stringify(newMode));
  };

  return (
    <ThemeContext.Provider value={{ darkMode, toggleTheme, username }}>
      {children}
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// Color palette for balls
const BALL_COLORS = [
  { name: 'Red', hex: '#FF6B6B', bg: 'linear-gradient(135deg, #FF6B6B, #EE5A6F)' },
  { name: 'Blue', hex: '#4ECDC4', bg: 'linear-gradient(135deg, #4ECDC4, #44A3AA)' },
  { name: 'Green', hex: '#95E1D3', bg: 'linear-gradient(135deg, #95E1D3, #6BC5B8)' },
  { name: 'Yellow', hex: '#FCE38A', bg: 'linear-gradient(135deg, #FCE38A, #F4D03F)' },
  { name: 'Purple', hex: '#A8E6CF', bg: 'linear-gradient(135deg, #A8E6CF, #88D8A3)' },
  { name: 'Orange', hex: '#FFB347', bg: 'linear-gradient(135deg, #FFB347, #FF8C42)' },
  { name: 'Pink', hex: '#F8B500', bg: 'linear-gradient(135deg, #F8B500, #F59E0B)' },
  { name: 'Cyan', hex: '#74B9FF', bg: 'linear-gradient(135deg, #74B9FF, #0984E3)' },
];

function App() {
  const [view, setView] = useState('learn');
  const [letters, setLetters] = useState([]);
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const { darkMode, toggleTheme, username } = useTheme();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [lettersRes, quizRes] = await Promise.all([
        axios.get('http://localhost:5000/api/letters'),
        axios.get('http://localhost:5000/api/quiz/random/5')
      ]);
      setLetters(lettersRes.data);
      // Add colors to quiz questions
      const quizWithColors = quizRes.data.map((q, idx) => ({
        ...q,
        color: BALL_COLORS[idx % BALL_COLORS.length],
        wrongColors: BALL_COLORS.filter((_, i) => i !== idx % BALL_COLORS.length).slice(0, 2)
      }));
      setQuizQuestions(quizWithColors);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.8;
    utterance.pitch = 1.2;
    window.speechSynthesis.speak(utterance);
  };

  if (loading) return <div className={`loading ${darkMode ? 'dark' : ''}`}>✨ Loading...</div>;

  return (
    <div className={`app ${darkMode ? 'dark' : ''}`}>
      <BackgroundShapes />
      
      <header className="header glass">
        <div className="header-top">
          <h1>🔮 Alphabet Learning</h1>
          <div className="controls">
            <span className="username">👤 {username}</span>
            <button className="theme-toggle" onClick={toggleTheme}>
              {darkMode ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
        
        <nav className="nav-tabs">
          <button className={view === 'learn' ? 'active' : ''} onClick={() => setView('learn')}>
            📚 Learn
          </button>
          <button className={view === 'quiz' ? 'active' : ''} onClick={() => setView('quiz')}>
            🎯 Quiz
          </button>
          <button className={view === 'progress' ? 'active' : ''} onClick={() => setView('progress')}>
            📊 Progress
          </button>
        </nav>
      </header>

      <main className="main-content">
        {view === 'learn' && (
          <LearnView 
            letters={letters} 
            currentIndex={currentIndex} 
            setCurrentIndex={setCurrentIndex}
            speak={speak}
          />
        )}
        {view === 'quiz' && (
          <QuizView 
            initialQuestions={quizQuestions} 
            username={username} 
            onRefresh={setQuizQuestions}
          />
        )}
        {view === 'progress' && <ProgressView username={username} />}
      </main>
    </div>
  );
}

const BackgroundShapes = () => (
  <div className="bg-shapes">
    <div className="shape"></div>
    <div className="shape"></div>
    <div className="shape"></div>
    <div className="shape"></div>
  </div>
);

const LearnView = ({ letters, currentIndex, setCurrentIndex, speak }) => {
  const current = letters[currentIndex];
  const currentColor = BALL_COLORS[currentIndex % BALL_COLORS.length];

  return (
    <>
      <div className="progress-bar glass">
        <div className="progress-fill" style={{ width: `${((currentIndex + 1) / letters.length) * 100}%` }}></div>
        <span>Letter {currentIndex + 1} of {letters.length}</span>
      </div>

      <div className="card-container glass">
        <div className="letter-card">
          {/* Color Ball instead of Image */}
          <div className="ball-container">
            <div 
              className="color-ball bounce"
              style={{ background: currentColor.bg }}
            >
              <span className="ball-letter">{current.letter}</span>
            </div>
            <div className="color-name">{currentColor.name} Ball</div>
          </div>
          
          <div className="letter-info">
            <h2>"{current.letter_name}"</h2>
            <div className="info-grid">
              <div className="info-card glass">
                <span className="label">Word</span>
                <span className="value">{current.example_word}</span>
              </div>
              <div className="info-card glass">
                <span className="label">Sound</span>
                <span className="value">{current.pronunciation}</span>
              </div>
            </div>
          </div>
          
          <button 
            className="speak-btn glass"
            onClick={() => speak(`${current.letter}... ${current.letter} as in ${current.example_word}`)}
          >
            🔊 Listen
          </button>
        </div>

        <div className="navigation">
          <button 
            onClick={() => setCurrentIndex(prev => (prev - 1 + letters.length) % letters.length)} 
            className="nav-btn glass"
          >
            ← Previous
          </button>
          <button 
            onClick={() => setCurrentIndex(prev => (prev + 1) % letters.length)} 
            className="nav-btn primary glass"
          >
            Next →
          </button>
        </div>
      </div>

      <div className="alphabet-grid glass">
        {letters.map((letter, idx) => (
          <button
            key={letter.id}
            className={`grid-letter ${idx === currentIndex ? 'active' : ''}`}
            onClick={() => setCurrentIndex(idx)}
            title={letter.example_word}
            style={{ 
              background: idx === currentIndex ? BALL_COLORS[idx % BALL_COLORS.length].bg : undefined 
            }}
          >
            {letter.letter}
          </button>
        ))}
      </div>
    </>
  );
};

// Quiz with Color Balls - NO IMAGES!
const QuizView = ({ initialQuestions, username, onRefresh }) => {
  const [quiz, setQuiz] = useState(initialQuestions);
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [quizComplete, setQuizComplete] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const restartQuiz = async () => {
    setIsRefreshing(true);
    try {
      const response = await axios.get('http://localhost:5000/api/quiz/random/5');
      // Add colors to new questions
      const quizWithColors = response.data.map((q, idx) => ({
        ...q,
        color: BALL_COLORS[idx % BALL_COLORS.length],
        wrongColors: BALL_COLORS.filter((_, i) => i !== idx % BALL_COLORS.length).slice(0, 2)
      }));
      setQuiz(quizWithColors);
      onRefresh(quizWithColors);
      setCurrentQ(0);
      setScore(0);
      setQuizComplete(false);
      setSelected(null);
    } catch (error) {
      console.error('Quiz refresh error:', error);
    }
    setIsRefreshing(false);
  };

  const handleAnswer = async (answer) => {
    if (selected !== null) return;
    
    setSelected(answer);
    const correct = answer === quiz[currentQ].correct_answer;
    
    if (correct) {
      setScore(score + 10);
    }

    axios.post('http://localhost:5000/api/progress', {
      username,
      letter_id: quiz[currentQ].letter_id,
      learned: correct,
      score: correct ? 10 : 0
    }).catch(err => console.error('Save error:', err));

    setTimeout(() => {
      if (currentQ < quiz.length - 1) {
        setCurrentQ(currentQ + 1);
        setSelected(null);
      } else {
        setQuizComplete(true);
      }
    }, 1500);
  };

  if (isRefreshing) {
    return (
      <div className="quiz-skeleton glass">
        <div className="skeleton-ball"></div>
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton-options">
          <div className="skeleton skeleton-option"></div>
          <div className="skeleton skeleton-option"></div>
          <div className="skeleton skeleton-option"></div>
        </div>
      </div>
    );
  }
  
  if (quizComplete) {
    return (
      <div className="quiz-complete glass">
        <h2>🎉 Quiz Complete!</h2>
        <div className="score-display">{score} / {quiz.length * 10} points</div>
        <button onClick={restartQuiz} className="nav-btn primary glass">
          Try Again
        </button>
      </div>
    );
  }

  const question = quiz[currentQ];
  // Mix correct and wrong colors
  const allOptions = [question.color, ...question.wrongColors].sort(() => Math.random() - 0.5);

  return (
    <div className="quiz-container">
      <div className="quiz-header">
        <span>Question {currentQ + 1} of {quiz.length}</span>
        <span>Score: {score}</span>
      </div>

      <div className="quiz-card glass">
        {/* Big Color Ball Question */}
        <div className="quiz-ball-question">
          <div 
            className="big-color-ball"
            style={{ background: question.color.bg }}
          >
            <span className="big-ball-text">?</span>
          </div>
          <p className="match-text">Which letter matches this {question.color.name} ball?</p>
        </div>
        
        <h3>{question.question_text}</h3>
        
        {/* Color-coded options */}
        <div className="quiz-options color-match">
          {question.options.map((opt, idx) => {
            const color = allOptions[idx % allOptions.length];
            return (
              <button
                key={idx}
                className={`quiz-option color-option glass ${
                  selected !== null 
                    ? opt === question.correct_answer 
                      ? 'correct' 
                      : opt === selected 
                        ? 'wrong' 
                        : ''
                    : ''
                }`}
                onClick={() => handleAnswer(opt)}
                disabled={selected !== null}
                style={{ 
                  borderColor: color.hex,
                  background: selected !== null && opt === question.correct_answer 
                    ? color.bg 
                    : undefined
                }}
              >
                <span 
                  className="color-dot" 
                  style={{ background: color.bg }}
                ></span>
                <span className="opt-letter">{opt}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const ProgressView = ({ username }) => {
  const [stats, setStats] = useState(null);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchProgress = useCallback(async () => {
    try {
      const [statsRes, progressRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/progress/${username}/stats`),
        axios.get(`http://localhost:5000/api/progress/${username}`)
      ]);
      setStats(statsRes.data);
      setProgress(progressRes.data);
      setLoading(false);
    } catch (error) {
      console.error('Progress error:', error);
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  if (loading) {
    return (
      <div className="progress-skeleton">
        <div className="skeleton-stats">
          {[1,2,3,4].map(i => <div key={i} className="skeleton skeleton-stat"></div>)}
        </div>
      </div>
    );
  }

  return (
    <div className="progress-view">
      <div className="stats-grid">
        <div className="stat-card glass">
          <div className="stat-icon">📚</div>
          <div className="stat-value">{stats?.total_attempts || 0}</div>
          <div className="stat-label">Total Attempts</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon">✅</div>
          <div className="stat-value">{stats?.letters_learned || 0}</div>
          <div className="stat-label">Letters Learned</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon">⭐</div>
          <div className="stat-value">{stats?.total_score || 0}</div>
          <div className="stat-label">Total Score</div>
        </div>
        <div className="stat-card glass">
          <div className="stat-icon">🎯</div>
          <div className="stat-value">{Math.round(stats?.average_score || 0)}%</div>
          <div className="stat-label">Average</div>
        </div>
      </div>

      <h3 className="section-title">Recent Activity</h3>
      <div className="activity-list">
        {progress.length === 0 ? (
          <div className="empty-state glass">No activity yet. Start learning! 🚀</div>
        ) : (
          progress.slice(0, 10).map((item, idx) => (
            <div key={idx} className="activity-item glass">
              <div 
                className="activity-letter"
                style={{ background: BALL_COLORS[idx % BALL_COLORS.length].bg }}
              >
                {item.letter}
              </div>
              <div className="activity-details">
                <span className="word">{item.example_word}</span>
                <span className="meta">
                  {item.learned ? '✅ Learned' : '❌ Practice'} • Score: {item.score}
                </span>
              </div>
              <div className="activity-date">
                {new Date(item.last_practiced).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const AppWithTheme = () => (
  <ThemeProvider>
    <App />
  </ThemeProvider>
);

export default AppWithTheme;