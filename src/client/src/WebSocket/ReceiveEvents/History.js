"use strict";

import { onScroll } from "../../Utils/ChatUtils";
import { onMessage } from "../../Utils/ChatUtils";

export default function RegisterEvent(data) {
    let index = 0;
    data.messages.forEach(e => {
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
    });
}