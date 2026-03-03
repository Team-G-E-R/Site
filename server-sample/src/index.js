const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { findByEmail, createUser } = require('./db');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

app.use(express.json());
app.use(cookieParser());
app.use(cors({ origin: true, credentials: true })); // dev-friendly

function signToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token;
  if (!token) return res.status(401).send('Unauthorized');
  try { req.user = jwt.verify(token, JWT_SECRET); return next(); }
  catch { return res.status(401).send('Unauthorized'); }
}

app.get('/', (_req, res) => {
  res.type('text').send('SpriteGen demo auth server. Try GET /api/ping');
});

app.get('/api/ping', (_req, res) => res.json({ ok: true }));

app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body || {};
  if (!email || !password || !name) return res.status(400).send('Missing fields');
  if (String(password).length < 6) return res.status(400).send('Пароль слишком короткий (мин. 6 символов)');
  if (findByEmail(email)) return res.status(409).send('Пользователь уже существует');

  const hash = await bcrypt.hash(String(password), 10);
  const user = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 8),
    email: String(email),
    name: String(name),
    password_hash: hash,
    createdAt: new Date().toISOString()
  };
  createUser(user);

  const token = signToken({ sub: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*3600*1000 });
  res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).send('Missing fields');
  const user = findByEmail(email);
  if (!user) return res.status(401).send('Неверные логин или пароль');
  const ok = await bcrypt.compare(String(password), user.password_hash);
  if (!ok) return res.status(401).send('Неверные логин или пароль');

  const token = signToken({ sub: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
  res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: false, maxAge: 7*24*3600*1000 });
  res.json({ id: user.id, email: user.email, name: user.name, createdAt: user.createdAt });
});

app.post('/api/auth/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  const { sub, email, name, createdAt } = req.user;
  res.json({ id: sub, email, name, createdAt: createdAt || new Date(0).toISOString() });
});

app.listen(PORT, () => console.log('Demo auth server listening on http://localhost:' + PORT));
