@echo off
setlocal enabledelayedexpansion
echo =======================================
echo    EASYSCAN GITHUB PUSH SCRIPT
echo =======================================
echo.

:: Set working directory to script location
cd /d "%~dp0"

:: Check if git repository is initialized
if not exist ".git" (
    echo [!] Git repository not initialized. Initializing now...
    git init
    echo.
)

:: Check if remote origin exists
git remote | find "origin" >nul 2>&1
if !errorlevel! neq 0 (
    echo [!] No GitHub repository linked.
    set /p repoUrl="Enter your GitHub Repository URL (e.g. https://github.com/username/repo.git): "
    if not "!repoUrl!"=="" (
        git remote add origin !repoUrl!
        git branch -M main
    ) else (
        echo ERROR: Repository URL is required for the first push!
        pause
        exit /b
    )
    echo.
)

echo [1/3] Adding changes to Git...
git add .

echo.
set /p commitMsg="Enter commit message (or press enter for default): "
if "!commitMsg!"=="" set commitMsg=Update EasyScan System !date!

echo [2/3] Committing changes...
git commit -m "!commitMsg!"

echo.
echo [3/3] Pushing to GitHub...
git push -u origin main

echo.
if !errorlevel! equ 0 (
    echo =======================================
    echo    GITHUB PUSH SUCCESSFUL! ✅
    echo =======================================
) else (
    echo =======================================
    echo    ERROR: Failed to push to GitHub. ❌
    echo    (Please check your internet or repository permissions)
    echo =======================================
)
pause
