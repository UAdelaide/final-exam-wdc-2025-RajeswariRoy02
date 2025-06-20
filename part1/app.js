var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var apiModule = require('./routes/api');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
let db;

(async () => {
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
    });
await connection.query('CREATE DATABASE IF NOT EXISTS DoggyWalky');
await connection.end();
const db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DoggyWalky'
  });
await db.execute(`
    CREATE TABLE IF NOT EXISTS Users (
      user_id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      role ENUM('owner', 'walker') NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
await db.execute(`
    CREATE TABLE IF NOT EXISTS Dogs (
      dog_id INT AUTO_INCREMENT PRIMARY KEY,
      owner_id INT NOT NULL,
      name VARCHAR(50) NOT NULL,
      size ENUM('small', 'medium', 'large') NOT NULL,
      FOREIGN KEY (owner_id) REFERENCES Users(user_id)
    )
  `);
await db.execute(`
    CREATE TABLE IF NOT EXISTS WalkRequests (
      request_id INT AUTO_INCREMENT PRIMARY KEY,
      dog_id INT NOT NULL,
      requested_time DATETIME NOT NULL,
      duration_minutes INT NOT NULL,
      location VARCHAR(255) NOT NULL,
      status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
    )
  `);
await db.execute(`
    CREATE TABLE IF NOT EXISTS WalkRatings (
      rating_id INT AUTO_INCREMENT PRIMARY KEY,
      request_id INT NOT NULL,
      walker_id INT NOT NULL,
      owner_id INT NOT NULL,
      rating INT CHECK (rating BETWEEN 1 AND 5),
      comments TEXT,
      rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
      FOREIGN KEY (walker_id) REFERENCES Users(user_id),
      FOREIGN KEY (owner_id) REFERENCES Users(user_id)
    )
  `);
const [[userCount]] = await db.execute('SELECT COUNT(*) AS count FROM Users');
if (userCount.count === 0) {
    await db.execute(`
      INSERT INTO Users (username, email, password_hash, role) VALUES
        ('alice123', 'alice@example.com', 'hashed123', 'owner'),
        ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
        ('carol123', 'carol@example.com', 'hashed789', 'owner'),
        ('roy12', 'roy@example.com', 'hashed987', 'walker'),
        ('edward34', 'cullen@example.com', 'hashed321', 'owner')
    `);
    await db.execute(`
        INSERT INTO Dogs (owner_id, name, size) VALUES
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Max', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Bella', 'small'),
        ((SELECT user_id FROM Users WHERE username = 'alice123'), 'Vulu', 'large'),
        ((SELECT user_id FROM Users WHERE username = 'carol123'), 'Tommy', 'medium'),
        ((SELECT user_id FROM Users WHERE username = 'edward34'), 'Butter', 'small');
        `)
    await db.execute(`
        INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
        ((SELECT dog_id FROM Dogs WHERE name = 'Max'), '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Bella'), '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Vulu'), '2025-06-11 07:15:00', 60, 'Henley Beach', 'open'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Tommy'), '2025-06-11 16:00:00', 20, 'Glenelg Jetty', 'cancelled'),
        ((SELECT dog_id FROM Dogs WHERE name = 'Butter'), '2025-06-12 10:30:00', 40, 'Adelaide Botanic Garden', 'completed');
        `);
    }
} catch (err) {
  console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
}
})();
app.get('/api/dogs', async (req, res) => {
    try {
      const [dogs] = await db.execute(`
        SELECT d.name AS dog_name, d.size, u.username AS owner_username
        FROM Dogs d
        JOIN Users u ON d.owner_id = u.user_id
      `);
      res.json(dogs);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch dogs' });
    }
  });
app.get('/api/walkrequests/open', async (req, res) => {
    try {
      const [walkRequests] = await db.execute(`
        SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
        FROM WalkRequests wr
        JOIN Dogs d ON wr.dog_id = d.dog_id
        JOIN Users u ON d.owner_id = u.user_id
        WHERE wr.status = 'open'
      `);
      res.json(walkRequests);
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch open walk requests' });
    }
  });
app.get('/api/walkers/summary', async (req, res) => {
    try {
      const [summary] = await db.execute(`
        SELECT
          u.username AS walker_username,
          COUNT(r.rating_id) AS total_ratings,
          ROUND(AVG(r.rating), 1) AS average_rating,
          COALESCE((
            SELECT COUNT(*)
            FROM WalkRequests wr
            JOIN WalkApplications wa ON wr.request_id = wa.request_id
            WHERE wr.status = 'completed' AND wa.status = 'accepted' AND wa.walker_id = u.user_id
          ), 0) AS completed_walks
        FROM Users u
        LEFT JOIN WalkRatings r ON r.walker_id = u.user_id
        WHERE u.role = 'walker'
        GROUP BY u.username
    `);
    res.json(summary)
module.exports = app;