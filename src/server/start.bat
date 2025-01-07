@echo off
title Veil WebChat Server
echo     Started at %date% %time%
echo  Veil WebSocket WebChat Server Side Worker
echo -----------------------------------------------
node ./src/server.js
pause