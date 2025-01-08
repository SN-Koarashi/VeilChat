"use strict";

import Dialog from '../../Functions/Dialog.js';
import { isMobile } from '../../Utils/Utils.js';
import { passwordVerify } from '../../Utils/ChatUtils.js';

export default function RegisterEvent(data) {
    let toast = "密碼錯誤";
    if (isMobile())
        Dialog.toastMessage(toast, 'close', 'red');
    else
        Dialog.error(toast);
    passwordVerify(data.location);
}