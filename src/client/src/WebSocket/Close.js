"use strict";

import Logger from '../Functions/Logger.js';
import Dialog from '../Functions/Dialog.js'
import { onScroll } from '../Utils/ChatUtils.js';
import { isMobile } from '../Utils/Utils.js';
import { WebSocketConnect } from '../Registers/WebSocket.js';

export default function RegisterEvent(e) {
    Logger.show(Logger.Types.LOG, '[WebSocketHandler]', { type: "init", reason: "server disconnected" });
    onScroll(false);
    let toast = "與伺服器連線失敗: " + e.code;

    if (isMobile())
        Dialog.toastMessage(toast, 'close', 'red', function () {
            WebSocketConnect();
        });
    else
        Dialog.error(toast, function () {
            WebSocketConnect();
        });
}