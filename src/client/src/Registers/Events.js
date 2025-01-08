"use strict";
import $ from 'jquery';
import config from '../config.js';
import { getRandomNickname, isMobile, randomToken } from '../Utils/Utils.js';
import Dialog from '../Functions/Dialog.js';
import { WebSocketConnect } from './WebSocket.js';
import {
	savingSettings
} from '../Utils/ChatUtils.js';

import eGeneral from '../Events/General.js';
import eButton from '../Events/Button.js';
import eDragHandler from '../Events/DragHandler.js';
import eEmoji from '../Events/Emoji.js';
import eMessageBox from '../Events/MessageBox.js';
import eMobileUX from '../Events/MobileUX.js';
import eRipple from '../Events/Ripple.js';

export function initSettings() {
	if (isMobile() && window.innerWidth <= 480) {
		let elements = $(".additional").find('div');

		elements.each(function () {
			$(this).addClass("additionalSetting");
			$(".settings_body").append($(this));
		});

		$(".additional").empty();
	}
	else {
		let elements = $(".settings_body").find('.additionalSetting');
		var k = 0;
		elements.each(function () {
			k++;
			$(this).removeClass("additionalSetting");
			$(".additional").append($(this));

			if (k % 2 == 0 && k != elements.length)
				$(".additional").append("<br/>");
		});
	}

	//$('.userList').css('bottom', $('.chatInfo').outerHeight() + 'px');
}

export function initSetup() {
	if (!config.localStorage.getItem('username')) {
		Dialog.prompt('設定', '該如何稱呼你？', '',
			function (evt, value) {
				config.userName = value;
				config.localStorage.setItem('username', value);
				$('#userName').val(value);
				WebSocketConnect();
				$('.userlist > div').show();
			}, function () {
				const rndName = getRandomNickname();

				config.userName = rndName;
				config.localStorage.setItem('username', rndName);
				$('#userName').val(rndName);
				WebSocketConnect();
				$('.userlist > div').show();
			});
	}
	else {
		config.userName = config.localStorage.getItem('username');
		WebSocketConnect();
		$('.userlist > div').show();
	}

	if (isMobile()) {
		$('.room').css('height', $(window).height() - $('.messageBox').height() - 20);
		$('#userName').attr('readonly', true);
		$('#userName').on('click', function () {
			Dialog.prompt('設定', '該如何稱呼你？', '',
				function (evt, value) {
					config.userName = value;
					$('#userName').val(value);
					savingSettings();
				});
		});

		initSettings();
	}

	window.emojis = Object.keys(window.emojis).sort().reduce(
		(obj, key) => {
			obj[key] = window.emojis[key];
			return obj;
		}, {}
	);

	let devicePixel = (window.devicePixelRatio == 1) ? 32 : (devicePixelRatio == 2) ? 64 : 96;
	for (let e in window.emojis) {
		// $(".emoji-window .eBody .eContainer").append(`<div title=":${e}:" data-id="${e}" data-ripple><span style="--emoji-url: url(${window.emojis[e]}?size=${devicePixel});"></span></div>`);
		$(".emoji-window .eBody .eContainer").append(`<div title=":${e}:" data-id="${e}" data-ripple><img src="${window.emojis[e]}?size=${devicePixel}" crossorigin="anonymous" alt="emojis" loading="lazy" /></div>`);
	}

	$.fn.tagName = function () {
		return this.prop("tagName").toLowerCase();
	};
}

export function initFirst(window) {
	setInterval(() => {
		if ($('#sender').text().length === 0 && parseInt($('#sender').css('height')) === 40 || $('#sender').text().length === 1 && $('#sender').text().match(/^\n$/g) || $('#sender').text().length === 2 && $('#sender').text().match(/^\r\n$/g))
			$(".textPlaceholder").show();
		else
			$(".textPlaceholder").hide();
	}, 50);

	if (config.localStorage.getItem('token') === null) {
		let random = randomToken(70);
		config.localStorage.setItem('token', random);
		config.token = random;
	}
	else {
		config.token = config.localStorage.getItem('token');
	}


	eGeneral(window);
	eButton(window);
	eEmoji(window);
	eMessageBox(window);

	eDragHandler(window);
	eMobileUX(window);
	eRipple(window);

	initSetup();

	$('#userName').val(config.localStorage.getItem('username'));
}