"use strict";
import $ from 'jquery';
import config from './config.js';
import { decodePrivateKey, getSharedSecret, encryptMessage, hashString } from './Crypto.js';
import { crc32, isMobile } from './Utils.js';
import Logger from './Logger.js';
import snkms from './Dialog.js';
import { privateChat, onMessage, passwordVerify, onScroll } from './ChatUtils.js';

export async function WebSocketBinaryHandler(obj) {
	var str;

	if (obj.message && config.roomPassword && config.roomPublicKeyBase64 && config.roomPrivateKeyBase64 && config.locate != "public") {
		let privateKey = await decodePrivateKey(config.roomPrivateKeyBase64)
		let { secretKey } = await getSharedSecret(config.roomPublicKeyBase64, privateKey);

		obj.message = await encryptMessage(secretKey, obj.message.original.toString());
		str = JSON.stringify(obj);
	}
	else {
		str = JSON.stringify(obj);
	}

	var enc = new TextEncoder();
	var arr = enc.encode(str);
	for (let i = 0; i < arr.length; i++)
		arr[i] ^= 5026;

	config.wss.send(arr);
}

export function WebSocketConnect() {
	if (config.denyCount > 5) {
		return;
	}

	config.wss = new WebSocket('wss://api.snkms.com:443/ws');
	config.wss.binaryType = 'arraybuffer';

	config.wss.onopen = () => {
		Logger.show(Logger.Types.LOG, '[WebSocketHandler]', { type: "init", reason: "server connected" });
		let toast = "與伺服器連線成功";
		if (isMobile())
			snkms.toastMessage(toast, 'signal_cellular_alt', 'green');
		else
			snkms.success(toast);

		let joinLocation = $('#room_id').val();
		if (isMobile() && config.localStorage.getItem('lastRoom') && location.pathname.match(/^\/private\/([0-9A-Za-z\-_]+)/ig) === null) {
			joinLocation = config.localStorage.getItem('lastRoom');
		}

		WebSocketBinaryHandler({
			type: 'login',
			token: config.token,
			username: config.userName,
			location: joinLocation
		});

		onScroll(false);
	}

	config.wss.onclose = (e) => {
		Logger.show(Logger.Types.LOG, '[WebSocketHandler]', { type: "init", reason: "server disconnected" });
		onScroll(false);
		let toast = "與伺服器連線失敗: " + e.code;

		if (isMobile())
			snkms.toastMessage(toast, 'close', 'red', function () {
				WebSocketConnect();
			});
		else
			snkms.error(toast, function () {
				WebSocketConnect();
			});
	}

	config.wss.onerror = () => {
		Logger.show(Logger.Types.LOG, '[WebSocketHandler]', { type: "init", reason: "server occurred error" });
	}

	config.wss.onmessage = (e) => {
		var uint8View = new Uint8Array(e.data);
		var enc = new TextDecoder("utf-8");
		var arr = uint8View;
		for (let i = 0; i < arr.length; i++)
			arr[i] ^= 5026;

		const data = JSON.parse(enc.decode(arr));
		Logger.show(Logger.Types.LOG, "[WebSocketHandler]", data);

		// 目前房間的使用者列表
		if (data.type == 'profile') {
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
		// 使用者資訊驗證完成，可加入房間
		else if (data.type == 'verified') {
			const tempLocate = config.locate;
			config.locate = data.location;
			config.sessionSelf = data.session;
			config.tokenHashSelf = data.signature;
			$('.settings_footer span').text(config.sessionSelf);

			// 無狀態參數，表示為加入房間
			if (!data.status) {
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
					window.history.pushState(null, document.title, '/private/' + config.locate);
					let toast = "加入成功";
					if (isMobile())
						snkms.toastMessage(toast, 'done', 'green');
					else
						snkms.success(toast);

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
						snkms.toastMessage(toast, 'close', 'red');
					else
						snkms.error(toast);

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
		// 聊天訊息歷史紀錄
		else if (data.type == 'history') {
			let index = 0;
			data.messages.forEach(e => {
				index++;
				setTimeout(() => {
					onMessage(data.type, e.session, e.signature, e.username, e.id, e.message, e.time);
					onScroll(true);
				}, 1 * index);
			});
		}
		// 傳送訊息
		else if (data.type == 'message') {
			onMessage(data.type, data.session, data.signature, config.clientList[data.signature]?.at(0).username, config.clientList[data.signature]?.at(0).id, data.message, new Date().getTime());
		}
		// 傳送悄悄話訊息
		else if (data.type == 'privateMessage') {
			onMessage(data.type, "private", data.source.signature, config.clientList[data.source.signature]?.at(0).username, config.clientList[data.source.signature]?.at(0).id, data.message, new Date().getTime());
		}
		// 伺服器禁止連線
		else if (data.type == 'forbidden') {
			$('.lobby > .chat').append(`<div data-id="system">伺服器拒絕您的連線: ${data.message}</div>`);

			if (config.locate != "public") {
				WebSocketBinaryHandler({
					type: 'login',
					token: config.token,
					username: config.userName,
					location: 'public',
				});
			}

			config.denyCount++;
		}
		// 房間密碼認證失敗
		else if (data.type == 'verifyFailed') {
			let toast = "密碼錯誤";
			if (isMobile())
				snkms.toastMessage(toast, 'close', 'red');
			else
				snkms.error(toast);
			passwordVerify(data.location);
		}
		// 進入房間需要密碼認證
		else if (data.type == 'requireVerify') {
			passwordVerify(data.location);
		}
		// 進入的房間不存在
		else if (data.type == 'notFound') {
			let toast = "#房間 " + data.location + " 已不存在";
			if (isMobile())
				snkms.toastMessage(toast, 'close', 'red');
			else
				snkms.error(toast);

			if (!data.previous.location) {
				WebSocketBinaryHandler({
					type: 'login',
					token: config.token,
					username: config.userName,
					location: "public"
				});
			}
		}
		// 未知/未定義的事件類型
		else {
			Logger.show(Logger.Types.WARN, 'Unknown type', data.type);
		}
	}
}