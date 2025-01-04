"use strict";

import $ from 'jquery';
import config from '../../config.js';
import { crc32 } from '../../Utils.js';

export default function RegisterEvent(data) {
    var downList = [];

    $('.userWrapper #dropdown.down').each(function () {
        let downId = $(this).parent().attr('id');

        if (downList.indexOf(downId) === -1)
            downList.push(downId);
    });

    $('.userWrapper').empty();


    var uList = data.user;
    config.clientList = Object.assign({}, uList);

    // 使用者數量(Token)
    var userCount = Object.keys(config.clientList).length;
    $('.userList > .userTitle > span').text(userCount);
    $('.userList > .userTitle > span').addClass('display');

    for (let u in uList) {
        uList[u].forEach(e => {
            if ($('.userWrapper').find(`#${u}`).length == 0)
                $('.userWrapper').append(`<div title="${e.username}#${crc32(u)}" id="${u}" data-ripple>`);

            if ($('.userWrapper').find(`#${u} #username`).length == 0) {
                $('.userWrapper').find(`#${u}`).append(`<div id="username"><author></author><pid></pid></div>`);
                $('.userWrapper').find(`#${u}`).append(`<div id="sessionList"></div>`);
                $('.userWrapper').find(`#${u}`).append(`<div id="dropdown"><div></div></div>`);
            }

            $('.userWrapper').find(`#${u} #username author`).text(`${e.username}`);
            $('.userWrapper').find(`#${u} #username pid`).text(`#${crc32(u)}`);
            $('.userWrapper').find(`#${u} #sessionList`).append(`<span id="session" data-id="${e.session}">${e.id}</span>`);

            if (downList.indexOf(u) !== -1) {
                $('.userWrapper').find(`#${u} #dropdown`).addClass('down');
                $('.userWrapper').find(`#${u} #sessionList`).show();
            }
        });
    }

    // 顯示多個工作階段
    $('.userWrapper > div').each(function () {
        let k = 0;
        let length = $(this).find('span').length;

        $(this).find('span').each(function () {
            k++;
            if (k == length) {
                $(this).addClass('last');
            }
        });
    });

    $('.lobby > .chat').find(`author[data-self-id="${crc32(config.tokenHashSelf)}"]`).addClass('sameWorker');
    $('.userWrapper').find(`#session[data-id="${config.sessionSelf}"]`).addClass('me');
}