import { Me } from './types';

type StoredUser = Me & { passwordHash: string };

const LS_USERS = "mock_users_v1";
const LS_SESSION = "mock_session_v1";

function loadUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(LS_USERS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as StoredUser[]) : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(LS_USERS, JSON.stringify(users));
}

function getSessionUserId(): string | null {
  return localStorage.getItem(LS_SESSION);
}

function setSessionUserId(id: string | null) {
  if (!id) localStorage.removeItem(LS_SESSION);
  else localStorage.setItem(LS_SESSION, id);
}

async function sha256(text: string): Promise<string> {
  const enc = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function normEmail(email: string) {
  return email.trim().toLowerCase();
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

export function createMockAuthApi() {
  return {
    async register(email: string, password: string, name: string): Promise<Me> {
      email = normEmail(email);
      name = name.trim();

      if (!email || !password || !name) throw new Error("Заполни все поля");
      if (password.length < 6) throw new Error("Пароль минимум 6 символов");

      const users = loadUsers();
      if (users.some((u) => normEmail(u.email) === email)) {
        throw new Error("Пользователь уже существует");
      }

      const passwordHash = await sha256(password);
      const user: StoredUser = {
        id: uid(),
        email,
        name,
        createdAt: new Date().toISOString(),
        passwordHash,
      };

      users.push(user);
      saveUsers(users);
      setSessionUserId(user.id);

      const { passwordHash: _ph, ...publicUser } = user;
      return publicUser;
    },

    async login(email: string, password: string): Promise<Me> {
      email = normEmail(email);
      if (!email || !password) throw new Error("Заполни email и пароль");

      const users = loadUsers();
      const user = users.find((u) => normEmail(u.email) === email);
      if (!user) throw new Error("Неверные логин или пароль");

      const passwordHash = await sha256(password);
      if (passwordHash !== user.passwordHash) throw new Error("Неверные логин или пароль");

      setSessionUserId(user.id);

      const { passwordHash: _ph, ...publicUser } = user;
      return publicUser;
    },

    async logout(): Promise<void> {
      setSessionUserId(null);
    },

    async me(): Promise<Me | null> {
      const id = getSessionUserId();
      if (!id) return null;

      const users = loadUsers();
      const user = users.find((u) => u.id === id);
      if (!user) {
        setSessionUserId(null);
        return null;
      }

      const { passwordHash: _ph, ...publicUser } = user;
      return publicUser;
    },

    async listUsers(): Promise<Me[]> {
      return loadUsers().map(({ passwordHash: _ph, ...u }) => u);
    },
  };
}
