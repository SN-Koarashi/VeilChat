@echo off
title Veil WebChat Server [Debug]
echo     Started at %date% %time%
echo  Veil WebSocket WebChat Server Side Worker
echo -----------------------------------------------
node ./src/server.js --debug
pause