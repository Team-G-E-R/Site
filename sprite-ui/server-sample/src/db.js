const fs = require('fs');
const path = require('path');
const DB_FILE = path.join(__dirname, '..', 'data', 'users.json');

function readDB() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); }
  catch { return { users: [] }; }
}

function writeDB(db) { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2)); }

function findByEmail(email) {
  const db = readDB();
  return db.users.find(u => u.email.toLowerCase() === String(email).toLowerCase()) || null;
}

function createUser(user) {
  const db = readDB();
  db.users.push(user);
  writeDB(db);
  return user;
}

module.exports = { readDB, findByEmail, createUser };
