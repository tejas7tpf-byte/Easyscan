@echo off
color 0A
title EasyScan Enterprise - LAN Server Launcher

echo ========================================================
echo        EASYSCAN ENTERPRISE WMS - LAN LAUNCHER
echo ========================================================
echo.
echo Starting Vite Server with LAN Network Access (--host)...
echo.

:: Get Local IP Address
echo ========================================================
echo YOUR LAN IP ADDRESS FOR OTHER PCs / TABLETS / MOBILES:
echo ========================================================
for /f "tokens=1-2 delims=:" %%a in ('ipconfig ^| find "IPv4"') do (
    echo.
    echo   👉 http://%%b:5173
    echo.
)
echo (Make sure port 5173 is allowed in Windows Firewall if needed)
echo ========================================================
echo.
echo Press CTRL+C at any time to stop the server.
echo.

:: Run Vite with host flag
call npm run dev -- --host
