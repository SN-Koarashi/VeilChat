"use strict";

import $ from 'jquery';
import config from '../../config.js';
import { WebSocketBinaryHandler } from '../../WebSocketRegister.js';

export default function RegisterEvent(data) {
    $('.lobby > .chat').append(`<div data-id="system">伺服器拒絕您的連線: ${data.message}</div>`);

    if (config.locate != "public") {
        WebSocketBinaryHandler({
            type: 'login',
            token: config.token,
            username: config.userName,
            location: 'public',
        });
    }

    config.denyCount++;
}