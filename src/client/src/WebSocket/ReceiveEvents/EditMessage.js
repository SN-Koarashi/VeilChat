"use strict";

import $ from 'jquery';
import { getPlainMessage } from '../../Utils/Utils.js';
import { executeFormattedMessage } from '../../Utils/ChatUtils.js';

export default async function RegisterEvent(data) {
    const $messageElement = $('.lobby > .chat > div[data-message-id]').filter(function () {
        return data.message_id === $(this).attr('data-message-id');
    });

    var message = await getPlainMessage(data.message);

    var $messageWrapper = $messageElement.find('.msgWrapper');
    $messageWrapper.text(message);
    $messageElement.find('span.tips.edited').attr('title', new Date(data.edited_timestamp).toLocaleString());

    executeFormattedMessage($messageWrapper.toArray().at(0));
}