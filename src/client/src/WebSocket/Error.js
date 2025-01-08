"use strict";

import Logger from '../Functions/Logger.js';

export default function RegisterEvent() {
    Logger.show(Logger.Types.LOG, '[WebSocketHandler]', { type: "init", reason: "server occurred error" });
}