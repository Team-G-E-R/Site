import React, { useState } from 'react';
import SpriteSheetUI from './SpriteSheetUI';
import { AuthProvider, useAuth } from './auth';
import { LoginModal, Cabinet } from './LoginRegister';

function TopBar({ onOpenAuth, onOpenCabinet }: { onOpenAuth: () => void; onOpenCabinet: () => void }) {
  const { user, loading } = useAuth();
  return (
    <div className="w-full flex items-center justify-between px-6 py-3 bg-[#0b0e13] border-b border-white/10 fixed top-0 left-0 z-40">
      <div className="text-white font-semibold">SpriteGen</div>
      <div className="flex items-center gap-3">
        {!loading && user ? (
          <>
            <div className="text-white/80 text-sm">Привет, {user.name}</div>
            <button onClick={onOpenCabinet} className="chip">Кабинет</button>
          </>
        ) : (
          <button onClick={onOpenAuth} className="chip">Войти / Регистрация</button>
        )}
      </div>
    </div>
  );
}

function AppInner() {
  const [showAuth, setShowAuth] = useState(false);
  const [showCabinet, setShowCabinet] = useState(false);

  return (
    <div className="pt-14">
      <TopBar onOpenAuth={() => setShowAuth(true)} onOpenCabinet={() => setShowCabinet((v) => !v)} />

      <div className="max-w-[1600px] mx-auto">
        <div className="p-6 md:p-10">
          <SpriteSheetUI />
          {showCabinet && (
            <div className="mt-8">
              <Cabinet />
            </div>
          )}
        </div>
      </div>

      {showAuth && <LoginModal onClose={() => setShowAuth(false)} />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}
