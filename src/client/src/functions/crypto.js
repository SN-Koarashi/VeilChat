"use strict";
import config from '../config.js';
import ecdh from './ecdh.js';

// 左位移位元
function rotateLeft(value, shiftBits) {
	return ((value << shiftBits) | (value >>> (8 - shiftBits))) & 0xFF;
}

// 右位移位元
function rotateRight(value, shiftBits) {
	return ((value >>> shiftBits) | (value << (8 - shiftBits))) & 0xFF;
}

// 位元翻轉
function flipBits(value) {
	return value ^ 0xFF;
}

// 位元交換
function swapBits(value) {
	return ((value & 0xF0) >> 4) | ((value & 0x0F) << 4);
}

// 取得公私鑰對
async function getKeyPair() {
	if (config.localStorage.getItem('keyPair') != null) {
		return JSON.parse(config.localStorage.getItem('keyPair'));
	}
	else {
		let keyPair = await ecdh.generateKeyPair();
		let publicKeyJwk = await ecdh.exportKey(keyPair.publicKey);
		let privateKeyJwk = await ecdh.exportKey(keyPair.privateKey);

		let obj = {
			"publicKey": publicKeyJwk,
			"privateKey": privateKeyJwk
		};

		config.localStorage.setItem('keyPair', JSON.stringify(obj));

		return obj;
	}
}

// 取得公私鑰對(實例化)
async function getStoredKeyPair() {
	let keyPair = await getKeyPair();

	let publicKeyJwk = keyPair.publicKey;
	let privateKeyJwk = keyPair.privateKey;

	if (!publicKeyJwk || !privateKeyJwk) {
		return null;
	}

	let publicKey = await ecdh.importKey(publicKeyJwk, "public");
	let privateKey = await ecdh.importKey(privateKeyJwk, "private");

	return { publicKey, privateKey };
}

// 取得加密公鑰及私鑰
export async function getSecretPublicKeyRaw() {
	let roomPasswordHashed = await hashString(config.roomPassword);
	let finalPassword = config.roomPassword + roomPasswordHashed;

	let keyPair = await getStoredKeyPair();
	let publicKey = await ecdh.exportPublicKey(keyPair.publicKey);
	let publicKeyEncode = new Uint8Array(publicKey).map((byte, index) => {
		let charCode = finalPassword.charCodeAt(index % finalPassword.length);
		let xorResult = byte ^ charCode;

		// 加入混淆操作
		xorResult = rotateLeft(xorResult, 3);
		xorResult = rotateRight(xorResult, 2);
		xorResult = swapBits(xorResult);
		xorResult = flipBits(xorResult);

		return xorResult;
	});

	return {
		publicKeyRawBase64: btoa(String.fromCharCode(...publicKeyEncode)),
		privateKey: keyPair.privateKey
	};
}

// 取得base64私鑰
export async function encodePrivateKey(privateKeyCrypto) {
	let roomPasswordHashed = await hashString(config.roomPassword);
	let finalPassword = config.roomPassword + roomPasswordHashed;

	let privateKeyJwk = await ecdh.exportKey(privateKeyCrypto);
	let jsonJwk = JSON.stringify(privateKeyJwk);
	let arrayObj = jsonJwk.split("");

	let charCodeArr = arrayObj.map((str, index) => {
		let charCode = finalPassword.charCodeAt(index % finalPassword.length);
		let xorResult = str.charCodeAt(0) ^ charCode;

		// 加入混淆操作
		xorResult = rotateLeft(xorResult, 3);
		xorResult = rotateRight(xorResult, 2);
		xorResult = swapBits(xorResult);
		xorResult = flipBits(xorResult);

		return xorResult;
	});
	//console.log(charCodeArr);
	return btoa(unescape(encodeURIComponent(String.fromCharCode(...charCodeArr))));
}

// 解密base64私鑰
export async function decodePrivateKey(privateKeyBase64) {
	let roomPasswordHashed = await hashString(config.roomPassword);
	let finalPassword = config.roomPassword + roomPasswordHashed;

	let privateKeyJwkArray = Uint8Array.from(decodeURIComponent(escape(atob(privateKeyBase64))), c => c.charCodeAt(0));
	let privateKeyDecode = privateKeyJwkArray.map((byte, index) => {
		let charCode = finalPassword.charCodeAt(index % finalPassword.length);
		// 進行逆向混淆操作
		let flippedResult = flipBits(byte);
		let swappedResult = swapBits(flippedResult);
		let rotatedResult = rotateRight(swappedResult, 3);
		rotatedResult = rotateLeft(rotatedResult, 2);

		return rotatedResult ^ charCode;
	});

	let arrayObj = String.fromCharCode(...privateKeyDecode)
	let privateKey = await ecdh.importKey(JSON.parse(arrayObj), "private");
	return privateKey;
}

// 取得加密公鑰及私鑰(新產生)
export async function getNewSecretPublicKeyRaw() {
	let roomPasswordHashed = await hashString(config.roomPassword);
	let finalPassword = config.roomPassword + roomPasswordHashed;

	let keyPair = await ecdh.generateKeyPair();
	let publicKey = await ecdh.exportPublicKey(keyPair.publicKey);
	let publicKeyEncode = new Uint8Array(publicKey).map((byte, index) => {
		let charCode = finalPassword.charCodeAt(index % finalPassword.length);
		let xorResult = byte ^ charCode;

		// 加入混淆操作
		xorResult = rotateLeft(xorResult, 3);
		xorResult = rotateRight(xorResult, 2);
		xorResult = swapBits(xorResult);
		xorResult = flipBits(xorResult);

		return xorResult;
	});

	return {
		publicKeyRawBase64: btoa(String.fromCharCode(...publicKeyEncode)),
		privateKey: keyPair.privateKey
	};
}

// 解密公鑰並取得公享金鑰
export async function getSharedSecret(publicKeyRawBase64, privateKey) {
	let roomPasswordHashed = await hashString(config.roomPassword);
	let finalPassword = config.roomPassword + roomPasswordHashed;

	let publicKeyRaw = Uint8Array.from(atob(publicKeyRawBase64), c => c.charCodeAt(0));
	let publicKeyDecode = publicKeyRaw.map((byte, index) => {
		let charCode = finalPassword.charCodeAt(index % finalPassword.length);

		// 進行逆向混淆操作
		let flippedResult = flipBits(byte);
		let swappedResult = swapBits(flippedResult);
		let rotatedResult = rotateRight(swappedResult, 3);
		rotatedResult = rotateLeft(rotatedResult, 2);

		return rotatedResult ^ charCode;
	});

	let publicKey = await ecdh.importPublicKey(publicKeyDecode);
	let secretKey = await ecdh.deriveSecretKey(privateKey, publicKey);
	let sharedSecretRaw = await config.crypto.subtle.exportKey("raw", secretKey);

	return { secretKey, sharedSecretRaw };
}

// 加密訊息
export async function encryptMessage(sharedSecretKey, message) {
	const enc = new TextEncoder();
	const iv = config.crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for AES-GCM
	const encodedMessage = enc.encode(message);

	const encrypted = await config.crypto.subtle.encrypt(
		{
			name: "AES-GCM",
			iv: iv
		},
		sharedSecretKey,
		encodedMessage
	);

	let obj = {
		iv: iv,
		encryptedMessage: new Uint8Array(encrypted)
	};

	// Convert to JSON format
	const encryptedData = {
		iv: Array.from(obj.iv),
		encryptedMessage: Array.from(obj.encryptedMessage)
	};

	return encryptedData;
}

// 解密訊息
export async function decryptMessage(sharedSecretKey, iv, encryptedMessage) {
	const dec = new TextDecoder();

	const decrypted = await config.crypto.subtle.decrypt(
		{
			name: "AES-GCM",
			iv: new Uint8Array(iv)
		},
		sharedSecretKey,
		new Uint8Array(encryptedMessage)
	);

	return dec.decode(decrypted);
}

// SHA256 雜湊
export async function hashString(str) {
	const encoder = new TextEncoder();
	const data = encoder.encode(str);
	const hashBuffer = await config.crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

	return hashHex.toUpperCase();
}