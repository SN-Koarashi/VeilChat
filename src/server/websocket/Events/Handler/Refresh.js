"use strict";
require('../../global.js');
const { onSender, Logger } = require('../../function.js');

function RegisterEvent(data, sd) {
	Logger("INFO", `Client ${sd.ip} recache:`, sd.clientUID);
	var locate = (data.location && roomList[data.location]) ? data.location : "public";

	// 檢查並更新同一個使用者在房間中的所有工作階段的暱稱
	for (let c of roomList[locate][sd.clientTokenHash]) {
		c.username = data.username || "Unknown";
	}

	// 廣播更新後使用者列表給所有人 (Object)
	let obj = {
		user: roomList[locate],
		type: 'profile'
	};

	// 傳遞上述建立物件 obj 之內容給房間中的所有使用者
	onSender(obj, null, locate);
}

module.exports = RegisterEvent;