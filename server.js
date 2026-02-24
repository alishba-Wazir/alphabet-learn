const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.json());

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'alphabet_learning',
  password: '123456789',  // CHANGE THIS!
  port: 5432,
});

// ========== LETTERS API ==========

// Get all letters with images
app.get('/api/letters', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM letters ORDER BY id');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single letter
app.get('/api/letters/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM letters WHERE id = $1', [id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== QUIZ API ==========

// Get quiz questions for a letter
app.get('/api/quiz/:letterId', async (req, res) => {
  try {
    const { letterId } = req.params;
    const result = await pool.query(
      'SELECT * FROM quiz_questions WHERE letter_id = $1',
      [letterId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get random quiz (5 questions)
app.get('/api/quiz/random/:count', async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 5;
    const result = await pool.query(
      'SELECT q.*, l.letter, l.example_word, l.image_url FROM quiz_questions q JOIN letters l ON q.letter_id = l.id ORDER BY RANDOM() LIMIT $1',
      [count]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== PROGRESS API ==========

// Get user progress
app.get('/api/progress/:username', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(`
      SELECT p.*, l.letter, l.example_word 
      FROM user_progress p 
      JOIN letters l ON p.letter_id = l.id 
      WHERE p.username = $1
      ORDER BY p.last_practiced DESC
    `, [username]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user stats
app.get('/api/progress/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_attempts,
        SUM(CASE WHEN learned THEN 1 ELSE 0 END) as letters_learned,
        SUM(score) as total_score,
        AVG(score) as average_score
      FROM user_progress 
      WHERE username = $1
    `, [username]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save progress
app.post('/api/progress', async (req, res) => {
  try {
    const { username, letter_id, learned, score } = req.body;
    
    // Check if record exists
    const existing = await pool.query(
      'SELECT * FROM user_progress WHERE username = $1 AND letter_id = $2',
      [username, letter_id]
    );
    
    let result;
    if (existing.rows.length > 0) {
      // Update existing
      result = await pool.query(`
        UPDATE user_progress 
        SET learned = $3, 
            score = GREATEST(score, $4),
            practice_count = practice_count + 1,
            last_practiced = CURRENT_TIMESTAMP
        WHERE username = $1 AND letter_id = $2
        RETURNING *
      `, [username, letter_id, learned, score]);
    } else {
      // Insert new
      result = await pool.query(`
        INSERT INTO user_progress (username, letter_id, learned, score, practice_count, last_practiced)
        VALUES ($1, $2, $3, $4, 1, CURRENT_TIMESTAMP)
        RETURNING *
      `, [username, letter_id, learned, score]);
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ========== DARK MODE PREFERENCE ==========

app.get('/api/users/:username/theme', async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(
      'SELECT dark_mode FROM user_preferences WHERE username = $1',
      [username]
    );
    res.json({ darkMode: result.rows[0]?.dark_mode || false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users/:username/theme', async (req, res) => {
  try {
    const { username } = req.params;
    const { darkMode } = req.body;
    
    await pool.query(`
      INSERT INTO user_preferences (username, dark_mode)
      VALUES ($1, $2)
      ON CONFLICT (username) 
      DO UPDATE SET dark_mode = $2
    `, [username, darkMode]);
    
    res.json({ success: true, darkMode });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create user_preferences table if not exists
pool.query(`
  CREATE TABLE IF NOT EXISTS user_preferences (
    username VARCHAR(50) PRIMARY KEY,
    dark_mode BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).catch(err => console.log('Table might exist:', err.message));

const PORT = 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));