"use strict";

import { passwordVerify } from "../../Utils/ChatUtils.js";

export default function RegisterEvent(data) {
    passwordVerify(data.location);
}