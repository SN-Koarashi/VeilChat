"use strict";

import Dialog from '../../../functions/dialog.js';
import { isMobile } from '../../../utils/util.js';
import { passwordVerify } from '../../../utils/chatUtil.js';

export default function RegisterEvent(data) {
    let toast = "密碼錯誤";
    if (isMobile())
        Dialog.toastMessage(toast, 'close', 'red');
    else
        Dialog.error(toast);
    passwordVerify(data.location);
}