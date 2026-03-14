@echo off
cd /d "%~dp0"
if not exist "server-sample\node_modules" (
  echo Installing demo server deps...
  pushd server-sample && call npm.cmd i && if not exist ".env" copy .env.example .env && popd
)
start "AUTH SERVER (DEMO)" cmd /k "cd /d %~dp0server-sample && npm.cmd run dev"
timeout /t 2 >nul
if not exist "sprite-ui\node_modules" (
  echo Installing frontend deps...
  pushd sprite-ui && call npm.cmd i && popd
)
start "FRONTEND (HTTP MODE)" cmd /k "cd /d %~dp0sprite-ui && set VITE_BACKEND=http && set VITE_API_BASE=http://localhost:4000 && npm.cmd run dev"
echo Open http://localhost:5173
