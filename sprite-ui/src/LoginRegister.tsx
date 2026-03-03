import React, { useMemo, useState } from 'react';
import { useAuth } from './auth';
import { apiListUsers, getBackendMode, getApiBase } from './api';

export function LoginModal({ onClose }: { onClose: () => void }) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setError(null);
    setLoading(true);
    try {
      if (tab === 'login') await login(email, password);
      else await register(email, password, name);
      onClose();
    } catch (e: any) {
      setError(e?.message || 'Ошибка');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="w-full max-w-md bg-[#0f131a] border border-white/10 rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.6)]">
        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab('login')} className={'chip ' + (tab === 'login' ? 'active' : '')}>Вход</button>
          <button onClick={() => setTab('register')} className={'chip ' + (tab === 'register' ? 'active' : '')}>Регистрация</button>
        </div>

        {tab === 'register' && (
          <div className="mb-3">
            <div className="text-sm text-white/70 mb-1">Имя</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder:text-white/60 focus:border-pink-500/70"
              placeholder="Как к вам обращаться"
            />
          </div>
        )}

        <div className="mb-3">
          <div className="text-sm text-white/70 mb-1">Email</div>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder:text-white/60 focus:border-pink-500/70"
            placeholder="you@example.com"
          />
        </div>

        <div className="mb-4">
          <div className="text-sm text-white/70 mb-1">Пароль</div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-[#0b0e13] border border-white/20 rounded-lg px-3 py-2 outline-none text-white placeholder:text-white/60 focus:border-pink-500/70"
            placeholder="Не короче 6 символов"
          />
        </div>

        {error && <div className="text-red-400 text-sm mb-2">{error}</div>}

        <div className="flex gap-2">
          <button onClick={submit} disabled={loading} className="h-11 px-4 rounded-xl bg-pink-600/80 hover:bg-pink-500 transition">
            {loading ? 'Подождите...' : 'Продолжить'}
          </button>
          <button onClick={onClose} className="h-11 px-4 rounded-xl bg-white/15 hover:bg-white/25 transition text-white/90">Отмена</button>
        </div>

        <div className="mt-4 text-xs text-white/50">
          Backend mode: <span className="text-white/80">{getBackendMode()}</span>
          {getBackendMode() === 'http' && (
            <> · API: <span className="text-white/80">{getApiBase()}</span></>
          )}
        </div>
      </div>
    </div>
  );
}

export function Cabinet() {
  const { user, logout } = useAuth();
  const [users, setUsers] = useState<{ email: string; name: string }[] | null>(null);

  const mode = useMemo(() => getBackendMode(), []);

  const load = async () => {
    try {
      const list = await apiListUsers();
      setUsers(list.map(u => ({ email: u.email, name: u.name })));
    } catch {
      setUsers([]);
    }
  };

  if (!user) return null;

  return (
    <div className="bg-[#0f131a] rounded-2xl p-6 border border-white/5 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset,0_10px_30px_rgba(0,0,0,0.6)]">
      <div className="text-white/80 text-lg mb-4">Личный кабинет</div>

      <div className="text-white/70">Имя: <span className="text-white">{user.name}</span></div>
      <div className="text-white/70">Email: <span className="text-white">{user.email}</span></div>
      <div className="text-white/70">Создан: <span className="text-white">{new Date(user.createdAt).toLocaleString()}</span></div>

      <div className="mt-4 flex items-center gap-2">
        <button onClick={logout} className="chip">Выйти</button>
        {mode === 'mock' && <button onClick={load} className="chip">Dev: users</button>}
      </div>

      {mode === 'mock' && users && (
        <div className="mt-4 text-sm text-white/70">
          <div className="text-white/80 mb-2">Mock users:</div>
          <div className="space-y-1">
            {users.length === 0 ? <div className="text-white/50">пусто</div> : users.map((u, i) => (
              <div key={i} className="flex justify-between gap-4">
                <span className="text-white/80">{u.name}</span>
                <span className="text-white/50">{u.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
