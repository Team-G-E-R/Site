@echo off
cd /d "%~dp0"
if not exist "sprite-ui\node_modules" (
  echo Installing frontend deps...
  pushd sprite-ui && call npm.cmd i && popd
)
start "FRONTEND" cmd /k "cd /d %~dp0sprite-ui && npm.cmd run dev"
echo Open http://localhost:5173
