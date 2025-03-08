"use strict";
import $ from 'jquery';
import config from '../config.js';
import { isMobile } from '../Utils/Utils.js';
import Dialog from '../Functions/Dialog.js';
import { WebSocketBinaryHandler } from '../Registers/WebSocket.js';

import { toggleSidebar, privateChat, uploadPrepare } from '../Utils/ChatUtils.js';
import { hashString, getSecretPublicKeyRaw, getNewSecretPublicKeyRaw, encodePrivateKey } from '../Functions/Crypto.js';
import { crc32 } from '../Utils/Utils.js';

export default function RegisterEvent(window) {
	$(".headerButton.list").on("click", function () {
		$(".lobby, #container, .channelHeader").addClass('hasLeft');
		$(".lobby, #container, .channelHeader").removeClass('hasRight');
		toggleSidebar($(".wrapper_settings"), true, 'left');
	});

	$(".headerButton.channel").on("click", function () {
		$(".lobby, #container, .channelHeader").addClass('hasRight');
		$(".lobby, #container, .channelHeader").removeClass('hasLeft');
		toggleSidebar($(".rightSide"), true, 'right');
	});

	$(".additional").on("click", function (e) {
		e.stopPropagation();
	});

	$(".additional div").on("click", function () {
		$(".additional").hide();
		$(".messageBox").removeClass("unhidden");
	});

	$("#add").on("click", function (e) {
		if ($(this).hasClass("right")) {
			$("body").trigger("click");
			$("#sender").trigger('focus');
		}
		else {
			$(".additional").toggle();
			$(".emoji-window").hide();
			if ($(".additional").css('display') == "block") {
				$(".messageBox").addClass("unhidden");
			}
			else {
				$(".messageBox").removeClass("unhidden");
			}
		}
		e.stopPropagation();
	});

	$('#fileUpload').on('change', function () {
		uploadPrepare(this.files);
	});

	$("#privateChatCreate").on("click", function () {
		config.inviteList = [];
		const $element = $(this);

		let elements = "";
		for (let c in config.clientList) {
			if (c == config.tokenHashSelf) continue;

			elements += `<div><label class="container"><input name="inviteList" type="checkbox" value="${c}"><span class="checkmark"></span>${config.clientList[c]?.at(0).username}#${crc32(c)}</label></div>`;
		}

		if (elements.length > 0)
			elements = `<hr/>${elements}`;

		Dialog.option(
			"建立房間",
			"要建立臨時私聊房間嗎？<br/>建立私聊後可以分享連結以向您的朋友一同進行隱密又安全的聊天！<div style='font-size:12px;margin-top: 15px;'>設有密碼之房間將受到端對端加密保護</div>",
			[],
			"設定密碼",
			function (evt, value) {
				const choosen = value;

				const senderWorker = async function (private_key) {
					let obj = {
						type: "create",
						session: config.sessionSelf
					};

					if (private_key != null && private_key.trim().length > 0) {
						obj.password = await hashString(private_key);
						config.roomPassword = private_key;

						let creatorKeyPair = await getSecretPublicKeyRaw();
						let keyPair = await getNewSecretPublicKeyRaw();

						obj.publicKeyBase64 = keyPair.publicKeyRawBase64;
						obj.creatorPrivateKeyBase64 = await encodePrivateKey(creatorKeyPair.privateKey);
					}

					WebSocketBinaryHandler(obj);
					if ($element.hasClass("additionalSetting"))
						toggleSidebar($(".wrapper_settings"), false, "left");
				};

				if (elements.length > 0) {
					setTimeout(() => {
						Dialog.confirm(`選擇要邀請到新建立的私人房間的對象，若都沒有勾選對象也可以在建立後發送房間ID給他們。${elements}`, function () {
							$('input[name="inviteList"]:checked').each(function () {
								config.inviteList.push($(this).val());
							});

							senderWorker(choosen);
						});
					}, 250);
				}
				else {
					senderWorker(choosen);
				}
			}, null,
			{
				defaultSelectedNumber: 1,
				allowDefaultSubmit: true,
				customDefault: {
					name: "未設定",
					value: null
				}
			}
		);
	});

	$("#privateChatJoin").on("click", function () {
		const $element = $(this);
		Dialog.prompt("加入房間", "請輸入房間ID或網址", config.MainDomain + "/p/########", function (e, value) {
			if (config.locate === value.split("/").at(-1)) {
				let toast = "您已經在這個房間了";
				if (isMobile())
					Dialog.toastMessage(toast, 'close', 'red');
				else
					Dialog.error(toast);
				return;
			}

			if (value.match(new RegExp(`^${process.env.APP_URL}/p/`, 'gi')) || value.match(/^([0-9A-Za-z\-_]{1,16})$/g)) {
				config.locate = value.replace(config.MainDomain + "/p/", "");

				WebSocketBinaryHandler({
					type: 'login',
					token: config.token,
					username: config.userName,
					location: config.locate
				});

				if ($element.hasClass("additionalSetting"))
					toggleSidebar($(".wrapper_settings"), false, "left");
			}
			else {
				let toast = "格式錯誤，無法加入房間";
				if (isMobile())
					Dialog.toastMessage(toast, 'close', 'red');
				else
					Dialog.error(toast);
			}
		});
	});

	$("#publicChat").on("click", function () {
		if (config.locate == "public") {
			let toast = "您已經在大廳了";
			if (isMobile())
				Dialog.toastMessage(toast, 'close', 'red');
			else
				Dialog.error(toast);
		}
		else {
			config.locate = "public";
			WebSocketBinaryHandler({
				type: 'login',
				token: config.token,
				username: config.userName,
				location: "public"
			});
		}

		if ($(this).hasClass("additionalSetting")) {
			toggleSidebar($(".wrapper_settings"), false, "left");
		}
	});

	$('.userWrapper').on('click', 'div[id] > #dropdown', function (e) {
		let $main = $(this).parent();

		$main.children('#sessionList').toggle();
		$(this).toggleClass('down');

		e.stopPropagation();
	});

	$('.userWrapper').on('touchstart', 'div[id] > #dropdown', function (e) {
		e.stopPropagation();
	});

	$(".userList").on("click", '.userWrapper > div[title][id]', function () {
		var targetSession = $(this).attr('id');
		privateChat(targetSession);
	});

	$(".lobby > .chat").on("click", 'div > author', function () {
		var targetSession = $(this).attr('data-user');
		privateChat(targetSession);
	});

	$("#moveUp").on("click", function () {
		$(".lobby").animate({ scrollTop: 0 }, 250);
	});

	$("#moveDown").on("click", function () {
		$(".lobby").animate({ scrollTop: $(".lobby > .chat").height() }, 250);
	});

	$(".channelName, .channelHeader .headerTitle").on("click", function () {
		var tempInput = document.createElement('input'),
			text = window.location.href;

		document.body.appendChild(tempInput);
		tempInput.value = text;
		tempInput.select();
		document.execCommand('copy');
		document.body.removeChild(tempInput);

		let toast = "已將房間位置複製到剪貼簿";
		if (isMobile())
			Dialog.toastMessage(toast, 'content_copy', 'green');
		else
			Dialog.success(toast);
	});
}