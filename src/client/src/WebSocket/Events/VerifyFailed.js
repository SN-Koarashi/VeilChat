"use strict";

import Dialog from '../../Dialog.js';
import { isMobile } from '../../Utils';
import { passwordVerify } from '../../ChatUtils.js';

export default function RegisterEvent(data) {
    let toast = "密碼錯誤";
    if (isMobile())
        Dialog.toastMessage(toast, 'close', 'red');
    else
        Dialog.error(toast);
    passwordVerify(data.location);
}