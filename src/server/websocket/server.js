"use strict";
require('./global.js');
const { onSender, Logger, cryptPwd, isJSONString, isMalicious } = require('./function.js');

const path = require('path');
const dotenv = require('dotenv');
const envConfig = { path: path.resolve(__dirname, '../../../.env') };
const crypto = require('crypto');
const WebSocket = require('ws');
const SocketServer = WebSocket.Server;
const http = require('http');

const Events = require('./Events/index.js');

// 指定開啟的 port
const PORT = process.env.PORT || 8080;
const server = new http.createServer();

dotenv.config(envConfig);
// SocketServer 開啟 WebSocket 服務
wssSrv = new SocketServer({ server })

var debugMode = false;

process.argv.forEach(function (val) {
	if (val.startsWith("--debug")) debugMode = true;
});

wssSrv.binaryType = 'arraybuffer';
// 當 WebSocket 從外部連結時執行
wssSrv.on('connection', (ws, req) => {
	// 連結時執行提示
	const ip = (process.env.NODE_ENV !== "development" && req.connection.remoteAddress.match(/^(::ffff:(127\.0\.0\.1|192\.168\.([0-9]{1,3})\.([0-9]{1,3})))/ig)) ? req.headers['x-forwarded-for'] : req.connection.remoteAddress;
	const port = req.connection.remotePort;

	if (isMalicious(ip)) {
		Logger("WARN", `Terminating malicious client: ${ip}`);
		ws.terminate();
		return;
	}

	if (process.env.NODE_ENV !== "development" && !req.headers["origin"]?.match(new RegExp(`^${process.env.APP_URL}/?$`, 'gi'))) {
		ws.close(4003, "Forbidden origin");
		Logger("ERROR", `Client ${ip} forbidden because invalid origin:`, req.headers["origin"]);
		return;
	}

	const addressCrypt = cryptPwd(ip);
	const clientUID = crypto.randomUUID().toUpperCase();

	const SocketData = { clientTokenHash: null, clientID: null, ip, port, addressCrypt, clientUID };

	// 驗證使用者是否合法
	if (process.env.NODE_ENV !== "development" && ip != req.headers['x-forwarded-for']) {
		onSender({
			type: 'forbidden',
			session: clientUID,
			message: 'Session Verify Failed'
		}, ws);
		ws.close(4003, "Session Verify Failed");
		Logger("ERROR", `Client ${ip} forbidden because ip verified failed:`, clientUID);
		return;
	}

	Logger("INFO", `Client ${ip} connected:`, clientUID);

	// 接收訊息
	ws.on('message', async (arraybuffer) => {
		try {
			var buf = new Buffer.from(arraybuffer);
			var msg = buf.map(b => b ^ 5026);

			if (!isJSONString(msg.toString())) return;

			let data = JSON.parse(msg.toString());

			if (debugMode) {
				console.log(data);
			}

			// 登入動作
			if (data.type == 'login') {
				Events.Login(data, SocketData, ws);
			}
			// 建立私聊
			else if (data.type == 'create') {
				Events.Create(data, SocketData, ws);
			}
			// 刷新動作
			else if (data.type == 'refresh') {
				Events.Refresh(data, SocketData, ws);
			}
			// 發送訊息
			else if (data.type == "message") {
				Events.Message(data, SocketData, ws);
			}
			// 傳送悄悄話 (悄悄話會在重新整理後消失，不會顯示在訊息歷史中)
			else if (data.type == "privateMessage") {
				Events.PrivateMessage(data, SocketData, ws);
			}
			// 編輯訊息
			else if (data.type == "editMessage") {
				Events.EditMessage(data, SocketData, ws);
			}
			// 刪除訊息
			else if (data.type == "deleteMessage") {
				Events.DeleteMessage(data, SocketData, ws);
			}
			else {
				Logger("WARN", `Client ${ip} invalid type:`, clientUID);
			}
		}
		catch (err) {
			console.log(err);
		}
	});

	// 使用者工作階段關閉連線
	ws.on('close', async () => {
		Logger("INFO", `Client ${ip} disconnected:`, clientUID);
		let locate = clientList[clientUID]?.locate;

		// 於使用者列表陣列及使用者所有工作階段陣列中刪除此工作階段
		if (roomList[locate]) {
			// 將使用者工作階段自房間列表中刪除
			if (roomList[locate][SocketData.clientTokenHash]) {
				let k = 0;
				for (let c of roomList[locate][SocketData.clientTokenHash]) {
					if (c.session == clientUID) {
						roomList[locate][SocketData.clientTokenHash].splice(k, 1);
						break;
					}
					k++;
				}

				if (roomList[locate][SocketData.clientTokenHash].length == 0)
					delete roomList[locate][SocketData.clientTokenHash];
			}

			delete clientList[clientUID];

			clientListID[SocketData.clientTokenHash].splice(clientListID[SocketData.clientTokenHash].indexOf(SocketData.clientID), 1);

			if (roomList[locate] && Object.keys(roomList[locate]).length == 0 && locate.match(/^([0-9a-zA-Z\-_]{8})$/g) && roomListReserved.indexOf(locate) === -1) {
				roomTimer[locate] = setTimeout(() => {
					if (roomList[locate] && Object.keys(roomList[locate]).length == 0) {
						delete roomList[locate];
						delete messageList[locate];
						delete roomTimer[locate];
						delete roomKeyPair[locate];
						delete roomCreatedTimestamp[locate];

						// 推送清除訊息到控制台
						Logger("WARN", `Deleted channel #${locate} and its message history.`);
					}
				}, 60000);
			}

			// 傳遞更新後的使用者列表給所有人
			let obj = {
				user: roomList[locate],
				type: 'profile'
			};
			onSender(obj, null, locate);
		}
	});

	ws.isAlive = true;
	ws.on("pong", () => {
		ws.isAlive = true;
	});
});

server.listen(PORT, () => {
	Logger("WARN", `WebSocket Server is Listening on Port ${server.address().port} | mode: ${process.env.NODE_ENV}`);

	// 全域計時器
	setInterval(() => {
		// 循環查找所有房間，刪除未刪除的無人房間 (建立時間須達30秒以上)
		for (let locate in roomList) {
			const nowTime = new Date().getTime();
			if (
				roomList[locate] &&
				Object.keys(roomList[locate]).length == 0 &&
				locate.match(/^([0-9a-zA-Z\-_]{8})$/g) &&
				roomListReserved.indexOf(locate) === -1 &&
				(nowTime - roomCreatedTimestamp[locate]) > 30000
			) {
				delete roomList[locate];
				delete messageList[locate];
				delete roomTimer[locate];
				delete roomKeyPair[locate];
				delete roomCreatedTimestamp[locate];

				// 推送清除訊息到控制台
				Logger("WARN", `Deleted channel #${locate} and its message history by global timer.`);
			}
		}
	}, 180000);

	setInterval(() => {
		wssSrv.clients.forEach((client) => {
			if (client.isAlive === false) {
				console.log(client, 'close');
				return client.terminate();
			}
			client.isAlive = false;
			client.ping();
		});
	}, 5000);
});