@echo off
setlocal
title Mega 12 - Gerador Automatico de APK

if not defined JAVA_HOME (
    if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
        set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
    )
)

pushd "%~dp0android_app" || goto missing_project
echo Gerando APKs Debug e Release...
call gradlew.bat :app:assembleDebug :app:assembleRelease --console=plain
set "build_exit=%ERRORLEVEL%"
if not "%build_exit%"=="0" goto failed

if not exist "app\build\outputs\apk\debug\app-debug.apk" goto missing_apk
if not exist "app\build\outputs\apk\release\app-release.apk" goto missing_apk

echo.
echo APKs gerados com sucesso.
echo Release: "%CD%\app\build\outputs\apk\release\app-release.apk"
echo Debug:   "%CD%\app\build\outputs\apk\debug\app-debug.apk"
goto finish

:missing_apk
set "build_exit=1"
1>&2 echo O Gradle terminou, mas faltou pelo menos um dos APKs esperados.
goto finish

:failed
1>&2 echo Falha ao gerar os APKs. Consulte o erro do Gradle acima.

:finish
popd
goto exit_script

:missing_project
set "build_exit=1"
1>&2 echo Pasta android_app indisponivel.

:exit_script
if /i not "%~1"=="--no-pause" pause
exit /b %build_exit%
