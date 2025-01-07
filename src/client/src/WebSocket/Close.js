"use strict";

import Logger from '../Logger.js';
import Dialog from '../Dialog.js'
import { onScroll } from '../ChatUtils.js';
import { isMobile } from '../Utils.js';
import { WebSocketConnect } from '../WebSocketRegister.js';

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