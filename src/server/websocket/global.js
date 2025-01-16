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

// 儲存 IP 的請求次數 (用於頻率限制)
globalThis.ipRequestCounts = new Map();
// 設定最大請求頻率 (每分鐘)
globalThis.MAX_REQUESTS_PER_MINUTE = 20;
