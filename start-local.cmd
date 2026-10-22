@echo off
cd /d "%~dp0"
where npm >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 24 LTS from https://nodejs.org and open this file again.
  pause
  exit /b 1
)
call npm run local
if errorlevel 1 pause
