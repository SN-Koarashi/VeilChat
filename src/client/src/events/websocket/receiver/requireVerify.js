"use strict";

import { passwordVerify } from "../../../utils/chatUtil.js";

export default function RegisterEvent(data) {
    passwordVerify(data.location);
}