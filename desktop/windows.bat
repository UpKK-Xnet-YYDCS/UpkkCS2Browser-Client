@echo off
setlocal

cd /d "%~dp0"

where pwsh.exe >nul 2>&1
if errorlevel 1 (
    set "POWERSHELL=powershell.exe"
) else (
    set "POWERSHELL=pwsh.exe"
)

echo Building the Windows desktop application...
"%POWERSHELL%" -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0build-windows.ps1" %*
set "BUILD_EXIT_CODE=%ERRORLEVEL%"

if not "%BUILD_EXIT_CODE%"=="0" (
    echo.
    echo Windows desktop build failed with exit code %BUILD_EXIT_CODE%.
)

exit /b %BUILD_EXIT_CODE%
