"use strict";
require('./global.js');

const crypto = require('crypto');
const WebSocket = require('ws');

const $ = {
	Logger: function (stats, ...message) {
		var date = new Date();
		var month = ('0' + (date.getMonth() * 1 + 1)).substr(-2);
		var day = ('0' + date.getDate()).substr(-2);
		var hour = ('0' + date.getHours()).substr(-2);
		var minute = ('0' + date.getMinutes()).substr(-2);
		var second = ('0' + date.getSeconds()).substr(-2);

		var StrtoDate = `${month}-${day} ${hour}:${minute}:${second}`;
		var color;
		if (stats == 'INFO') {
			color = '\x1b[32m';
		}
		if (stats == 'WARN') {
			color = '\x1b[33m';
		}
		if (stats == 'ERROR') {
			color = '\x1b[31m';
		}

		console.log(`\x1b[0m${StrtoDate}`, `[${color}${stats}\x1b[0m]`, `${message.join(" ")}\x1b[0m`);
	},
	// 訊息廣播函數
	onSender: function (contentObj, onlyClient, locate) {
		wssSrv.clients.forEach(function each(client) {
			// 只傳遞給連線中的使用者
			if (client.readyState === WebSocket.OPEN) {
				if (onlyClient == client) // 只廣播給單個客戶端(傳送歷史訊息、悄悄話)
					client.send($.stringToArrayBuffer(JSON.stringify(contentObj)));
				else if (locate != null) {
					let room = roomList[locate];

					for (let r in room) {
						for (let c of room[r]) {
							let ws = clientList[c.session].instance;
							if (ws == client)
								client.send($.stringToArrayBuffer(JSON.stringify(contentObj)));
						}
					}
				}
			}
		});
	},

	stringToArrayBuffer: function (str) {
		var binary_string = Buffer.from(str, 'utf8').toString('binary');
		var len = binary_string.length;
		var bytes = new Uint8Array(len);
		for (var i = 0; i < len; i++) {
			bytes[i] = binary_string.charCodeAt(i);
		}

		var buf = new Buffer.from(bytes.buffer);
		var msg = buf.map(b => b ^ $.getXorKey());

		return msg;
	},
	cryptPwd: function (password) {
		var md5 = crypto.createHash('md5');
		return md5.update(password).digest('hex').toUpperCase();
	},
	getSHA256: function (str) {
		var hash = crypto.createHash('sha256');
		return hash.update(str).digest('hex').toUpperCase();
	},
	// 建立私聊ID
	makeID: function (length) {
		var result = '';
		var charactersMax = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
		var charactersMin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

		for (var i = 0; i < length; i++) {
			if (i == 0 || i == length - 1)
				result += charactersMin.charAt(Math.floor(Math.random() * charactersMin.length));
			else
				result += charactersMax.charAt(Math.floor(Math.random() * charactersMax.length));
		}
		return result;
	},
	getRandomID: function (max) {
		return Math.floor(Math.random() * max).toString().padStart(4, 0);
	},
	// 檢查是不是JSON
	isJSONString: function (jsonString) {
		try {
			var o = JSON.parse(jsonString);
			if (o && typeof o === "object") {
				if (o.type)
					return true;
			}
		}
		// eslint-disable-next-line no-empty, no-unused-vars
		catch (e) { }

		return false;
	},
	isMalicious: function (ip) {
		// 檢查請求頻率
		const now = Date.now();
		const timeWindow = 60 * 1000; // 1 分鐘
		const requestInfo = ipRequestCounts.get(ip) || { count: 0, lastRequest: now };

		// 如果在同一時間窗口內
		if (now - requestInfo.lastRequest < timeWindow) {
			requestInfo.count += 1;
		} else {
			// 時間窗口更新
			requestInfo.count = 1;
			requestInfo.lastRequest = now;
		}

		ipRequestCounts.set(ip, requestInfo);

		if (requestInfo.count > MAX_REQUESTS_PER_MINUTE) {
			$.Logger("WARN", `Client ${ip} exceeded request limit: ${requestInfo.count} requests in one minute`);
			return true;
		}

		return false; // 合法請求
	},
	roomCleanerHandler: function (locate) {
		if (roomList[locate] && Object.keys(roomList[locate]).length == 0 && locate.match(/^([0-9a-zA-Z\-_]{8})$/g) && roomListReserved.indexOf(locate) === -1) {
			// 清除先前的計時器
			if (roomTimer[locate]) {
				clearTimeout(roomTimer[locate]);
			}

			roomTimer[locate] = setTimeout(() => {
				if (
					roomList[locate] &&
					Object.keys(roomList[locate]).length == 0
				) {
					delete roomList[locate];
					delete messageList[locate];
					delete roomTimer[locate];
					delete roomKeyPair[locate];
					delete roomCreatedTimestamp[locate];

					// 推送清除訊息到控制台
					$.Logger("WARN", `Deleted channel #${locate} and its message history.`);
				}
			}, 60000);
		}
	},
	getXorKey: function () {
		return parseInt(process.env.XOR_KEY);
	}
};

module.exports = $;