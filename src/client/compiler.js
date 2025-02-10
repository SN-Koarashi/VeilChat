"use strict";
const path = require('path');
const fs = require('fs-extra');
const JSOF = require('javascript-obfuscator');
const UglifyJS = require("uglify-js");
const dotenv = require('dotenv');
const envConfig = { path: path.resolve(__dirname, '../../.env') };
dotenv.config(envConfig);

var result;
var isDeploy = false;

console.log("");
console.log("");
console.log(">", "Starting compile", __dirname);

process.argv.forEach(function (val, index) {
	console.log("variable", index + ': ' + val);

	if (val == "--deploy") isDeploy = true;
});
console.log("");
const inputData = fs.readFileSync(path.join(__dirname, "bin", "main.bundle.js"), { encoding: 'utf8', flag: 'r' });


console.log("Starting minify");
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
console.log("Minifying completed");

console.log("Starting obfuscate");
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
		domainLock: [process.env.APP_URL.replace(/^https:\/\//, '').replace('/', ''), 'localhost'],
		domainLockRedirectUrl: 'about:blank'
	}
);
var resultCode = result.getObfuscatedCode();

console.log("Obfuscating completed");
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

console.log("Minifying obfuscated file completed");

var encrypted = result.code;

if (isDeploy) {
	console.log("");
	console.log("> Starting deployment");
	fs.writeFileSync(path.join(__dirname, "public/js", "main.encrypted.js"), encrypted);
	console.log("Deploying completed");
}