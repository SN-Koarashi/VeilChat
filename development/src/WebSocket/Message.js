"use strict";

import Logger from '../Logger.js';

import eProfile from './Events/Profile.js';
import eVerified from './Events/Verified.js';
import eHistory from './Events/History.js';
import eMessage from './Events/Message.js';
import ePrivateMessage from './Events/PrivateMessage.js';
import eForbidden from './Events/Forbidden.js';
import eVerifyFailed from './Events/VerifyFailed.js';
import eRequireVerify from './Events/RequireVerify.js';
import eNotFound from './Events/NotFound.js';

export default function RegisterEvent(e) {
    var uint8View = new Uint8Array(e.data);
    var enc = new TextDecoder("utf-8");
    var arr = uint8View;
    for (let i = 0; i < arr.length; i++)
        arr[i] ^= 5026;

    const data = JSON.parse(enc.decode(arr));
    Logger.show(Logger.Types.LOG, "[WebSocketHandler]", data);

    // 目前房間的使用者列表
    if (data.type == 'profile') {
        eProfile(data);
    }
    // 使用者資訊驗證完成，可加入房間
    else if (data.type == 'verified') {
        eVerified(data);
    }
    // 聊天訊息歷史紀錄
    else if (data.type == 'history') {
        eHistory(data);
    }
    // 傳送訊息
    else if (data.type == 'message') {
        eMessage(data);
    }
    // 傳送悄悄話訊息
    else if (data.type == 'privateMessage') {
        ePrivateMessage(data);
    }
    // 伺服器禁止連線
    else if (data.type == 'forbidden') {
        eForbidden(data);
    }
    // 房間密碼認證失敗
    else if (data.type == 'verifyFailed') {
        eVerifyFailed(data);
    }
    // 進入房間需要密碼認證
    else if (data.type == 'requireVerify') {
        eRequireVerify(data);
    }
    // 進入的房間不存在
    else if (data.type == 'notFound') {
        eNotFound(data);
    }
    // 未知/未定義的事件類型
    else {
        Logger.show(Logger.Types.WARN, 'Unknown type', data.type);
    }
}