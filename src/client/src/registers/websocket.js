"use strict";

import config from '../config.js';
import { decodePrivateKey, getSharedSecret, encryptMessage } from '../functions/crypto.js';
import onOpen from '../events/websocket/base/open.js';
import onClose from '../events/websocket/base/close.js';
import onError from '../events/websocket/base/error.js';
import onMessage from '../events/websocket/base/message.js';
import { getXorKey } from '../utils/util.js';

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
		arr[i] ^= getXorKey();

	config.wss.send(arr);
}

export function WebSocketConnect() {
	if (config.denyCount > 5) {
		return;
	}

	config.wss = new WebSocket(window.location.hostname === 'localhost' ? 'ws://localhost:9001/' : config.WebSocketURL);
	config.wss.binaryType = 'arraybuffer';

	config.wss.onopen = () => {
		onOpen();
	}

	config.wss.onclose = (e) => {
		onClose(e);
	}

	config.wss.onerror = () => {
		onError();
		config.denyCount++;
	}

	config.wss.onmessage = (e) => {
		onMessage(e);
	}
}