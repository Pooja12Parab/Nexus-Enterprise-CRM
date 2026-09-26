@echo off
set E2E_BYPASS_AUTH=1
set NEXT_PUBLIC_E2E_BYPASS_AUTH=1
call npm run dev
