@echo off
color 0A
title EasyScan - Auto Fix GitHub Account
echo ========================================================
echo   AUTOMATICALLY SWITCHING GITHUB TO tejas7tpf-byte
echo ========================================================
echo.

echo Deleting old saved credentials (skcolourfulcreationsbuyin-lgtm)...
cmdkey /delete:git:https://github.com >nul 2>&1
git credential-manager logout https://github.com >nul 2>&1

echo Setting active account to tejas7tpf-byte...
git config --global user.name "tejas7tpf-byte"
git config --global user.email "tejas1.tpf@gmail.com"

echo.
echo ✅ Done! Now running Push Script automatically...
echo ========================================================
echo.

cd /d "%~dp0"
call push_github.bat
