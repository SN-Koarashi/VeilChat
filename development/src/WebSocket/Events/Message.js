"use strict";

import config from '../../config.js';
import { onMessage } from '../../ChatUtils.js';

export default function RegisterEvent(data) {
    onMessage(data.type,
        data.session,
        data.signature,
        config.clientList[data.signature]?.at(0).username,
        config.clientList[data.signature]?.at(0).id, data.message,
        new Date().getTime()
    );
}