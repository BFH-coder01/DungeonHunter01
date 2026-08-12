@echo off
setlocal EnableExtensions

rem DungeonHunter01 server controller for Windows.
rem Usage: server.bat start ^| stop ^| restart ^| status

cd /d "%~dp0"

if not defined PORT set "PORT=8080"
set "ACTION=%~1"

if not defined ACTION goto menu
if /I "%ACTION%"=="start" goto start
if /I "%ACTION%"=="stop" goto stop
if /I "%ACTION%"=="restart" goto restart
if /I "%ACTION%"=="status" goto status
goto usage

:menu
echo.
echo DungeonHunter01 server - port %PORT%
echo.
echo   1. Start
echo   2. Stop
echo   3. Restart
echo   4. Status
echo   5. Exit
echo.
choice /C 12345 /N /M "Choose an option: "
if errorlevel 5 exit /b 0
if errorlevel 4 goto status_menu
if errorlevel 3 goto restart_menu
if errorlevel 2 goto stop_menu
goto start_menu

:start
call :is_running
if not errorlevel 1 (
  echo DungeonHunter01 is already running on http://localhost:%PORT%/.
  exit /b 0
)

where node.exe >nul 2>&1
if errorlevel 1 (
  echo ERROR: Node.js was not found in PATH.
  echo Install Node.js 20 or newer, then try again.
  exit /b 1
)

if not exist "node_modules\ws\package.json" (
  echo Dependencies are missing. Running npm install...
  call npm install
  if errorlevel 1 (
    echo ERROR: npm install failed.
    exit /b 1
  )
)

echo Starting DungeonHunter01 on port %PORT%...
start "DungeonHunter01 Server" /MIN node.exe src\server\index.js 1>>"server.stdout.log" 2>>"server.stderr.log"
if errorlevel 1 (
  echo ERROR: The server process could not be started.
  exit /b 1
)

for /L %%I in (1,1,10) do (
  call :is_running
  if not errorlevel 1 (
    echo Server started successfully.
    echo Player: http://localhost:%PORT%/
    echo DM:     http://localhost:%PORT%/dm.html
    exit /b 0
  )
  powershell.exe -NoProfile -Command "Start-Sleep -Milliseconds 500" >nul
)

echo ERROR: The server did not begin listening on port %PORT%.
echo See server.stderr.log for details.
exit /b 1

:stop
call :find_listener
if errorlevel 1 (
  echo DungeonHunter01 is already stopped on port %PORT%.
  exit /b 0
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -Command ^
  "$p=Get-Process -Id %SERVER_PID% -ErrorAction SilentlyContinue; if (-not $p) { exit 0 }; if ($p.ProcessName -notin @('node','nodejs')) { Write-Host ('ERROR: Port %PORT% belongs to ' + $p.ProcessName + ' (PID %SERVER_PID%), not Node.js. Refusing to stop it.'); exit 2 }; Stop-Process -Id %SERVER_PID% -ErrorAction Stop; Wait-Process -Id %SERVER_PID% -ErrorAction SilentlyContinue"
if errorlevel 1 exit /b 1

echo Server stopped.
exit /b 0

:restart
call :stop
if errorlevel 1 exit /b 1
call :start
exit /b %ERRORLEVEL%

:status
call :find_listener
if errorlevel 1 (
  echo DungeonHunter01 is stopped on port %PORT%.
  exit /b 1
)
powershell.exe -NoProfile -Command "$p=Get-Process -Id %SERVER_PID% -ErrorAction SilentlyContinue; Write-Host ('Listening on http://localhost:%PORT%/ - ' + $p.ProcessName + ' PID %SERVER_PID%')"
exit /b 0

:is_running
call :find_listener
exit /b %ERRORLEVEL%

:find_listener
set "SERVER_PID="
for /F "tokens=5" %%P in ('netstat -ano -p tcp ^| findstr /R /C:":%PORT% .*LISTENING"') do if not defined SERVER_PID set "SERVER_PID=%%P"
if defined SERVER_PID exit /b 0
exit /b 1

:start_menu
call :start
pause
goto menu

:stop_menu
call :stop
pause
goto menu

:restart_menu
call :restart
pause
goto menu

:status_menu
call :status
pause
goto menu

:usage
echo Usage: %~nx0 start ^| stop ^| restart ^| status
exit /b 1
