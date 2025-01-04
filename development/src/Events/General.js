"use strict";
import $ from 'jquery';
import config from '../config.js';
import { isMobile } from '../Utils.js';
import Dialog from '../Dialog.js';
import { WebSocketBinaryHandler } from '../WebSocketRegister.js';
import {
	onKeyEnter,
	onScroll,
	openSettings,
	closeSettings
} from '../ChatUtils.js';

import { initSettings } from '../EventsRegister.js';

export default function RegisterEvent(window) {
	$(window).on('popstate', function () {
		config.localStorage.removeItem('lastRoom');
	});

	$(document).on('keydown', function (e) {
		if (document.activeElement === document.body && !$('.snkms-jsd-m').is(':visible') && !$('.wrapper_settings').is(':visible')) {
			if (!e.altKey && !e.shiftKey && !e.ctrlKey)
				$('#sender').focus();
		}
	});

	$('body').on('click', '.privateStatus .privateButton', function () {
		config.privateChatTarget = null;
		$('.privateStatus').remove();
	});

	$('body').on('click', '.inviteLink', function (e) {
		if ($(this).attr('data-room') === config.locate) {
			let toast = "您已經在這個房間了";
			if (isMobile())
				Dialog.toastMessage(toast, 'close', 'red');
			else
				Dialog.error(toast);
		}
		else {
			WebSocketBinaryHandler({
				type: 'login',
				token: config.token,
				username: config.userName,
				location: $(this).attr('data-room')
			});
		}
		e.preventDefault();
	});

	$(".room").on("contextmenu", ".msgWrapper img.emojis", function () {
		return false;
	});
	$(".messageBox").on("contextmenu", "img", function () {
		return false;
	});
	$(".menu .speedMove").on("contextmenu", "img", function () {
		return false;
	});
	$("body").on("contextmenu", ".privateButton img", function () {
		return false;
	});

	$("body").on("dragstart", ".emoji-window .eBody .eContainer div[data-id] > img, div.emojis > img, .privateButton img, .msgWrapper img.emojis, .messageBox img, .menu .speedMove img", function () {
		return false;
	});

	$(window).on('resize', function () {
		setTimeout(() => {
			onKeyEnter($('#sender'));
		}, 250);
	});

	$(window).on('popstate', function () {
		location.replace(location.href);
	});

	$(window).load(function () {
		onScroll(true);
	});

	$(window).on('resize', function () {
		initSettings();
	});

	$(document).on('ready', function () {
		initSettings();
	});

	$('#settings').on('click', function () {
		openSettings();
	});
	$('.wrapper_settings').on('click', '#onClose', function () {
		closeSettings();
	});

	$(document).on('keydown', function (e) {
		if (e.which == 27) {
			closeSettings();
		}
	});

	$('.lobby').on('scroll', function () {
		let containerHeight = $(this).height();
		let scrollHeight = $(this).prop("scrollHeight");
		let scrollTop = $(this).scrollTop();

		let nowPost = scrollHeight - scrollTop;
		if (containerHeight > nowPost - 10) {
			config.scrollBottom = true;
		}
		else {
			config.scrollBottom = false;
		}

		if (containerHeight < nowPost - 200) {
			$("#moveDown").show();
		}
		else {
			$("#moveDown").hide();
		}

		if (nowPost + 200 < scrollHeight) {
			$("#moveUp").show();
		}
		else {
			$("#moveUp").hide();
		}
	});

	if (!isMobile() || window.innerWidth > 480) {
		$('.wrapper_settings').fadeIn(10, function () {
			$('.wrapper_settings').hide();
		});
	}
}