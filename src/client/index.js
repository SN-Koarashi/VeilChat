"use strict";
const path = require('path');
const fs = require('fs-extra');
const JSOF = require('javascript-obfuscator');
const UglifyJS = require("uglify-js");

var result;
var isDeploy = false;
console.log("[INFO]", "開始編譯", __dirname);

process.argv.forEach(function (val, index) {
	console.log("[INFO]", "獲取參數", index + ': ' + val);

	if (val == "--deploy") isDeploy = true;
});
console.log("---");
const inputData = fs.readFileSync(path.join(__dirname, "bin", "main.bundle.js"), { encoding: 'utf8', flag: 'r' });


console.log("[INFO]", "執行最小化作業");
result = UglifyJS.minify(inputData, {
	output: {
		preamble: `/*! 
 * Veil WebSocket WebChat
 * Powered by SNKms.com
 * Copyright 2023 Sky-Night Kamhu Mitor Seuna
 * Release date by ${new Date().toLocaleString('zh-TW', {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			timeZoneName: 'shortOffset',
			hour12: false
		})}
*/`}
});
fs.writeFileSync(path.join(__dirname, "bin", "main.temp.js"), result.code);
console.log("[INFO]", "最小化完成");

console.log("[INFO]", "執行混淆作業");
result = JSOF.obfuscate(result.code,
	{
		target: 'browser-no-eval',
		selfDefending: false,
		compact: true,
		controlFlowFlattening: true,
		controlFlowFlatteningThreshold: 1,
		numbersToExpressions: true,
		simplify: true,
		stringArrayShuffle: true,
		splitStrings: true,
		stringArrayThreshold: 1,
		domainLock: ['chat.snkms.com'],
		domainLockRedirectUrl: 'about:blank'
	}
);
var resultCode = result.getObfuscatedCode();

console.log("[INFO]", "混淆完成");
fs.writeFileSync(path.join(__dirname, "bin", "main.obfuscate.js"), resultCode);
result = UglifyJS.minify(resultCode, {
	output: {
		preamble: `/*! 
 * Veil WebSocket WebChat
 * Powered by SNKms.com
 * Copyright 2023 Sky-Night Kamhu Mitor Seuna
 * Release date by ${new Date().toLocaleString('zh-TW', {
			year: 'numeric',
			month: 'numeric',
			day: 'numeric',
			hour: 'numeric',
			minute: 'numeric',
			second: 'numeric',
			timeZoneName: 'shortOffset',
			hour12: false
		})}
*/`}
});
fs.writeFileSync(path.join(__dirname, "bin", "main.min.js"), result.code);

console.log("[INFO]", "混淆最小化完成");

var encrypted = result.code;

if (isDeploy) {
	console.log("[INFO]", "執行程式碼部署");
	fs.writeFileSync(path.join(__dirname, "public/js", "main.encrypted.js"), encrypted);
	console.log("[INFO]", "程式碼部署完成");
}