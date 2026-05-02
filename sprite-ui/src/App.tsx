import React, { useState } from 'react';
import SpriteSheetUI from './SpriteSheetUI';
import { AuthProvider, useAuth } from './auth';
import { LoginModal, AccountModal, type AccountTab } from './LoginRegister';

function TopBar({
  onOpenAuth,
  onOpenCabinet,
  onOpenSubscription,
}: {
  onOpenAuth: () => void;
  onOpenCabinet: () => void;
  onOpenSubscription: () => void;
}) {
  const { user, loading } = useAuth();
  return (
    <div className="w-full flex items-center justify-between px-6 py-3 bg-[#0b0e13] border-b border-white/10 fixed top-0 left-0 z-40">
      <div className="text-white font-semibold">SpriteGen</div>
      <div className="flex items-center gap-3">
        {!loading && user ? (
          <>
            <div className="text-white/80 text-sm">Привет, {user.name}</div>
            <button onClick={onOpenSubscription} className="chip">
              Подписка
            </button>
            <button onClick={onOpenCabinet} className="chip">
              Личный кабинет
            </button>
          </>
        ) : (
          <button onClick={onOpenAuth} className="chip">
            Войти / Регистрация
          </button>
        )}
      </div>
    </div>
  );
}

function AppInner() {
  const [showAuth, setShowAuth] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [accountTab, setAccountTab] = useState<AccountTab>("history");

  return (
    <div className="pt-14">
      <TopBar
        onOpenAuth={() => setShowAuth(true)}
        onOpenSubscription={() => { setAccountTab("subscription"); setShowAccount(true); }}
        onOpenCabinet={() => { setAccountTab("history"); setShowAccount(true); }}
      />
      <div className="max-w-[1600px] mx-auto h-[calc(100vh-56px)] overflow-hidden">
        <div className="p-4 h-full">
          <SpriteSheetUI />
</div>
      </div>
      {showAuth && <LoginModal onClose={() => setShowAuth(false)} />}
      {showAccount && <AccountModal initialTab={accountTab} onClose={() => setShowAccount(false)} />}
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
