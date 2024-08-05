@echo off
title XCoreNET WebChat Server [Debug]
echo     Started at %date% %time%
echo  XCoreNET WebSocket WebChat Server Side Worker
echo -----------------------------------------------
node server.js --debug
pause