@echo off
echo ============================================
echo  VendorBridge ERP - Project Setup
echo ============================================

echo.
echo [1/4] Installing Frontend dependencies...
cd client
call npm install
echo Frontend dependencies installed!

echo.
echo [2/4] Installing Backend dependencies...
cd ..\server
call npm install
echo Backend dependencies installed!

echo.
echo [3/4] Setup complete!
echo.
echo Next steps:
echo   1. Copy client\.env.example to client\.env and fill in your values
echo   2. Copy server\.env.example to server\.env and fill in your values
echo   3. Run the Supabase SQL schema from docs\schema.sql in your Supabase dashboard
echo   4. Start backend:   cd server ^&^& npm run dev
echo   5. Start frontend:  cd client ^&^& npm run dev
echo.
pause
