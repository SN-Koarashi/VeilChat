"use strict";

globalThis.clientList = {};
globalThis.clientListID = {};
globalThis.roomTimer = {};
globalThis.roomCreatedTimestamp = {};
globalThis.roomList = {
	public: {},
	ncut: {}
};
globalThis.roomKeyPair = {};
globalThis.roomListReserved = ["ncut"];
// 儲存預先定義的密碼時需把明文進行兩次SHA256雜湊(預先定義的房間雖然可以有密碼但訊息不會加密)
globalThis.roomPassword = {
	public: null,
	ncut: null
};
globalThis.messageList = {
	public: {
		messages: [],
		type: "history"
	}
};
globalThis.wssSrv = null;
