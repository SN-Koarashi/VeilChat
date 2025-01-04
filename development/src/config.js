"use strict";

const config = {
	CDNServer: "https://media.snkms.org",
	CDNRedirect: "https://chat.snkms.com/cdn",
	MainDomain: "https://chat.snkms.com",
	lang: navigator.language || window.localStorage.getItem('lang') || 'en',
	isDebugger: window.localStorage.getItem('debugger') ? true : false,
	wss: null,
	token: null,
	crcTableGlobal: null,
	privateChatTarget: null,
	localStorage: window.localStorage,
	crypto: window.crypto,
	roomPassword: undefined,
	roomPublicKeyBase64: undefined,
	roomPrivateKeyBase64: undefined,
	clientList: {},
	inviteList: [],
	globalObserverTimer: [],
	userName: "Unknown",
	locate: "public",
	sessionSelf: null,
	tokenHashSelf: null,
	isInited: false,
	denyCount: 0,
	scrollBottom: true,
	droppedText: false
};

export default config;