"use strict";

import $ from 'jquery';
import config from '../../config.js';
import Dialog from '../../Functions/Dialog.js';
import { crc32, isMobile } from '../../Utils/Utils.js';
import { privateChat, cancelPrivateMode } from '../../Utils/ChatUtils.js';
import { hashString } from '../../Functions/Crypto.js';
import { WebSocketBinaryHandler } from '../../Registers/WebSocket.js';

export default function RegisterEvent(data) {
    const tempLocate = config.locate;
    config.locate = data.location;
    config.sessionSelf = data.session;
    config.messageList = {};

    cancelPrivateMode();

    // 無狀態參數，表示為加入房間
    if (!data.status) {
        config.tokenHashSelf = data.signature;
        $('.settings_footer span').text(config.sessionSelf);
        $('#userTokenId').text(`#${crc32(config.tokenHashSelf)}`);

        let channelName = (config.locate == "public") ? "#大廳" : (data.isReserved) ? "#房間 " + config.locate : "#私聊 " + config.locate;

        $('.lobby > .chat').empty();
        $('.lobby > .chat').append(`<div data-id="system" data-ripple>目前位置為 ${channelName}</div>`);
        $('.channelName').text(channelName);
        $('.headerTitle').text(channelName);
        $('.textPlaceholder').text(`傳訊息到 ${channelName}`);
        //document.title = channelName + " | XCoreNET 匿名聊天室 - 天夜之心";
        //document.title = channelName + " | EEACC - 端對端加密之社群匿名聊天系統";
        document.title = channelName + " | Veil Chat";

        if (data.isReserved || config.locate === "public" || !data.publicKeyBase64) {
            config.roomPublicKeyBase64 = undefined;
            config.roomPrivateKeyBase64 = undefined;
        }
        else {
            config.roomPublicKeyBase64 = data.publicKeyBase64;
            config.roomPrivateKeyBase64 = data.creatorPrivateKeyBase64;
        }


        if (config.locate == "public") {
            if (config.isInited || window.location.pathname !== "/")
                window.history.pushState(null, document.title, "/");
        }
        else {
            window.history.pushState(null, document.title, '/p/' + config.locate);
            let toast = "加入成功";
            if (isMobile())
                Dialog.toastMessage(toast, 'done', 'green');
            else
                Dialog.success(toast);

            if (!data.isReserved) {
                $('.lobby > .chat').append(`<div data-id="system" data-ripple>臨時私聊房間位置及其所有訊息會在所有使用者離開後60秒自動銷毀</div>`);

                if (config.roomPassword && config.roomPrivateKeyBase64 && config.roomPublicKeyBase64) {
                    $('.lobby > .chat').append(`<div data-id="system" data-ripple>具有密碼之私聊房間的訊息將受到端對端加密保護</div>`);
                }
            }
        }
    }
    // 有狀態參數，表示私人房間建立狀態回傳
    else {
        if (data.status == "private_failed") {
            config.locate = "public";
            let toast = data.message;
            if (isMobile())
                Dialog.toastMessage(toast, 'close', 'red');
            else
                Dialog.error(toast);

        }
        else if (config.inviteList.length > 0) {
            config.inviteList.forEach(s => {
                privateChat(s, `[invite]${config.locate}[/invite]`, tempLocate);
            });

            config.inviteList = [];
        }

        hashString(config.roomPassword).then(pwd => {
            WebSocketBinaryHandler({
                type: 'login',
                token: config.token,
                username: config.userName,
                location: config.locate,
                password: pwd
            });
        });
    }

    if (config.locate === 'public') {
        $('#publicChat').hide();
    }
    else {
        $('#publicChat').show();
    }


    config.localStorage.setItem('lastRoom', config.locate);
    config.isInited = true;
}