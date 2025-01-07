"use strict";

import { onScroll } from "../../ChatUtils";
import { onMessage } from "../../ChatUtils";

export default function RegisterEvent(data) {
    let index = 0;
    data.messages.forEach(e => {
        index++;
        setTimeout(() => {
            onMessage(data.type,
                e.session,
                e.signature,
                e.username,
                e.id,
                e.message,
                e.time
            );
            onScroll(true);
        }, 1 * index);
    });
}