"use strict";
import $ from 'jquery';
import config from '../config';
import { copyTextToClipboard } from '../Utils/Utils';
// import config from '../config.js';

export default function RegisterEvent() {
    function checkBoundary(element, x, y) {
        const rect = element.getBoundingClientRect(); // 獲取浮動視窗的邊界矩形
        const windowWidth = window.innerWidth; // 瀏覽器窗口的寬度
        const windowHeight = window.innerHeight; // 瀏覽器窗口的高度

        // 初始化調整的 x 和 y
        let adjustedX = x;
        let adjustedY = y;

        // 檢查是否超出邊界並計算調整量
        if (rect.right > windowWidth) {
            adjustedX -= (rect.right - windowWidth + 15); // 超出右邊界，減去超出部分
        }
        if (rect.bottom > windowHeight) {
            adjustedY -= (rect.bottom - windowHeight + 15); // 超出下邊界，減去超出部分
        }
        if (rect.left < 0) {
            adjustedX += rect.left; // 超出左邊界，增加左邊的距離
        }
        if (rect.top < 0) {
            adjustedY += rect.top; // 超出上邊界，增加上邊的距離
        }

        return { x: adjustedX, y: adjustedY }; // 返回調整後的 x 和 y
    }


    $('body').on('contextmenu', '.lobby > .chat > div[data-id]', function (e) {
        e.preventDefault();
        const message_id = $(e.currentTarget).attr('data-message-id');

        $('div.contextmenu_wrapper').remove();
        $('body').append('<div class="contextmenu_wrapper"></div>');

        const x = e.clientX;
        const y = e.clientY;

        $('div.contextmenu_wrapper').append(`<div class="contextmenu" data-message-id="${message_id}" style="--click-x:${x}px;--click-y:${y}px"></div>`);

        $('div.contextmenu_wrapper > .contextmenu').append(`<div data-id="copyMessage">複製訊息</div>`);

        if (config.messageList[message_id].author === config.tokenHashSelf) {
            $('div.contextmenu_wrapper > .contextmenu').append(`<div data-id="editMessage">編輯訊息</div>`);
            $('div.contextmenu_wrapper > .contextmenu').append(`<hr/>`);
            $('div.contextmenu_wrapper > .contextmenu').append(`<div data-id="deleteMessage">刪除訊息</div>`);
        }

        const fixingPosition = checkBoundary(document.querySelector('div.contextmenu_wrapper > .contextmenu'), x, y);
        $('div.contextmenu_wrapper > .contextmenu').attr('style', `--click-x:${fixingPosition.x}px;--click-y:${fixingPosition.y}px`);
    });


    $('body').on('click contextmenu', '.contextmenu_wrapper', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('div.contextmenu_wrapper').remove();
    });


    $('body').on('click', '.contextmenu_wrapper > .contextmenu > div', function (e) {
        e.stopPropagation();
        $('div.contextmenu_wrapper').remove();

        const message_id = $(this).parent().attr('data-message-id');
        const action = $(this).attr('data-id');

        if (config.messageList[message_id] == null) return;



        if (action === "copyMessage") {
            copyTextToClipboard(config.messageList[message_id].message);
        }
        else if (action === "editMessage" && config.messageList[message_id].author === config.tokenHashSelf) {
            config.editMessageTarget = message_id;
            config.lastRange = null;

            $('.privateStatus').remove();
            $('.lobby').append('<div class="privateStatus"><div class="privateText">編輯訊息 <span></span></div><div title="關閉訊息編輯模式" class="privateButton"><img src="' + config.MainDomain + '/images/close_black.png" /></div></div>');
            $('.lobby > .privateStatus > .privateText > span').text(`${message_id}`);

            $('#sender').text(config.messageList[message_id].message);
            $('#sender').focus();


            // 獲取當前的範圍
            const range = document.createRange();
            const selection = window.getSelection();

            // 清空當前選擇
            selection.removeAllRanges();

            // 設定範圍為內容的結尾
            range.selectNodeContents(document.querySelector('#sender'));
            range.collapse(false); // false 代表光標移到末尾

            // 將範圍添加到選擇中
            selection.addRange(range);
        }
        else if (action === "deleteMessage" && config.messageList[message_id].author === config.tokenHashSelf) {
            console.log();
        }
    });
}