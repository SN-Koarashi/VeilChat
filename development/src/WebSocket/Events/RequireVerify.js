"use strict";

import { passwordVerify } from "../../ChatUtils.js";

export default function RegisterEvent(data) {
    passwordVerify(data.location);
}