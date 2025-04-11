"use strict";
require('../../global.js');
const { onSender, getSHA256, makeID } = require('../../function.js');

function RegisterEvent(data, sd, ws) {
	var j = 0;
	var locate = makeID(8);
	while (roomList[locate]) {
		if (j > 15) break;

		locate = makeID(8);
		j++;
	}


	if (j > 15 || data.session != sd.clientUID) {
		onSender({
			type: "verified",
			session: sd.clientUID,
			location: locate,
			status: "private_failed",
			message: "私聊建立失敗"
		}, ws);
	}
	else {
		roomList[locate] = {};
		roomPassword[locate] = (data.password && data.password.length > 0) ? getSHA256(data.password) : null;
		roomKeyPair[locate] = {
			publicKey: data.publicKeyBase64,
			privateKey: data.creatorPrivateKeyBase64
		};
		roomCreatedTimestamp[locate] = new Date().getTime();

		onSender({
			type: "verified",
			session: sd.clientUID,
			status: "private_created",
			hasPassword: (data.password && data.password.length > 0) ? true : false,
			location: locate,
			publicKeyBase64: roomKeyPair[locate].publicKey,
			creatorPrivateKeyBase64: roomKeyPair[locate].publicKey
		}, ws);
	}
}

module.exports = RegisterEvent;