"use strict";

import config from '../../config.js';
import { onMessage } from '../../Utils/ChatUtils.js';

export default function RegisterEvent(data) {
    onMessage(data.type,
        "private",
        data.source.signature,
        config.clientList[data.source.signature]?.at(0).username,
        data.message_id,
        data.message,
        new Date().getTime()
    );
}