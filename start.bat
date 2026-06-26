@echo off
cd /d "%~dp0"

set "NODE_DIR=%TEMP%\node22\node-v22.18.0-win-x64"
set "NODE_EXE=%NODE_DIR%\node.exe"
set "NPM_CLI=%NODE_DIR%\node_modules\npm\bin\npm-cli.js"

if not exist "%NODE_EXE%" (
    echo Descargando Node.js 22.18.0...
    powershell -Command "Invoke-WebRequest 'https://nodejs.org/dist/v22.18.0/node-v22.18.0-win-x64.zip' -OutFile '%TEMP%\node-v22.18.0.zip'" >nul 2>&1
    powershell -Command "Expand-Archive '%TEMP%\node-v22.18.0.zip' '%TEMP%\node22' -Force" >nul 2>&1
    echo Listo.
)

echo Verificando Node.js...
"%NODE_EXE%" --version
echo.

set "PATH=%NODE_DIR%;%PATH%"

if not exist node_modules (
    echo Instalando dependencias...
    call "%NODE_EXE%" "%NPM_CLI%" install --legacy-peer-deps
    if %ERRORLEVEL% NEQ 0 (
        echo ERROR: npm install fallo.
        pause
        exit /b 1
    )
)

echo Iniciando chatbot CEE-FIIS-UNI...
call "%NODE_EXE%" --env-file=.env.local node_modules\tsx\dist\cli.mjs src\app.ts
pause
