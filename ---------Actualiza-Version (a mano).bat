@echo off
cd /d "C:\repositorio-donado"
echo =====================================
echo HACIENDO DEPLOY...
echo =====================================
firebase deploy --only hosting --project donado-2

echo =====================================
echo LISTO!
echo =====================================
pause
