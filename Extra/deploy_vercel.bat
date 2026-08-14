@echo off
echo =======================================
echo    EASYSCAN VERCEL DEPLOY SCRIPT
echo =======================================
echo.

:: Set working directory to script location
cd /d "%~dp0"

echo Checking for Vercel CLI...
call vercel --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Vercel CLI is not installed! 
    echo Installing Vercel CLI globally via npm...
    call npm i -g vercel
)

echo.
echo [1/1] Deploying to Vercel (Production)...
call vercel --prod

echo.
if %errorlevel% equ 0 (
    echo =======================================
    echo    VERCEL DEPLOYMENT SUCCESSFUL! ✅
    echo =======================================
) else (
    echo =======================================
    echo    ERROR: Failed to deploy to Vercel. ❌
    echo =======================================
)
pause
