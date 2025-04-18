"use strict";

import config from '../../../config.js';
import Logger from '../../../functions/logger.js';
import { onScroll } from '../../../utils/chatUtil.js';
import { isMobile } from '../../../utils/util.js';
import { WebSocketBinaryHandler } from '../../../registers/websocket.js';

export default function RegisterEvent() {
    Logger.show(Logger.Types.LOG, '[WebSocketHandler]', { type: "init", reason: "server connected" });
    // let toast = "與伺服器連線成功";
    // if (isMobile())
    //     Dialog.toastMessage(toast, 'signal_cellular_alt', 'green');
    // else
    //     Dialog.success(toast);

    let joinLocation = location.pathname.replace(/\/$/, '').split('/').at(-1);
    if (isMobile() && config.localStorage.getItem('lastRoom') && location.pathname.match(/^\/p\/([0-9A-Za-z\-_]+)/ig) === null) {
        joinLocation = config.localStorage.getItem('lastRoom');
    }

    WebSocketBinaryHandler({
        type: 'login',
        token: config.token,
        username: config.userName,
        location: joinLocation
    });

    onScroll(false);
}