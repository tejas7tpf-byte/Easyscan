@echo off
color 0A
title EasyScan - Automatic GitHub Push (tejas7tpf-byte)
echo ========================================================
echo    EASYSCAN GITHUB PUSH SCRIPT (tejas7tpf-byte)
echo ========================================================
echo.

cd /d "%~dp0"

:: Auto-set Git identity credentials so commit never fails
git config --global user.name "tejas7tpf-byte"
git config --global user.email "tejas1.tpf@gmail.com"

:: Check if git repository is initialized
if not exist ".git" (
    echo [!] Initializing Git Repository...
    git init
    git branch -M main
    echo.
)

:: Ensure remote origin is set to tejas7tpf-byte/Easyscan.git
git remote | find "origin" >nul 2>&1
if %errorlevel% neq 0 (
    git remote add origin https://github.com/tejas7tpf-byte/Easyscan.git
)

echo [1/3] Adding changes...
git add .

echo [2/3] Committing changes...
git commit -m "Auto Update EasyScan %date% %time:~0,5%" >nul 2>&1

echo.
echo [3/3] Pushing to GitHub (tejas7tpf-byte)...
git push -u origin main

echo.
if %errorlevel% equ 0 (
    echo ========================================================
    echo    GITHUB PUSH SUCCESSFUL! ✅
    echo ========================================================
) else (
    echo.
    echo Cleaning old cache and opening GitHub Login...
    cmdkey /delete:git:https://github.com >nul 2>&1
    git credential-manager logout https://github.com >nul 2>&1
    echo.
    git push -u origin main
)
echo.
pause
