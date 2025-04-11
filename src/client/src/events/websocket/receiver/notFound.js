"use strict";

import config from '../../../config.js';
import Dialog from '../../../functions/dialog.js'
import { isMobile } from '../../../utils/util.js';
import { WebSocketBinaryHandler } from '../../../registers/websocket.js';

export default function RegisterEvent(data) {
    let toast = "#房間 " + data.location + " 已不存在";
    if (isMobile())
        Dialog.toastMessage(toast, 'close', 'red');
    else
        Dialog.error(toast);

    if (!data.previous.location) {
        WebSocketBinaryHandler({
            type: 'login',
            token: config.token,
            username: config.userName,
            location: "public"
        });
    }
}