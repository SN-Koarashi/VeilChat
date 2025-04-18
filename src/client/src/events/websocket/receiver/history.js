"use strict";

import { onScroll, onMessage } from "../../../utils/chatUtil.js";

export default function RegisterEvent(data) {
    let index = 0;
    data.messages.forEach(e => {
        if (e != null) {
            index++;
            setTimeout(() => {
                onMessage(data.type,
                    e.session,
                    e.signature,
                    e.username,
                    e.message_id,
                    e.message,
                    e.time,
                    e
                );
                onScroll(true);
            }, 1 * index);
        }
    });
}