"use strict";
//? 這裡是普通公用程式，函數之前相關性小且不呼叫前端元素與互動

import config from '../config.js';
import Logger from '../Functions/Logger.js';
import Dialog from '../Functions/Dialog.js';
import { decodePrivateKey, getSharedSecret, decryptMessage } from '../Functions/Crypto.js';

export function escapeHtml(unsafe) {
	return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

export function isMobile() {
	var userAgentInfo = navigator.userAgent;
	var Agents = new Array("Android", "iPhone", "SymbianOS", "Windows Phone");
	var flag = false;
	for (var v = 0; v < Agents.length; v++) {
		if (userAgentInfo.indexOf(Agents[v]) > 0) { flag = true; break; }
	}
	return flag;
}

export function base64ToBlob(base64, mime) {
	mime = mime || '';
	var sliceSize = 1024;
	var byteChars = window.atob(base64);

	var byteArrays = [];
	for (var offset = 0, len = byteChars.length; offset < len; offset += sliceSize) {
		var slice = byteChars.slice(offset, offset + sliceSize);

		var byteNumbers = new Array(slice.length);
		for (var i = 0; i < slice.length; i++) {
			byteNumbers[i] = slice.charCodeAt(i);
		}
		var byteArray = new Uint8Array(byteNumbers);
		byteArrays.push(byteArray);
	}
	return new Blob(byteArrays, { type: mime });
};

// https://stackoverflow.com/a/18639999/14486292
export function crc32(str) {
	var crcTable = config.crcTableGlobal || (config.crcTableGlobal = makeCRCTable());
	var crc = 0 ^ (-1);

	for (var i = 0; i < str.length; i++) {
		crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
	}

	return (crc ^ (-1)) >>> 0;
};

export function makeCRCTable() {
	var c;
	var crcTable = [];
	for (var n = 0; n < 256; n++) {
		c = n;
		for (var k = 0; k < 8; k++) {
			c = ((c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
		}
		crcTable[n] = c;
	}
	return crcTable;
}

export function getNowDate() {
	let date = new Date();
	let year = date.getFullYear();
	let month = (date.getMonth() + 1 < 10) ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
	let day = (date.getDate() < 10) ? '0' + date.getDate() : date.getDate();

	return `${year}/${month}/${day}`;
}

export function getRandomNickname() {
	var list = [
		"Emily", "Amy", "Alice", "Grace", "Tina", "Joyce", "Vivian", "Cindy", "Ivy", "Jenny", "Claire", "Annie", "Vicky", "Jessica", "Peggy", "Sandy", "Irene", "Iris", "Maggie", "Winnie",
		"Sophia", "Bella", "Mia", "Lily", "Chloe", "Ruby", "Zoe", "Stella", "Lucy", "Ella", "Natalie", "Sarah", "Hannah", "Kate", "Laura", "Michelle", "Amber", "Rachel", "Tiffany", "Vanessa"
	];
	return list.at(Math.floor(Math.random() * list.length));
}

export function checkImageURL(url) {
	return (url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*?)?$/i) != null);
}

export function randomToken(length) {
	var result = '';
	var charactersMax = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
	var charactersMin = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (var i = 0; i < length; i++) {
		if (i == 0 || i == length - 1)
			result += charactersMin.charAt(Math.floor(Math.random() * charactersMin.length));
		else
			result += charactersMax.charAt(Math.floor(Math.random() * charactersMax.length));
	}
	return result;
}

export function randomASCIICode(length) {
	var result = '';
	var dictionary = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

	for (var i = 0; i < length; i++) {
		result += dictionary.charAt(Math.floor(Math.random() * dictionary.length));
	}

	var resultArray = result.split('');
	result = '';
	resultArray.forEach(str => {
		result += str.charCodeAt().toString().padStart(3, 0);
	});

	return result.substring(0, length);
}

export function getASCIIXOR(str) {
	str = str.split('');
	for (let i = 0; i < str.length; i++)
		str[i] = str[i].charCodeAt();

	return parseInt(str.join('').toString().substring(0, 8));
}

export async function getPlainMessage(messageObj) {
	var message;
	if (messageObj.original) {
		message = messageObj.original;
	}
	else if (messageObj.encryptedMessage && messageObj.iv) {
		let privateKey = await decodePrivateKey(config.roomPrivateKeyBase64)
		let { secretKey } = await getSharedSecret(config.roomPublicKeyBase64, privateKey);
		message = await decryptMessage(secretKey, messageObj.iv, messageObj.encryptedMessage);
	}
	else if (typeof messageObj === 'string') {
		message = messageObj;
	}
	else {
		message = "";
	}

	return message;
}

export function copyTextToClipboard(text) {
	// 使用 Clipboard API 複製文字
	navigator.clipboard.writeText(text).then(() => {
		if (isMobile()) {
			Dialog.toastMessage("訊息複製成功", 'content_copy', 'white');
		}
	}).catch(err => {
		Logger.show(Logger.Types.ERROR, '複製失敗:', err);
	});
}