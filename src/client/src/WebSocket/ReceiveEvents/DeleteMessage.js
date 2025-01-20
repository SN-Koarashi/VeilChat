"use strict";

import $ from 'jquery';
import config from '../../config.js';

export default async function RegisterEvent(data) {
    const $messageElement = $('.lobby > .chat > div[data-message-id]').filter(function () {
        return data.message_id === $(this).attr('data-message-id');
    });

    $messageElement.remove();
    delete config.messageList[data.message_id];
}