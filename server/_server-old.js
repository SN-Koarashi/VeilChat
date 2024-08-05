"use strict";
// 部分程式碼源自 https://github.com/SN-Koarashi/discord-bot_sis
const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const WebSocket = require('ws');
const SocketServer = WebSocket.Server;
const http = require('http');

//指定開啟的 port
const PORT = 8080;
const server = new http.createServer();

// SocketServer 開啟 WebSocket 服務
const wssSrv = new SocketServer({ server })
const clientList = {};
const clientListAddress = {};
const messageList = [];

//當 WebSocket 從外部連結時執行
wssSrv.on('connection', (ws, req) => {
    //連結時執行提示
	const ip = (req.connection.remoteAddress.match(/^(::ffff:192\.168\.)/ig))?req.headers['x-forwarded-for']:req.connection.remoteAddress;
	const port = req.connection.remotePort;
	const addressCrypt = cryptPwd(ip);
	const clientUID = crypto.randomUUID().toUpperCase();
	
	// 驗證使用者是否合法
	if(ip == req.headers['x-forwarded-for']){
		let url = req.url.split('=')[1];
		if(url != ip){
			onSender({
				type: 'forbidden',
				session: clientUID,
				message: 'Session Verify Failed'
			},ws);
			ws.close();
			console.log(`[INFO] Client ${ip} forbidden:`,clientUID);
			return;
		}
	}
	
	console.log(`[INFO] Client ${ip} connected:`,clientUID);
	
	// 將歷史訊息傳遞給目前登入之使用者工作階段(僅個人，非廣播)
	for(let m of messageList){
		onSender(m,ws);
	}

	// 接收訊息
	ws.on('message', async (msg) => {
		try{
			let obj;
			let data = JSON.parse(msg.toString());
			
			// 登入動作
			if(data.type == 'login'){
				console.log(`[INFO] Client ${ip} logged:`,clientUID);
				
				// 使用者IP <=> 工作階段列表的對應關係 (Array)
				if(!clientListAddress[addressCrypt])
					clientListAddress[addressCrypt] = [clientUID];
				else
					clientListAddress[addressCrypt].push(clientUID);
				
				// 使用者ID所對應之資料
				clientList[clientUID] = {
					username: "",
					id: port,
					address: addressCrypt
				};
				
				// 檢查並更新同一個使用者在所有工作階段中的暱稱
				for(let c of clientListAddress[addressCrypt])
					clientList[c].username = (data.username.length > 0)?data.username:"Unknown";
				
				
				// 將使用者列表廣播給所有人 (Object)
				obj = {
					user: clientList,
					type: 'profile'
				};
				
				// 將目前工作階段的資訊傳遞給目前連線的使用者工作階段(單個人，並非所有人)
				onSender({
					type: "verified",
					session: clientUID
				},ws);
			}
			// 刷新動作
			else if(data.type == 'refresh'){
				console.log(`[INFO] Client ${ip} recache:`,clientUID);
				
				// 檢查並更新同一個使用者在所有工作階段中的暱稱
				for(let c of clientListAddress[addressCrypt])
					clientList[c].username = (data.username.length > 0)?data.username:"Unknown";
				
				// 廣播更新後使用者列表給所有人 (Object)
				obj = {
					user: clientList,
					type: 'profile'
				};
			}
			// 其他動作(發送訊息)
			else{
				console.log(`[INFO] Client ${ip} sent message:`,clientUID);
				
				// 訊息所要包含的資訊
				obj = {
					session: clientUID,
					message: data.message.toString(),
					type: 'message'
				};

				// 將目前的訊息及發送訊息的使用者工作階段資訊記錄到歷史訊息中(在新使用者登入後要傳遞給他的)
				let objHistory = {
					session: clientUID,
					id: clientList[clientUID].id,
					username: clientList[clientUID].username,
					address: clientList[clientUID].address,
					time: new Date().getTime(),
					message: data.message.toString(),
					type: 'history'
				};
				messageList.push(objHistory);
			}
			
			
			// 傳遞上述建立物件 obj 之內容給所有使用者
			onSender(obj);
		}
		catch(err){
			console.log(err.message);
		}
	});
	

	// 使用者工作階段關閉連線
	ws.on('close', async (msg) => {
		console.log(`[INFO] Client ${ip} disconnected:`,clientUID);
		
		// 於使用者列表陣列及使用者所有工作階段陣列中刪除此工作階段
		delete clientList[clientUID];
		if(clientListAddress[addressCrypt]){
			var index = clientListAddress[addressCrypt].indexOf(clientUID);
			if (index !== -1) {
			  clientListAddress[addressCrypt].splice(index, 1);
			}
		}
		
		// 傳遞更新後的使用者列表給所有人
		let obj = {
			user: clientList,
			type: 'profile'
		};
		onSender(obj);
	});

});


// 訊息廣播函數
function onSender(contentObj,onlyClient){
	wssSrv.clients.forEach(function each(client) {
		// 只傳遞給連線中的使用者
		if (client.readyState === WebSocket.OPEN) {
			if(onlyClient == client) // 只廣播給單個客戶端(傳送歷史訊息)
				client.send(JSON.stringify(contentObj));
			else if(onlyClient === undefined) // 廣播給所有人
				client.send(JSON.stringify(contentObj));
		}
	});
}

function cryptPwd(password) {
    var md5 = crypto.createHash('md5');
    return md5.update(password).digest('hex').toUpperCase();
}

server.listen(PORT);
console.log(`[INFO] Listening on port ${PORT}`);