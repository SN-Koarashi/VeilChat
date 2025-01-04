"use strict";

import config from './config.js';
import { decodePrivateKey, getSharedSecret, encryptMessage } from './Crypto.js';
import onOpen from './WebSocket/Open.js';
import onClose from './WebSocket/Close.js';
import onError from './WebSocket/Error.js';
import onMessage from './WebSocket/Message.js';

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
		arr[i] ^= 5026;

	config.wss.send(arr);
}

export function WebSocketConnect() {
	if (config.denyCount > 5) {
		return;
	}

	config.wss = new WebSocket('wss://api.snkms.com:443/ws');
	config.wss.binaryType = 'arraybuffer';

	config.wss.onopen = () => {
		onOpen();
	}

	config.wss.onclose = (e) => {
		onClose(e);
	}

	config.wss.onerror = () => {
		onError();
	}

	config.wss.onmessage = (e) => {
		onMessage(e);
	}
}