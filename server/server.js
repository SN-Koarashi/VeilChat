"use strict";
// 部分程式碼源自 https://github.com/SN-Koarashi/discord-bot_sis
const path = require('path');
const crypto = require('crypto');
const fs = require('fs-extra');
const WebSocket = require('ws');
const SocketServer = WebSocket.Server;
const http = require('http');

// 指定開啟的 port
const PORT = 8080;
const server = new http.createServer();

// SocketServer 開啟 WebSocket 服務
const wssSrv = new SocketServer({ server })
const clientList = {};
const clientListID = {};
const roomTimer = {};
const roomCreatedTimestamp = {};
const roomList = {
	public: {},
	ncut: {}
};
const roomKeyPair = {};
const roomListReserved = ["ncut"];
// 儲存預先定義的密碼時需把明文進行兩次SHA256雜湊(預先定義的房間雖然可以有密碼但訊息不會加密)
const roomPassword = {
	public: null,
	ncut: null
};
const messageList = {
	public: {
		messages: [],
		type: "history"
	}
};

var debugMode = false;

process.argv.forEach(function (val, index, array) {
  if(val.startsWith("--debug")) debugMode = true;
});

wssSrv.binaryType = 'arraybuffer';
// 當 WebSocket 從外部連結時執行
wssSrv.on('connection', (ws, req) => {
    // 連結時執行提示
	const ip = (req.connection.remoteAddress.match(/^(::ffff:127\.0\.0\.1)/ig))?req.headers['x-forwarded-for']:req.connection.remoteAddress;
	const port = req.connection.remotePort;
	const addressCrypt = cryptPwd(ip);
	const clientUID = crypto.randomUUID().toUpperCase();
	var clientTokenHash;
	var clientID;
	
	if(!req.headers["origin"].match(/^https?:\/\/chat\.snkms\.com/ig)){
		ws.close();
		Logger("ERROR",`Client ${ip} forbidden because invalid origin:`,req.headers["origin"]);
		return;
	}

	
	// 驗證使用者是否合法
	if(ip != req.headers['x-forwarded-for']){
		onSender({
			type: 'forbidden',
			session: clientUID,
			message: 'Session Verify Failed'
		},ws);
		ws.close();
		Logger("ERROR", `Client ${ip} forbidden because ip verified failed:`, clientUID);
		return;
	}
	
	Logger("INFO", `Client ${ip} connected:`, clientUID);

	// 接收訊息
	ws.on('message', async (arraybuffer) => {
		try{
			var buf = new Buffer.from(arraybuffer);
			var msg = buf.map(b => b ^ 5026);
			
			if(!isJSONString(msg.toString())) return;
			
			let obj;
			let data = JSON.parse(msg.toString());
			
			if(debugMode){
				console.log(data);
			}
			
			// 登入動作
			if(data.type == 'login'){
				// 使用者所在的房間
				var locate = (data.location && data.location.match(/^([0-9a-zA-Z\-_]{1,16})$/g))?data.location:"public";
			
				// 如果訪問的房間不存在
				if(!roomList[locate]){
					Logger("WARN", `Client ${ip} trying to access a non-existent room #${locate}:`, clientUID);
					onSender({
						type: "notFound",
						session: clientUID,
						location: locate,
						previous: {
							location: clientList[clientUID]?.locate ?? null
						}
					}, ws);
					
					// 跳出後續步驟
					return;
				}
				
				// 如果房間有密碼
				if(roomPassword[locate] !== null){
					// 檢查登入要求是否攜帶密碼
					if(data.password !== undefined && typeof data.password === 'string' && data.password.trim().length > 0){
						// 如果攜帶的密碼與房間密碼不相同，則將使用者踢出房間
						if(getSHA256(data.password) !== roomPassword[locate]){
							Logger("WARN", `Client ${ip} has been kicked from #${locate} bacause wrong password:`, clientUID);
							onSender({
								type: "verifyFailed",
								session: clientUID,
								location: locate
							}, ws);
							
							// 跳出後續步驟
							return;
						}
					}
					// 沒攜帶密碼則要求驗證
					else{
						onSender({
							type: "requireVerify",
							session: clientUID,
							location: locate,
						}, ws);
						
						Logger("WARN", `Client ${ip} haven't take password in #${locate}:`, clientUID);
						
						// 跳出後續步驟
						return;
					}
				}
				
				if(data.token === undefined){
					onSender({
						type: 'forbidden',
						session: clientUID,
						message: 'Token Verify Failed'
					},ws);
					ws.close();
					Logger("ERROR", `Client ${ip} forbidden because token verified failed:`, clientUID);
					return;
				}
				
				clientTokenHash = getSHA256(data.token);
				
				// 生成使用者ID (判斷不同 WebSocket 實例)
				if(clientListID[clientTokenHash]){
					let maxTrying = 0;
					let randomID = getRandomID(9999);
					
					while(clientListID[clientTokenHash].includes(randomID) && maxTrying <= 30){
						randomID = getRandomID(9999);
						maxTrying++;
					}
					
					
					
					if(!clientListID[clientTokenHash].includes(randomID)){
						clientID = randomID;
						clientListID[clientTokenHash].push(randomID);
					}
					else{
						onSender({
							type: 'forbidden',
							session: clientUID,
							message: 'ID Verify Failed'
						},ws);
						ws.close();
						Logger("ERROR", `Client ${ip} forbidden because ID verified failed:`, clientUID);
						return;
					}
				}
				else{
					let randomID = getRandomID(9999);
					clientListID[clientTokenHash] = new Array();
					clientListID[clientTokenHash].push(randomID);
					clientID = randomID;
				}
				
				// 推送訊息到控制台
				Logger("INFO", `Client ${ip} logged in #${locate}:`, clientUID);
				
				// 如果先前有所在的房間，則從先前的房間踢出
				if(roomList[clientList[clientUID]?.locate]){
					if(roomList[clientList[clientUID].locate][clientTokenHash]){
						let k = 0;
						for(let c of roomList[clientList[clientUID].locate][clientTokenHash]){
							if(c.session == clientUID){
								roomList[clientList[clientUID].locate][clientTokenHash].splice(k, 1);
								break;
							}
							k++;
						}
						
						if(roomList[clientList[clientUID].locate][clientTokenHash].length == 0)
							delete roomList[clientList[clientUID].locate][clientTokenHash];
					}
					
					
					// 更新先前的房間的使用者列表
					onSender({
						user: roomList[clientList[clientUID].locate],
						type: 'profile'
					},null,clientList[clientUID].locate);
				}
				
				// 使用者工作階段資料
				let clientSession = {
					username: "",
					id: clientID,
					session: clientUID,
					signature: clientTokenHash,
					address: addressCrypt
				};
				
				// 在特定房間中所有工作階段的詳細資訊 (Array)
				if(!roomList[locate][clientTokenHash])
					roomList[locate][clientTokenHash] = [clientSession];
				else
					roomList[locate][clientTokenHash].push(clientSession);
				
				// 檢查並更新同一個使用者在房間中的所有工作階段的暱稱
				for(let c of roomList[locate][clientTokenHash]){
					c.username = data.username || "Unknown";
				}
				
				
				// 使用者工作階段的基本資訊
				clientList[clientUID] = {
					username: data.username,
					id: clientID, // 使用者工作階段數字ID
					address: addressCrypt, // IP位址雜湊
					signature: clientTokenHash, // 使用者特徵碼
					locate: locate, // 使用者工作階段與所在房間的對應關係
					instance: ws // 使用者工作階段的 WebSocket 實例
				};
				
				// 將使用者列表廣播給所有人 (Object)
				obj = {
					user: roomList[locate],
					type: 'profile'
				};
				
				// 將目前工作階段的資訊傳遞給目前連線的使用者工作階段(單個人，並非所有人)
				onSender({
					type: "verified",
					session: clientUID,
					signature: clientTokenHash,
					location: locate,
					isReserved: (roomListReserved.indexOf(locate) === -1) ? false : true,
					publicKeyBase64: (roomKeyPair[locate])?roomKeyPair[locate].publicKey:null,
					creatorPrivateKeyBase64: (roomKeyPair[locate])?roomKeyPair[locate].privateKey:null
				},ws);
				
				// 將房間內的歷史訊息傳遞給目前連線的使用者工作階段(單個人，並非所有人)
				if(messageList[locate] && messageList[locate].messages && messageList[locate].messages.length > 0)
					onSender(messageList[locate],ws);
				
				// 傳遞上述建立物件 obj 之內容給房間中的所有使用者
				onSender(obj,null,locate);
			}
			// 建立私聊
			else if(data.type == 'create'){
				var j = 0;
				var locate = makeID(8);
				while(roomList[locate]){
					if(j > 15) break;
					
					locate = makeID(8);
					j++;
				}
				
				
				if(j > 15 || data.session != clientUID){
					onSender({
						type: "verified",
						session: clientUID,
						location: locate,
						status: "private_failed",
						message: "私聊建立失敗"
					},ws);
				}
				else{
					roomList[locate] = {};
					roomPassword[locate] = (data.password && data.password.length > 0) ? getSHA256(data.password) : null;
					roomKeyPair[locate] = {
						publicKey: data.publicKeyBase64,
						privateKey: data.creatorPrivateKeyBase64
					};
					roomCreatedTimestamp[locate] = new Date().getTime();
					
					onSender({
						type: "verified",
						session: clientUID,
						status: "private_created",
						hasPassword: (data.password && data.password.length > 0)?true:false,
						location: locate,
						publicKeyBase64: roomKeyPair[locate].publicKey,
						creatorPrivateKeyBase64: roomKeyPair[locate].publicKey
					},ws);
				}
			}
			// 刷新動作
			else if(data.type == 'refresh'){
				Logger("INFO", `Client ${ip} recache:`, clientUID);
				var locate = (data.location && roomList[data.location])?data.location:"public";
				
				// 檢查並更新同一個使用者在房間中的所有工作階段的暱稱
				for(let c of roomList[locate][clientTokenHash]){
					c.username = data.username || "Unknown";
				}
				
				// 廣播更新後使用者列表給所有人 (Object)
				obj = {
					user: roomList[locate],
					type: 'profile'
				};
				
				// 傳遞上述建立物件 obj 之內容給房間中的所有使用者
				onSender(obj,null,locate);
			}
			// 發送訊息
			else if(data.type == "message"){
				var locate = (data.location && roomList[data.location])? data.location: null;
				if(locate == null){
					onSender({
						type: "forbidden",
						session: clientUID,
						signature: clientTokenHash,
						message: "No chat room exist"
					},ws);
					
					return;
				}
				
				
				Logger("INFO", `Client ${ip} sent message in #${locate}:`, clientUID);
				
				// 訊息所要包含的資訊
				obj = {
					session: clientUID,
					message: data.message,
					signature: clientTokenHash,
					location: locate,
					type: 'message'
				};

				// 將目前的訊息及發送訊息的使用者工作階段資訊記錄到歷史訊息中(在新使用者登入後要傳遞給他的)
				let objHistory = {
					message_id: getSHA256(clientList[clientUID].signature + crypto.randomUUID()).toUpperCase(),
					session: clientUID,
					id: clientList[clientUID].id,
					username: clientList[clientUID].username,
					address: clientList[clientUID].address,
					signature: clientList[clientUID].signature,
					time: new Date().getTime(),
					message: data.message,
					location: locate,
					type: 'history'
				};
				
				if(!messageList[locate])
					messageList[locate] = {
						messages: [objHistory],
						type: "history"
					};
				else
					messageList[locate].messages.push(objHistory);
				
				// 傳遞上述建立物件 obj 之內容給房間中的所有使用者
				onSender(obj,null,locate);
			}
			// 傳送悄悄話 (悄悄話會在重新整理後消失，不會顯示在訊息歷史中)
			else if(data.type == "privateMessage"){
				Logger("INFO", `Client ${ip} sent private message:`, clientUID);
				var locate = (data.location && roomList[data.location])?data.location:"public";
				
				// 訊息所要包含的資訊
				obj = {
					source: {
						session: clientUID,
						username: clientList[clientUID].username,
						signature: clientTokenHash,
					},
					signature: data.signature,
					message: data.message,
					location: locate,
					type: 'privateMessage'
				};
				
				// 傳遞上述建立物件 obj 之內容給悄悄話對象工作階段
				// !! 有可能對象根本不在該房間內，所以要使用可選連結語句 !!
				roomList[locate][data.signature]?.forEach(clientData => {
					onSender(obj, clientList[clientData.session].instance);
				});
			}
			else{
				Logger("WARN", `Client ${ip} invalid type:`, clientUID);
			}
		}
		catch(err){
			console.log(err);
		}
	});
	

	// 使用者工作階段關閉連線
	ws.on('close', async (msg) => {
		Logger("INFO", `Client ${ip} disconnected:`, clientUID);
		let locate = clientList[clientUID]?.locate;
		
		// 於使用者列表陣列及使用者所有工作階段陣列中刪除此工作階段
		if(roomList[locate]){
			// 將使用者工作階段自房間列表中刪除
			if(roomList[locate][clientTokenHash]){
				let k = 0;
				for(let c of roomList[locate][clientTokenHash]){
					if(c.session == clientUID){
						roomList[locate][clientTokenHash].splice(k, 1);
						break;
					}
					k++;
				}
				
				if(roomList[locate][clientTokenHash].length == 0)
					delete roomList[locate][clientTokenHash];
			}
		
			delete clientList[clientUID];
			
			clientListID[clientTokenHash].splice(clientListID[clientTokenHash].indexOf(clientID), 1);
			
			if(roomList[locate] && Object.keys(roomList[locate]).length == 0 && locate.match(/^([0-9a-zA-Z\-_]{8})$/g) && roomListReserved.indexOf(locate) === -1){
				roomTimer[locate] = setTimeout(()=>{
					if(roomList[locate] && Object.keys(roomList[locate]).length == 0){
						delete roomList[locate];
						delete messageList[locate];
						delete roomTimer[locate];
						delete roomKeyPair[locate];
						delete roomCreatedTimestamp[locate];
						
						// 推送清除訊息到控制台
						Logger("WARN", `Deleted channel #${locate} and its message history.`);
					}
				},60000);
			}

			// 傳遞更新後的使用者列表給所有人
			let obj = {
				user: roomList[locate],
				type: 'profile'
			};
			onSender(obj,null,locate);
		}
	});

});

// 建立私聊ID
function makeID(length) {
    var result           = '';
    var charactersMax       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
    var charactersMin       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	
    for ( var i = 0; i < length; i++ ) {
		if(i == 0 || i == length - 1)
			result += charactersMin.charAt(Math.floor(Math.random() * charactersMin.length));
		else
			result += charactersMax.charAt(Math.floor(Math.random() * charactersMax.length));
   }
   return result;
}

function getRandomID(max) {
  return Math.floor(Math.random() * max).toString().padStart(4,0);
}

// 檢查是不是JSON
function isJSONString(jsonString){
    try {
        var o = JSON.parse(jsonString);
        if (o && typeof o === "object") {
            if(o.type)
				return true;
        }
    }
    catch (e) { }

    return false;
};

// 訊息廣播函數
function onSender(contentObj,onlyClient,locate){
	wssSrv.clients.forEach(function each(client) {
		// 只傳遞給連線中的使用者
		if (client.readyState === WebSocket.OPEN) {
			if(onlyClient == client) // 只廣播給單個客戶端(傳送歷史訊息、悄悄話)
				client.send(stringToArrayBuffer(JSON.stringify(contentObj)));
			else if(locate != null){
				let room = roomList[locate];
				
				for(let r in room){
					for(let c of room[r]){
						let ws = clientList[c.session].instance;
						if(ws == client)
							client.send(stringToArrayBuffer(JSON.stringify(contentObj)));
					}
				}
			}
		}
	});
}

function stringToArrayBuffer(str) {
    var binary_string = Buffer.from(str, 'utf8').toString('binary');
    var len = binary_string.length;
    var bytes = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }    

	var buf = new Buffer.from(bytes.buffer);
	var msg = buf.map(b => b ^ 5026);

    return msg;
}

function cryptPwd(password) {
    var md5 = crypto.createHash('md5');
    return md5.update(password).digest('hex').toUpperCase();
}

function getSHA256(str) {
    var hash = crypto.createHash('sha256');
    return hash.update(str).digest('hex').toUpperCase();
}

function escapeHTML(s) {
    let lookup = {
        '&': "&amp;",
        '"': "&quot;",
        '\'': "&apos;",
        '<': "&lt;",
        '>': "&gt;"
    };
    return s.replace( /[&"'<>]/g, c => lookup[c] );
}

function Logger(stats, ...message){
	var date = new Date();
	var year = date.getFullYear();
	var month = ('0'+(date.getMonth()*1+1)).substr(-2);
	var day = ('0'+date.getDate()).substr(-2);
	var hour = ('0'+date.getHours()).substr(-2);
	var minute = ('0'+date.getMinutes()).substr(-2);
	var second = ('0'+date.getSeconds()).substr(-2);
	
	var StrtoDate = `${month}-${day} ${hour}:${minute}:${second}`;
	if(stats == 'INFO'){
		var color = '\x1b[32m';
	}
	if(stats == 'WARN'){
		var color = '\x1b[33m';
	}
	if(stats == 'ERROR'){
		var color = '\x1b[31m';
	}
	
	console.log(`\x1b[0m${StrtoDate}`,`[${color}${stats}\x1b[0m]`,`${message.join(" ")}\x1b[0m`);
}

server.listen(PORT, ()=>{
	Logger("WARN", `Socket Server is Listening on Port ${server.address().port}`);
	
	// 全域計時器
	setInterval(()=>{
		// 循環查找所有房間，刪除未刪除的無人房間 (建立時間須達30秒以上)
		for(let locate in roomList){
			const nowTime = new Date().getTime();
			if(
				roomList[locate] && 
				Object.keys(roomList[locate]).length == 0 && 
				locate.match(/^([0-9a-zA-Z\-_]{8})$/g) && 
				roomListReserved.indexOf(locate) === -1 &&
				(nowTime - roomCreatedTimestamp[locate]) > 30000
			){
				delete roomList[locate];
				delete messageList[locate];
				delete roomTimer[locate];
				delete roomKeyPair[locate];
				delete roomCreatedTimestamp[locate];
				
				// 推送清除訊息到控制台
				Logger("WARN", `Deleted channel #${locate} and its message history by global timer.`);
			}
		}
	}, 180000);
});