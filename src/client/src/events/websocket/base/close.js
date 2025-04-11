"use strict";

import config from '../../../config.js';
import Logger from '../../../functions/logger.js';
import Dialog from '../../../functions/dialog.js'
import { onScroll } from '../../../utils/chatUtil.js';
import { isMobile } from '../../../utils/util.js';
import { WebSocketConnect } from '../../../registers/websocket.js';

export default function RegisterEvent(e) {
    Logger.show(Logger.Types.LOG, '[WebSocketHandler]', { type: "init", reason: "server disconnected" });
    onScroll(false);
    let toast = "與伺服器連線失敗: " + e.code;

    if (e.code === 4003) {
        config.denyCount++;
    }

    if (isMobile())
        Dialog.toastMessage(toast, 'close', 'red', function () {
            WebSocketConnect();
        });
    else
        Dialog.error(toast, function () {
            WebSocketConnect();
        });
}