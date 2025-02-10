"use strict";

const config = {
	CDNServer: process.env.APP_URL,
	CDNRedirect: `${process.env.APP_URL}/`,
	MainDomain: process.env.APP_URL,
	lang: navigator.language || window.localStorage.getItem('lang') || 'en',
	isDebugger: window.localStorage.getItem('debugger') ? true : false,
	wss: null,
	token: null,
	crcTableGlobal: null,
	privateChatTarget: null,
	editMessageTarget: null,
	localStorage: window.localStorage,
	crypto: window.crypto,
	roomPassword: undefined,
	roomPublicKeyBase64: undefined,
	roomPrivateKeyBase64: undefined,
	clientList: {},
	messageList: {},
	inviteList: [],
	globalObserverTimer: [],
	userName: "Unknown",
	locate: "public",
	sessionSelf: null,
	tokenHashSelf: null,
	isInited: false,
	denyCount: 0,
	scrollBottom: true,
	droppedText: false,
	lastRange: null
};

export default config;