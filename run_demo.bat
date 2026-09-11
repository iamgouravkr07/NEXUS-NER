@echo off
REM ==============================================================================
REM NEXUS-NER -- UNIFIED SIH 2026 DEMO LAUNCHER (Windows Batch Wrapper)
REM ==============================================================================
powershell.exe -ExecutionPolicy Bypass -NoProfile -File "%~dp0run_demo.ps1" %*
