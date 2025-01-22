"use strict";
import $ from 'jquery';
import config from '../config';
import { copyTextToClipboard, isMobile } from '../Utils/Utils.js';
import Dialog from '../Functions/Dialog.js';
import { WebSocketBinaryHandler } from '../Registers/WebSocket';

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

    var triggerElement = {};

    $('#sender').on('keydown', function (e) {
        // 手機版不套用快捷鍵
        if (!isMobile() && window.innerWidth > 480) {
            if (e.which === 38) {
                const $userMessageElements = $('.lobby > .chat > div[data-message-id]').filter(function () {
                    return $(this).find('author').attr('data-user') === config.tokenHashSelf;
                });

                if ($userMessageElements.length > 0) {
                    triggerElement["main"] = $userMessageElements.last().get(0);

                    editMessage($userMessageElements.last().attr("data-message-id"));

                    triggerElement = {};
                }
            }
        }
    });

    $('body').on('contextmenu', function (e) {
        // 手機版不顯示原生選單 (輸入框除外)
        if (isMobile() || window.innerWidth <= 480) {
            const sender = document.querySelector('#sender');
            if (e.target !== sender && $(e.target).parents('#sender')[0] !== sender) {
                e.preventDefault();
            }
        }
    });

    $('body').on('contextmenu', '.lobby > .chat > div[data-id]', function (e) {
        e.preventDefault();
        const message_id = $(e.currentTarget).attr('data-message-id');

        if ($(e.currentTarget).attr('data-id') === 'system' || config.messageList[message_id] == null) return;

        // 初始化設定
        triggerElement["main"] = e.currentTarget;
        $('.lobby > .chat > div[data-id].focus').removeClass('focus');
        $(e.currentTarget).addClass('focus');
        $('body').addClass('noOverflow');

        $('div.contextmenu_wrapper').remove();
        $('body').append('<div class="contextmenu_wrapper"></div>');

        // 隱藏加號選單
        $(".additional").hide();
        $(".messageBox").removeClass("unhidden");

        // 隱藏表情符號選單
        $(".emoji-window").hide();

        const x = e.clientX;
        const y = e.clientY;

        $('div.contextmenu_wrapper').append(`<div class="contextmenu" data-message-id="${message_id}" style="--click-x:${x}px;--click-y:${y}px"></div>`);

        if (window.getSelection()?.toString().length > 0) {
            $('div.contextmenu_wrapper > .contextmenu').append(`<div class="no-icon" data-icon="Ctrl+C" data-id="copy">複製</div>`);
            $('div.contextmenu_wrapper > .contextmenu').append(`<hr/>`);
        }

        $('div.contextmenu_wrapper > .contextmenu').append(`<div data-icon="content_copy" data-id="copyMessage">複製訊息</div>`);

        if (!config.messageList[message_id].type.startsWith("privateMessage") && config.messageList[message_id].author === config.tokenHashSelf) {
            $('div.contextmenu_wrapper > .contextmenu').append(`<div data-icon="edit" data-id="editMessage">編輯訊息</div>`);
            $('div.contextmenu_wrapper > .contextmenu').append(`<hr/>`);
            $('div.contextmenu_wrapper > .contextmenu').append(`<div data-icon="delete" data-id="deleteMessage" data-danger>刪除訊息</div>`);
        }

        if (e.target.nodeName === "IMG" && window.getComputedStyle(e.target).userSelect !== "none") {
            triggerElement["IMG"] = e.target;

            $('div.contextmenu_wrapper > .contextmenu').append(`<hr/>`);

            if (triggerElement["IMG"].src && isImage(triggerElement["IMG"].src)) {
                $('div.contextmenu_wrapper > .contextmenu').append(`<div class="no-icon" data-id="copyImage">複製圖片</div>`);
            }
            $('div.contextmenu_wrapper > .contextmenu').append(`<div class="no-icon" data-id="saveImage">儲存圖片</div>`);
        }

        if (e.target.nodeName === "A" || e.target?.parentNode.nodeName === "A") {
            triggerElement["A"] = (e.target.nodeName === "A") ? e.target : e.target?.parentNode;

            $('div.contextmenu_wrapper > .contextmenu').append(`<hr/>`);
            $('div.contextmenu_wrapper > .contextmenu').append(`<div class="no-icon" data-id="copyLink">複製連結</div>`);
            $('div.contextmenu_wrapper > .contextmenu').append(`<div class="no-icon" data-id="openLink">開啟連結</div>`);
        }

        const fixingPosition = checkBoundary(document.querySelector('div.contextmenu_wrapper > .contextmenu'), x, y);
        $('div.contextmenu_wrapper > .contextmenu').attr('style', `--click-x:${fixingPosition.x}px;--click-y:${fixingPosition.y}px`);
    });


    $('body').on('contextmenu', '.contextmenu_wrapper > .contextmenu', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    $('body').on('click contextmenu', '.contextmenu_wrapper', function (e) {
        e.preventDefault();
        e.stopPropagation();
        $('div.contextmenu_wrapper').remove();
        $('.lobby > .chat > div[data-id].focus').removeClass('focus');
        $('body').removeClass('noOverflow');
    });


    $('body').on('click', '.contextmenu_wrapper > .contextmenu > div', async function (e) {
        e.stopPropagation();
        $('div.contextmenu_wrapper').remove();
        $('.lobby > .chat > div[data-id].focus').removeClass('focus');
        $('body').removeClass('noOverflow');

        const message_id = $(this).parent().attr('data-message-id');
        const action = $(this).attr('data-id');

        if (config.messageList[message_id] == null) return;


        if (action === "copy") {
            copyTextToClipboard(window.getSelection()?.toString());
        }
        else if (action === "copyMessage") {
            copyTextToClipboard(config.messageList[message_id].message);
        }
        else if (action === "copyLink" && triggerElement["A"] != null) {
            copyTextToClipboard(triggerElement["A"].href);
        }
        else if (action === "openLink" && triggerElement["A"] != null) {
            window.open(triggerElement["A"].href);
        }
        else if (action === "copyImage" && triggerElement["IMG"]?.src && isImage(triggerElement["IMG"].src)) {
            const mimeType = getImageType(triggerElement["IMG"].src);
            const response = await fetch(triggerElement["IMG"].src);
            const blob = await response.blob();

            const item = new ClipboardItem({ [mimeType]: blob });

            await navigator.clipboard.write([item]);
        }
        else if (action === "saveImage" && triggerElement["IMG"]?.src) {
            const filename = new URL(triggerElement["IMG"].src).pathname.split('/').pop();

            const link = document.createElement('a');
            link.href = triggerElement["IMG"].src;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
        else if (
            action === "editMessage"
            && config.messageList[message_id].author === config.tokenHashSelf
            && !config.messageList[message_id].type.startsWith("privateMessage")
        ) {
            editMessage(message_id);
        }
        else if (
            action === "deleteMessage"
            && config.messageList[message_id].author === config.tokenHashSelf
            && !config.messageList[message_id].type.startsWith("privateMessage")
        ) {
            if (e.shiftKey) {
                deleteMessage(message_id);
            }
            else {
                Dialog.confirm("確定要刪除此訊息嗎？", function () {
                    deleteMessage(message_id);
                });
            }
        }

        triggerElement = {};
    });

    function editMessage(message_id) {
        const element = Object.assign({}, triggerElement);
        config.editMessageTarget = message_id;
        config.lastRange = null;

        if (config.messageList[message_id] == null || message_id == null) return;

        $('.privateStatus').remove();
        $('.lobby').append('<div class="privateStatus"><div class="privateText">編輯訊息 <span></span></div><div title="關閉訊息編輯模式" class="privateButton"><img src="' + config.MainDomain + '/images/close_black.png" /></div></div>');
        $('.lobby > .privateStatus > .privateText > span').text(`${message_id}`);

        $('#sender').text(config.messageList[message_id].message);
        $('#sender').focus();

        $(element?.main).addClass("focus");
        setTimeout(() => {
            if (!isElementInViewport(element?.main)) {
                element?.main.scrollIntoView({ behavior: 'instant', block: 'start' });
            }

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
        }, 10);
    }

    function deleteMessage(message_id) {
        WebSocketBinaryHandler({
            type: 'deleteMessage',
            message_id: message_id,
            location: config.locate
        });
    }

    var moveEndY = 0,
        moveEndX = 0,
        touchY = 0,
        diffY = 0,
        X = 0,
        Y = 0,
        dragStartX = 0,
        dragStartY = 0,
        // eslint-disable-next-line no-unused-vars
        touchStarting = false,
        touchStaying = false,
        timer = null;

    const tirggerY = 210
    const triggerSelector = '.contextmenu_wrapper > .contextmenu';

    $('body').on('touchstart touchmove touchend', '.contextmenu_wrapper', function (e) {
        e.stopPropagation();
    });

    $('body').on('touchstart', '.contextmenu_wrapper', function (e) {
        let screenHeight = $(window).height();
        touchY = screenHeight - e.originalEvent.changedTouches[0].pageY;
        if (touchY > tirggerY) return;

        touchStarting = true;

        clearInterval(timer);
        timer = setInterval(() => {
            if (diffY != 0 && Math.abs(diffY - Y) <= 10) {
                touchStaying = true;
            }
            else {
                touchStaying = false;
            }

            diffY = Y;
        }, 100);

        dragStartX = e.originalEvent.changedTouches[0].pageX;
        dragStartY = screenHeight - e.originalEvent.changedTouches[0].pageY;

        $(triggerSelector).removeClass('hasAnime');
    });

    $('body').on('touchmove', '.contextmenu_wrapper', function (e) {
        if (touchY > tirggerY) return;

        let screenHeight = $(window).height();

        moveEndX = e.originalEvent.changedTouches[0].pageX;
        moveEndY = e.originalEvent.changedTouches[0].pageY;
        X = moveEndX - dragStartX;
        Y = screenHeight - moveEndY;

        let movePosition = dragStartY - Y;

        // 判斷是否在合理範圍，讓使用者只能在螢幕範圍內拖曳
        if (movePosition >= 0)
            $(triggerSelector).css('bottom', `-${movePosition}px`);
        else
            $(triggerSelector).css('bottom', `0px`);
    });

    $('body').on('touchend', '.contextmenu_wrapper', function (e) {
        if (touchY > tirggerY) return;

        let screenHeight = $(window).height();

        touchStarting = false;

        clearInterval(timer);

        let maxHeight = $(triggerSelector).outerHeight();

        moveEndX = e.originalEvent.changedTouches[0].pageX;
        moveEndY = e.originalEvent.changedTouches[0].pageY;
        X = moveEndX - dragStartX;
        Y = screenHeight - moveEndY;

        let movePosition = dragStartY - Y;

        if (
            Math.abs(X) - 25 < Math.abs(Y) &&
            movePosition > maxHeight / 2 ||
            Math.abs(X) - 25 < Math.abs(Y) &&
            movePosition > 35 && !touchStaying
        ) {
            $(this).remove();
        }
        else {
            $(triggerSelector).addClass('hasAnime');
            $(triggerSelector).css('bottom', `0px`);
        }
    });

    function getImageType(url) {
        const extension = new URL(url).pathname.split('.').pop().toLowerCase();
        const mimeTypes = {
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'png': 'image/png',
            'gif': 'image/gif',
            'bmp': 'image/bmp',
            'svg': 'image/svg+xml'
        };
        return mimeTypes[extension] || 'image/png';
    }

    function isImage(url) {
        const extension = new URL(url).pathname.split('.').pop().toLowerCase();
        const mimeTypes = [
            'jpg',
            'jpeg',
            'png',
            'gif',
            'bmp',
            'svg'
        ];

        return mimeTypes.includes(extension);
    }

    function isElementInViewport(el) {
        if (el == null) return null;

        const rect = el.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    }
}