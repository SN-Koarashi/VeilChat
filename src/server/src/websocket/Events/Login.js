"use strict";
require('../global.js');
const { Logger, onSender, getSHA256, getRandomID } = require('../function.js');

function RegisterEvent(data, sd, ws) {
	// 使用者所在的房間
	var locate = (data.location && data.location.match(/^([0-9a-zA-Z\-_]{1,16})$/g)) ? data.location : "public";

	// 如果訪問的房間不存在
	if (!roomList[locate]) {
		Logger("WARN", `Client ${sd.ip} trying to access a non-existent room #${locate}:`, sd.clientUID);
		onSender({
			type: "notFound",
			session: sd.clientUID,
			location: locate,
			previous: {
				location: clientList[sd.clientUID]?.locate ?? null
			}
		}, ws);

		// 跳出後續步驟
		return;
	}

	// 如果房間有密碼
	if (roomPassword[locate] !== null) {
		// 檢查登入要求是否攜帶密碼
		if (data.password !== undefined && typeof data.password === 'string' && data.password.trim().length > 0) {
			// 如果攜帶的密碼與房間密碼不相同，則將使用者踢出房間
			if (getSHA256(data.password) !== roomPassword[locate]) {
				Logger("WARN", `Client ${sd.ip} has been kicked from #${locate} bacause wrong password:`, sd.clientUID);
				onSender({
					type: "verifyFailed",
					session: sd.clientUID,
					location: locate
				}, ws);

				// 跳出後續步驟
				return;
			}
		}
		// 沒攜帶密碼則要求驗證
		else {
			onSender({
				type: "requireVerify",
				session: sd.clientUID,
				location: locate,
			}, ws);

			Logger("WARN", `Client ${sd.ip} haven't take password in #${locate}:`, sd.clientUID);

			// 跳出後續步驟
			return;
		}
	}

	if (data.token === undefined) {
		onSender({
			type: 'forbidden',
			session: sd.clientUID,
			message: 'Token Verify Failed'
		}, ws);
		ws.close();
		Logger("ERROR", `Client ${sd.ip} forbidden because token verified failed:`, sd.clientUID);
		return;
	}

	sd.clientTokenHash = getSHA256(data.token);

	// 生成使用者ID (判斷不同 WebSocket 實例)
	if (clientListID[sd.clientTokenHash]) {
		let maxTrying = 0;
		let randomID = getRandomID(9999);

		while (clientListID[sd.clientTokenHash].includes(randomID) && maxTrying <= 30) {
			randomID = getRandomID(9999);
			maxTrying++;
		}



		if (!clientListID[sd.clientTokenHash].includes(randomID)) {
			sd.clientID = randomID;
			clientListID[sd.clientTokenHash].push(randomID);
		}
		else {
			onSender({
				type: 'forbidden',
				session: sd.clientUID,
				message: 'ID Verify Failed'
			}, ws);
			ws.close();
			Logger("ERROR", `Client ${sd.ip} forbidden because ID verified failed:`, sd.clientUID);
			return;
		}
	}
	else {
		let randomID = getRandomID(9999);
		clientListID[sd.clientTokenHash] = new Array();
		clientListID[sd.clientTokenHash].push(randomID);
		sd.clientID = randomID;
	}

	// 推送訊息到控制台
	Logger("INFO", `Client ${sd.ip} logged in #${locate}:`, sd.clientUID);

	// 如果先前有所在的房間，則從先前的房間踢出
	if (roomList[clientList[sd.clientUID]?.locate]) {
		if (roomList[clientList[sd.clientUID].locate][sd.clientTokenHash]) {
			let k = 0;
			for (let c of roomList[clientList[sd.clientUID].locate][sd.clientTokenHash]) {
				if (c.session == sd.clientUID) {
					roomList[clientList[sd.clientUID].locate][sd.clientTokenHash].splice(k, 1);
					break;
				}
				k++;
			}

			if (roomList[clientList[sd.clientUID].locate][sd.clientTokenHash].length == 0)
				delete roomList[clientList[sd.clientUID].locate][sd.clientTokenHash];
		}


		// 更新先前的房間的使用者列表
		onSender({
			user: roomList[clientList[sd.clientUID].locate],
			type: 'profile'
		}, null, clientList[sd.clientUID].locate);
	}

	// 使用者工作階段資料
	let clientSession = {
		username: "",
		id: sd.clientID,
		session: sd.clientUID,
		signature: sd.clientTokenHash,
		address: sd.addressCrypt
	};

	// 在特定房間中所有工作階段的詳細資訊 (Array)
	if (!roomList[locate][sd.clientTokenHash])
		roomList[locate][sd.clientTokenHash] = [clientSession];
	else
		roomList[locate][sd.clientTokenHash].push(clientSession);

	// 檢查並更新同一個使用者在房間中的所有工作階段的暱稱
	for (let c of roomList[locate][sd.clientTokenHash]) {
		c.username = data.username || "Unknown";
	}


	// 使用者工作階段的基本資訊
	clientList[sd.clientUID] = {
		username: data.username,
		id: sd.clientID, // 使用者工作階段數字ID
		address: sd.addressCrypt, // IP位址雜湊
		signature: sd.clientTokenHash, // 使用者特徵碼
		locate: locate, // 使用者工作階段與所在房間的對應關係
		instance: ws // 使用者工作階段的 WebSocket 實例
	};

	// 將使用者列表廣播給所有人 (Object)
	let obj = {
		user: roomList[locate],
		type: 'profile'
	};

	// 將目前工作階段的資訊傳遞給目前連線的使用者工作階段(單個人，並非所有人)
	onSender({
		type: "verified",
		session: sd.clientUID,
		signature: sd.clientTokenHash,
		location: locate,
		isReserved: (roomListReserved.indexOf(locate) === -1) ? false : true,
		publicKeyBase64: (roomKeyPair[locate]) ? roomKeyPair[locate].publicKey : null,
		creatorPrivateKeyBase64: (roomKeyPair[locate]) ? roomKeyPair[locate].privateKey : null
	}, ws);

	// 將房間內的歷史訊息傳遞給目前連線的使用者工作階段(單個人，並非所有人)
	if (messageList[locate] && messageList[locate].messages && messageList[locate].messages.length > 0)
		onSender(messageList[locate], ws);

	// 傳遞上述建立物件 obj 之內容給房間中的所有使用者
	onSender(obj, null, locate);
}

module.exports = RegisterEvent;