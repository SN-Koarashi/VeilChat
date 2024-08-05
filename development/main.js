"use strict";
const request = require('request');
const path = require('path');
const fs = require('fs-extra');
const { JSFuck } = require('./jsfuck.js');
const JSOF = require('javascript-obfuscator');
const UglifyJS = require("uglify-js");

const minifyAPI = "https://www.toptal.com/developers/javascript-minifier/api/raw";

var result;
var isDeploy = false;
var isEncrypt = false;
console.log("[INFO]","開始編譯");

process.argv.forEach(function (val, index, array) {
  console.log("[INFO]","獲取參數" ,index + ': ' + val);
  
  if(val == "--deploy") isDeploy = true;
  if(val == "--encrypt") isEncrypt = true;
});
console.log("---");
const inputData = fs.readFileSync(path.join(__dirname, "src", "main.js"),{encoding:'utf8', flag:'r'});

console.log("[INFO]","執行最小化作業");
result = UglifyJS.minify(inputData, {output:{preamble: `/*! 
 * XCoreNET WebSocket WebChat
 * Powered by SNKms.com
 * Copyright 2023 Sky-Night Kamhu Mitor Seuna
*/`}});
fs.writeFileSync(path.join(__dirname, "bin", "main.temp.js"), result.code);
console.log("[INFO]","最小化完成");

console.log("[INFO]","執行混淆作業");
var result = JSOF.obfuscate(result.code,
	{
		compact: false,
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

console.log("[INFO]","混淆完成");
fs.writeFileSync(path.join(__dirname, "bin", "main.obfuscate.js"), resultCode);

result = UglifyJS.minify(resultCode, {output:{preamble: `/*! 
 * XCoreNET WebSocket WebChat
 * Powered by SNKms.com
 * Copyright 2023 Sky-Night Kamhu Mitor Seuna
*/`}});
fs.writeFileSync(path.join(__dirname, "bin", "main.min.js"), result.code);
console.log("[INFO]","混淆最小化完成");

var encrypted;
if(isEncrypt){
	console.log("[INFO]","執行加密作業");
	encrypted = JSFuck.encode(result.code, true, true);
	fs.writeFileSync(path.join(__dirname, "bin", "main.encrypted.js"),encrypted);
	console.log("[INFO]","加密完成");
}
else{
	encrypted = result.code;
}

if(isDeploy){
	console.log("[INFO]","執行程式碼部署");
	fs.writeFileSync(path.join(__dirname, "../public/js", "main.encrypted.js"),encrypted);
	console.log("[INFO]","程式碼部署完成");
}

/*
request.post(minifyAPI, {form:{input: inputData}}, function(err,httpResponse,body){
	if(err)
		console.log(err);
	
	console.log("[INFO]","最小化完成");
	fs.writeFileSync(path.join(__dirname, "bin", "main.min.js"),body);


	var result = JSOF.obfuscate(body,
		{
			compact: false,
			controlFlowFlattening: true,
			controlFlowFlatteningThreshold: 1,
			numbersToExpressions: true,
			simplify: true,
			stringArrayShuffle: true,
			splitStrings: true,
			stringArrayThreshold: 1
		}
	);
	var resultCode = result.getObfuscatedCode();
	
	console.log("[INFO]","混淆完成");
	fs.writeFileSync(path.join(__dirname, "bin", "main.obfuscate.js"), resultCode);

	console.log("[INFO]","執行加密作業");
	const encrypted = JSFuck.encode(resultCode, true, true);
	fs.writeFileSync(path.join(__dirname, "bin", "main.encrypted.js"),encrypted);
	console.log("[INFO]","加密完成");
	
	if(isDeploy){
		console.log("[INFO]","執行程式碼部署");
		fs.writeFileSync(path.join(__dirname, "../js", "main.encrypted.js"),encrypted);
		console.log("[INFO]","程式碼部署完成");
	}
});
*/