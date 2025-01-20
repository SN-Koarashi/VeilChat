"use strict";

import config from '../../config.js';
import { onMessage } from '../../Utils/ChatUtils.js';

export default function RegisterEvent(data) {
    onMessage(data.type,
        data.session,
        data.signature,
        config.clientList[data.signature]?.at(0).username,
        data.message_id,
        data.message,
        new Date().getTime()
    );
}