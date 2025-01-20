"use strict";

import $ from 'jquery';
import config from '../../config.js';
import { getPlainMessage } from '../../Utils/Utils.js';
import { executeFormattedMessage } from '../../Utils/ChatUtils.js';

export default async function RegisterEvent(data) {
    const $messageElement = $('.lobby > .chat > div[data-message-id]').filter(function () {
        return data.message_id === $(this).attr('data-message-id');
    });

    var message = await getPlainMessage(data.message);

    var $messageWrapper = $messageElement.find('.msgWrapper');
    $messageWrapper.text(message);

    var $editStatusElement = $messageElement.find('span.tips.edited');
    if ($editStatusElement.length > 0) {
        $messageElement.find('span.tips.edited').attr('title', new Date(data.edited_timestamp).toLocaleString());
    }
    else {
        $messageElement.find('.msgWrapper').before(`<span class="tips edited" title="${new Date(data.edited_timestamp).toLocaleString()}">(已編輯)</span>`);
    }

    executeFormattedMessage($messageWrapper.toArray().at(0));

    config.messageList[data.message_id].message = message;
}