/*! 
 * Veil WebSocket WebChat
 * Powered by SNKms.com
 * Copyright 2023 Sky-Night Kamhu Mitor Seuna
 */
"use strict";
// 全域變數
window.scrollBottom = true;

// start of immediately function
(function($, window){
const CDNServer = "https://media.snkms.org";
const CDNRedirect = "https://chat.snkms.com/cdn";
const MainDomain = "https://chat.snkms.com";
const lang = navigator.language || window.localStorage.getItem('lang') || 'en';
const isDebugger = window.localStorage.getItem('debugger') ? true : false;

var wss,
	token,
	crcTableGlobal,
	privateChatTarget,
	localStorage = window.localStorage,
	crypto = window.crypto,
	roomPassword = undefined,
	roomPublicKeyBase64 = undefined,
	roomPrivateKeyBase64 = undefined,
	clientList = {},
	inviteList = [],
	userName = "Unknown",
	locate = "public",
	sessionSelf,
	tokenHashSelf,
	isInited = false,
	denyCount = 0;

async function WebSocketBinaryHandler(obj){
	var str;
	
	if(obj.message && roomPassword && roomPublicKeyBase64 && roomPrivateKeyBase64 && locate != "public"){
		let privateKey = await decodePrivateKey(roomPrivateKeyBase64)
		let {secretKey} = await getSharedSecret(roomPublicKeyBase64, privateKey);

		obj.message = await encryptMessage(secretKey, obj.message.original.toString());
		str = JSON.stringify(obj);
	}
	else{
		str = JSON.stringify(obj);
	}
	
	var enc = new TextEncoder();
	var arr = enc.encode(str);
	for(let i = 0; i < arr.length; i++)
		arr[i] ^= 5026;
	
	wss.send(arr);
}

function grtASCIIXOR(str){
    var str = str.split('');
    for(let i = 0; i < str.length; i++)
        str[i] = str[i].charCodeAt();

    return parseInt(str.join('').toString().substring(0,8));
}

function WebSocketConnect(){
	if(denyCount > 5){
		return;
	}
	
	wss = new WebSocket('wss://api.snkms.com:443/ws');
	wss.binaryType = 'arraybuffer';
	
	wss.onopen = () => {
		Logger.show(Logger.Types.LOG,'[WebSocketHandler]',{type: "init", reason:"server connected"});
		let toast = "與伺服器連線成功";
		if(isMobile())
			snkms.toastMessage(toast, 'signal_cellular_alt', 'green');
		else
			snkms.success(toast);

		let joinLocation = $('#room_id').val();
		if(isMobile() && localStorage.getItem('lastRoom') && location.pathname.match(/^\/private\/([0-9A-Za-z\-_]+)/ig) === null){
			joinLocation = localStorage.getItem('lastRoom');
		}
		
		WebSocketBinaryHandler({
			type: 'login',
			token: token,
			username: userName,
			location: joinLocation
		});
		
		onScroll(false);
	}
	
	wss.onclose = (e) => {
		Logger.show(Logger.Types.LOG,'[WebSocketHandler]',{type: "init", reason:"server disconnected"});
		onScroll(false);
		let toast = "與伺服器連線失敗: "+e.code;
		
		if(isMobile())
			snkms.toastMessage(toast, 'close', 'red', function(){
				WebSocketConnect();
			});
		else
			snkms.error(toast, function(){
				WebSocketConnect();
			});
	}
	
	wss.onerror = () => {
		Logger.show(Logger.Types.LOG,'[WebSocketHandler]',{type: "init", reason:"server occurred error"});
	}
	
	wss.onmessage = (e) => {
		var uint8View = new Uint8Array(e.data);
		var enc = new TextDecoder("utf-8");
		var arr = uint8View;
		for(let i = 0; i < arr.length; i++)
			arr[i] ^= 5026;
		
		const data = JSON.parse(enc.decode(arr));
		Logger.show(Logger.Types.LOG,"[WebSocketHandler]",data);

		// 目前房間的使用者列表
		if(data.type == 'profile'){
			var downList = [];
			
			$('.userWrapper #dropdown.down').each(function(){
				let downId = $(this).parent().attr('id');
				
				if(downList.indexOf(downId) === -1)
					downList.push(downId);
			});
			
			$('.userWrapper').empty();
			
			
			var uList = data.user;
			clientList = Object.assign({}, uList);

			// 使用者數量(Token)
			var userCount = Object.keys(clientList).length;
			$('.userList > .userTitle > span').text(userCount);
			$('.userList > .userTitle > span').addClass('display');

			for(let u in uList){
				uList[u].forEach(e =>{
					if($('.userWrapper').find(`#${u}`).length == 0)
						$('.userWrapper').append(`<div title="${e.username}#${crc32(u)}" id="${u}" data-ripple>`);
					
					if($('.userWrapper').find(`#${u} #username`).length == 0){
						$('.userWrapper').find(`#${u}`).append(`<div id="username"><author></author><pid></pid></div>`);
						$('.userWrapper').find(`#${u}`).append(`<div id="sessionList"></div>`);
						$('.userWrapper').find(`#${u}`).append(`<div id="dropdown"><div></div></div>`);
					}
					
					$('.userWrapper').find(`#${u} #username author`).text(`${e.username}`);
					$('.userWrapper').find(`#${u} #username pid`).text(`#${crc32(u)}`);
					$('.userWrapper').find(`#${u} #sessionList`).append(`<span id="session" data-id="${e.session}">${e.id}</span>`);
					
					if(downList.indexOf(u) !== -1){
						$('.userWrapper').find(`#${u} #dropdown`).addClass('down');
						$('.userWrapper').find(`#${u} #sessionList`).show();
					}
				});
			}
			
			// 顯示多個工作階段
			$('.userWrapper > div').each(function(){
				let k = 0;
				let length = $(this).find('span').length;

				$(this).find('span').each(function(){
					k++;
					if(k == length){
						$(this).addClass('last');
					}
				});
			});
			
			$('.lobby > .chat').find(`author[data-self-id="${crc32(tokenHashSelf)}"]`).addClass('sameWorker');
			$('.userWrapper').find(`#session[data-id="${sessionSelf}"]`).addClass('me');
		}
		// 使用者資訊驗證完成，可加入房間
		else if(data.type == 'verified'){
			const tempLocate = locate;
			locate = data.location;
			sessionSelf = data.session;
			tokenHashSelf = data.signature;
			$('.settings_footer span').text(sessionSelf);
			
			// 無狀態參數，表示為加入房間
			if(!data.status){
				let channelName = (locate == "public")?"#大廳":(data.isReserved)?"#房間 "+locate:"#私聊 "+locate;
				
				$('.lobby > .chat').empty();
				$('.lobby > .chat').append(`<div data-id="system" data-ripple>目前位置為 ${channelName}</div>`);
				$('.channelName').text(channelName);
				$('.headerTitle').text(channelName);
				$('.textPlaceholder').text(`傳訊息到 ${channelName}`);
				//document.title = channelName + " | XCoreNET 匿名聊天室 - 天夜之心";
				document.title = channelName + " | EEACC - 端對端加密之社群匿名聊天系統";
				
				if(data.isReserved || locate === "public" || !data.publicKeyBase64){
					roomPublicKeyBase64 = undefined;
					roomPrivateKeyBase64 = undefined;
				}
				else{
					roomPublicKeyBase64 = data.publicKeyBase64;
					roomPrivateKeyBase64 = data.creatorPrivateKeyBase64;
				}
				
				
				if(locate == "public"){
					if(isInited || window.location.pathname !== "/")
						window.history.pushState(null, document.title, "/");
				}
				else{
					window.history.pushState(null, document.title, '/private/'+locate);
					let toast = "加入成功";
					if(isMobile())
						snkms.toastMessage(toast, 'done', 'green');
					else
						snkms.success(toast);
					
					if(!data.isReserved){
						$('.lobby > .chat').append(`<div data-id="system" data-ripple>臨時私聊房間位置及其所有訊息會在所有使用者離開後60秒自動銷毀</div>`);
						
						if(roomPassword && roomPrivateKeyBase64 && roomPublicKeyBase64){
							$('.lobby > .chat').append(`<div data-id="system" data-ripple>具有密碼之私聊房間的訊息將受到端對端加密保護</div>`);
						}
					}
				}
			}
			// 有狀態參數，表示私人房間建立狀態回傳
			else{
				if(data.status == "private_failed"){
					locate = "public";
					let toast = data.message;
					if(isMobile())
						snkms.toastMessage(toast, 'close', 'red');
					else
						snkms.error(toast);

				}
				else if(inviteList.length > 0){
					inviteList.forEach(s => {
						privateChat(s, `[invite]${locate}[/invite]`, tempLocate);
					});
					
					inviteList = [];
				}
				
				hashString(roomPassword).then(pwd => {
					WebSocketBinaryHandler({
						type: 'login',
						token: token,
						username: userName,
						location: locate,
						password: pwd
					});
				});
			}
			
			if(locate === 'public'){
				$('#publicChat').hide();
			}
			else{
				$('#publicChat').show();
			}
			
			
			localStorage.setItem('lastRoom', locate);
			isInited = true;
		}
		// 聊天訊息歷史紀錄
		else if(data.type == 'history'){
			let index = 0;
			data.messages.forEach(e => {
				index++;
				setTimeout(()=>{
					onMessage(data.type,e.session,e.signature,e.username,e.id,e.message,e.time);
					onScroll(true);
				},1*index);
			});
		}
		// 傳送訊息
		else if(data.type == 'message'){
			onMessage(data.type,data.session,data.signature,clientList[data.signature]?.at(0).username,clientList[data.signature]?.at(0).id,data.message,new Date().getTime());
		}
		// 傳送悄悄話訊息
		else if(data.type == 'privateMessage'){
			onMessage(data.type,"private",data.source.signature,clientList[data.source.signature]?.at(0).username,clientList[data.source.signature]?.at(0).id,data.message,new Date().getTime());
		}
		// 伺服器禁止連線
		else if(data.type == 'forbidden'){
			$('.lobby > .chat').append(`<div data-id="system">伺服器拒絕您的連線: ${data.message}</div>`);
			
			if(locate != "public"){
				WebSocketBinaryHandler({
					type: 'login',
					token: token,
					username: userName,
					location: 'public',
				});
			}
			
			denyCount++;
		}
		// 房間密碼認證失敗
		else if(data.type == 'verifyFailed'){
			let toast = "密碼錯誤";
			if(isMobile())
				snkms.toastMessage(toast, 'close', 'red');
			else
				snkms.error(toast);
			passwordVerify(data.location);
		}
		// 進入房間需要密碼認證
		else if(data.type == 'requireVerify'){
			passwordVerify(data.location);
		}
		// 進入的房間不存在
		else if(data.type == 'notFound'){
			let toast = "#房間 "+ data.location + " 已不存在";
			if(isMobile())
				snkms.toastMessage(toast, 'close', 'red');
			else
				snkms.error(toast);
			
			if(!data.previous.location){
				WebSocketBinaryHandler({
					type: 'login',
					token: token,
					username: userName,
					location: "public"
				});
			}
		}
		// 未知/未定義的事件類型
		else{
			Logger.show(Logger.Types.WARN,'Unknown type',data.type);
		}
	}
}

async function passwordVerify(location){
	snkms.prompt("密碼認證",`進入房間 #${location} 需要輸入密碼`,"",function(evt,value){
		roomPassword = value;
		
		hashString(value).then(pwd => {
			WebSocketBinaryHandler({
				type: 'login',
				token: token,
				username: userName,
				location: location,
				password: pwd
			});
		});
	},function(){
		roomPassword = undefined;
		WebSocketBinaryHandler({
			type: 'login',
			token: token,
			username: userName,
			location: "public"
		});
		
		let toast = "您已離開房間並回到大廳";
		if(isMobile())
			snkms.toastMessage(toast, 'logout', 'red');
		else
			snkms.error(toast);
	});
}

async function onMessage(messageType,session,signature,username,id,messageObj,timestamp){
	var message;
	if(messageObj.original){
		message = messageObj.original;
	}
	else if(messageObj.encryptedMessage && messageObj.iv){
		let privateKey = await decodePrivateKey(roomPrivateKeyBase64)
		let {secretKey} = await getSharedSecret(roomPublicKeyBase64, privateKey);
		message = await decryptMessage(secretKey, messageObj.iv, messageObj.encryptedMessage);
	}
	else if(typeof messageObj === 'string'){
		message = messageObj;
	}
	else{
		message = "";
	}
	
	let date = new Date(timestamp);
	let year = date.getFullYear();
	let month = (date.getMonth()+1 < 10)?'0'+(date.getMonth()+1):date.getMonth()+1;
	let day = (date.getDate() < 10)?'0'+date.getDate():date.getDate();
	let hour = (date.getHours() < 10)?'0'+date.getHours():date.getHours();
	let minute = (date.getMinutes() < 10)?'0'+date.getMinutes():date.getMinutes();
	let randomSeed = randomASCIICode(18);
	
	while($('.lobby > .chat div[data-id="T'+randomSeed+'"]').length > 0){
		randomSeed = randomASCIICode(18);
	}
	
	if(messageType.startsWith("privateMessage")){
		let sourceText = "[悄悄話]";
		if(messageType.endsWith("Source"))
			sourceText = "[發送給]";
		
		$('.lobby > .chat').append(`<div data-id="T${randomSeed}" data-ripple><author data-id="${session}" data-user="${signature}" title="${username}#${crc32(signature)}" class="private">${sourceText} ${username}#${crc32(signature)}</author> <span title="${year}/${month}/${day} ${hour}:${minute}">${DateFormatter(timestamp)}</span><div data-convert="true" class="msgWrapper"></div></div>`);
	}
	else{
		$('.lobby > .chat').append(`<div data-id="T${randomSeed}" data-ripple><author data-id="${session}" data-user="${signature}" data-self-id="${crc32(signature)}" class="${session}" title="${username}#${crc32(signature)}">${username}#${crc32(signature)}</author> <span title="${year}/${month}/${day} ${hour}:${minute}">${DateFormatter(timestamp)}</span><div data-convert="true" class="msgWrapper"></div></div>`);
	}
	
	// 將訊息內容放入
	$('.lobby > .chat div[data-id="T'+randomSeed+'"]').find('div.msgWrapper').text(message);
	
	
	var messageArray = $('.lobby > .chat div.msgWrapper[data-convert="true"]').toArray();
	for(let msg of messageArray){
		let content = $(msg).text();
		let formatterContent = ContentFormatter(content);
		
		$(msg).html(formatterContent);
			
		$(msg).find("pre code").each(function(){
			hljs.highlightElement(this);
		});
			
		$(msg).removeAttr('data-convert');
	}
	
	$('.lobby > .chat').find(`.${sessionSelf}`).addClass('me');
	
	if(clientList[tokenHashSelf] && !$('.lobby > .chat').find(`author[data-self-id="${crc32(tokenHashSelf)}"]`).hasClass('me'))
		$('.lobby > .chat').find(`author[data-self-id="${crc32(tokenHashSelf)}"]`).addClass('sameWorker');
	
	onScroll(messageType == "history");
}

function DateFormatter(timestamp){
	let date = new Date(timestamp);
	let year = date.getFullYear();
	let month = (date.getMonth()+1 < 10)?'0'+(date.getMonth()+1):date.getMonth()+1;
	let day = (date.getDate() < 10)?'0'+date.getDate():date.getDate();
	let hour = (date.getHours() < 10)?'0'+date.getHours():date.getHours();
	let minute = (date.getMinutes() < 10)?'0'+date.getMinutes():date.getMinutes();
	
	let nowDate = `${year}/${month}/${day}`;
	let dateLineTimestamp = new Date((Math.floor((new Date().getTime()-(new Date().getTimezoneOffset()/60 * 3600000))/86400000)*86400000) + (new Date().getTimezoneOffset()/60 * 3600000));
	let diffTime = new Date(timestamp).getTime()/1000 - new Date(dateLineTimestamp).getTime()/1000;
	
	if(diffTime >= 0){
		return `今天 ${hour}:${minute}`;
	}
	else if(diffTime < 0 && diffTime >= -86400){
		return `昨天 ${hour}:${minute}`;
	}
	else if(diffTime < -86400 && diffTime >= -172800){
		return `前天 ${hour}:${minute}`;
	}
	else{
		return `${year}/${month}/${day}`;
	}
}

function ContentFormatter(text){
  text = ParseBBCode(text); // 將表情及網址關鍵字轉換為BBCode
  text = escapeHtml(text); // 跳脫HTML字串
  text = urlify(text); // 將網址依規則作特定處理
  text = parseInviteLink(text); // 轉換邀請碼網址為樣式卡
  text = parseInviteCode(text); // 轉換邀請碼為樣式卡
  text = emojify(text); // 轉換表情符號
  text = parseCodeArea(text); // 程式碼區塊

  return text;
}

function SizeFormatter(size){
	if(size > 1048576)
		return (Math.round(size/1024/1024*100)/100) + " MB";
	else if(size > 1024)
		return (Math.round(size/1024*100)/100) + " KB";
	else
		return size + " Bytes";
}

function toggleSidebar($element,flag,openDirection){
	if(window.innerWidth > 480) return;
	
	if(flag){
		//$element.css(openDirection,"5px");
		$("#sender").blur();
		$element.attr("data-open",true);
		$element.css(openDirection,'');
		$element.addClass('hasAnime');
		
		$(".lobby, #container, .channelHeader").css(openDirection,'');
		$(".lobby > .menu").css('right','');
		
		$('body').attr('style','overflow:hidden;');
		$(".channelHeader, #container, .lobby, .lobby > .menu").addClass("hasAnime");
		$(".lobby").addClass("inHidden");
		$(".messageBox #container").addClass("inHidden");
		$(".lobby").addClass(openDirection);
		$(".lobby > .menu").addClass(openDirection);
		$(".channelHeader").addClass(openDirection);
		$(".messageBox #container").addClass(openDirection);
		$(".openBackground").fadeIn(250,function(){
			$(this).addClass('hasAnime');
			$(this).css('opacity',1);
		});
		//$(".menu").fadeOut(250);
	}
	else{
		//$element.css(openDirection,"-100vw");
		$element.removeAttr("data-open");
		$element.css(openDirection,'');
		
		$(".lobby, #container, .channelHeader").css(openDirection,'');
		$(".lobby > .menu").css('right','');
		
		$('body').attr('style','');
		$(".lobby").removeClass("inHidden");
		$(".messageBox #container").removeClass("inHidden");
		$(".lobby").removeClass(openDirection);
		$(".lobby > .menu").removeClass(openDirection);
		$(".channelHeader").removeClass(openDirection);
		$(".messageBox #container").removeClass(openDirection);
		$(".openBackground").fadeOut(250,function(){
			$(".channelHeader").removeClass("hasAnime");
			$(this).removeClass('hasAnime');
			$(this).css('opacity',0);
		});
		
		//$(".menu").fadeIn(250);
	}
}

function privateChat(targetSignature, message, previousLocate){
	if(!clientList[targetSignature]){
		let toast = "該使用者已不在此聊天室";
		if(isMobile())
			snkms.toastMessage(toast, 'close', 'red');
		else
			snkms.error(toast);
		return;
	}
	
	if(targetSignature == tokenHashSelf){
		let toast = "不要對自己說悄悄話";
		if(isMobile())
			snkms.toastMessage(toast, 'close', 'red');
		else
			snkms.error(toast);
		return;
	}
	
	if(message){
		WebSocketBinaryHandler({
			type: 'privateMessage',
			signature: targetSignature,
			message: {
				original: message
			},
			location: previousLocate ?? locate // 有攜帶前一房間位置的話就使用前一房間位置 (通常發生於建立私人房間的同時透過UI邀請對象)
		});
		
		onMessage("privateMessageSource","private",targetSignature,clientList[targetSignature]?.at(0).username,clientList[targetSignature]?.at(0).id,message,new Date().getTime());
	}
	else{
		/*
		// 舊版悄悄話模式
		if($("#sender").text().length > 0 || isMobile()){
			snkms.prompt("傳送悄悄話",`傳送悄悄話給 ${clientList[targetSignature]?.at(0).username}#${crc32(targetSignature)}`,targetSignature,function(e,value){
				WebSocketBinaryHandler({
					type: 'privateMessage',
					signature: targetSignature,
					message: {
						original: value
					},
					location: locate
				});
				onMessage("privateMessageSource","private",targetSignature,clientList[targetSignature]?.at(0).username,clientList[targetSignature]?.at(0).id,{original: value},new Date().getTime());
			});
		}
		else{
			$("#sender").text(`/msg ${targetSignature} `);
			$("#sender").focus();
			
			// 移動至末尾
			var range = document.getSelection().getRangeAt(0);
			range.setStart(range.startContainer, range.startContainer.length);
			range.setEnd(range.startContainer, range.startContainer.length);
			document.getSelection().removeAllRanges();
			document.getSelection().addRange(range);
		}
		*/
		
		privateChatTarget = targetSignature;
		if($('.lobby > .privateStatus').length === 0){
			$('.lobby').append('<div class="privateStatus"><div class="privateText">悄悄話 <span></span></div><div title="關閉悄悄話模式" class="privateButton"><img src="'+MainDomain+'/images/close_black.png" /></div></div>');
		}
		$('.lobby > .privateStatus > .privateText > span').text(`${clientList[targetSignature]?.at(0).username}#${crc32(targetSignature)}`);
	}
}

function compressImagePromise(file,flag){
	return new Promise((resolve, reject)=>{
		if(file.type.startsWith("image/")){
			if(file.size > 6291456 || flag){
				Logger.show(Logger.Types.LOG,"[CompressionHandlerPromise]",file.name,"Starting reader...");
				 var reader = new FileReader();
				 reader.onload = function(event){
					let imageURL = event.target.result;
					let newImg = new Image();
					newImg.onload = function(){
						Logger.show(Logger.Types.LOG,"[CompressionHandlerPromise]",file.name,"Starting compressing...","Quality:",0.75);
						let cvs = document.createElement('canvas');
						let ctx = cvs.getContext('2d');
						cvs.width = newImg.naturalWidth;
						cvs.height = newImg.naturalHeight;
						ctx.drawImage(newImg,0,0,newImg.naturalWidth,newImg.naturalHeight,0,0,cvs.width,cvs.height);

						cvs.toBlob(function(blob){
							Logger.show(Logger.Types.LOG,"[CompressionHandlerPromise]",file.name,"Compressed.");
							resolve(blob);
						}, 'image/webp', 0.75);
					};
						
					newImg.src = imageURL;
				 };
				 reader.onerror = function () {
					 reject("[CompressionHandlerPromise] There was an issue reading the file. " + reader.error);
				 };
				 reader.readAsDataURL(file);
			}
			else{
				Logger.show(Logger.Types.LOG,"[CompressionHandlerPromise]",file.name,"has less than 6MB, skipping...");
				resolve(file);
			}
		}
		else{
			Logger.show(Logger.Types.LOG,"[CompressionHandlerPromise]",file.name,"is not a image.");
			resolve(file);
		}
	});
}

async function compressImage(files){
	$("#progress").css('background','red');
	$("#circle").addClass('red');
	$("#circle").show();
	
	let toast = "正在執行本機壓縮處理程序...";
	if(isMobile())
		snkms.toastMessage(toast, 'loop', 'green');
	else
		snkms.success(toast);
	
	let newFiles = new Array();
	let k = 0;
	for(let file of files){
		if(file.type.startsWith("image/")){
			await compressImagePromise(file,false);
			newFiles.push(file);
			k++;
			
			$("#progress").css('width',((k/files.length)*100)+"%");
		}
		else{
			newFiles.push(file);
			k++;
		}
	}
	
	$("#progress").removeAttr('style');
	$("#circle").removeClass('red');
	$("#circle").hide();
			
	let fileSizeTotal = 0;
	for(let file of newFiles){
		fileSizeTotal += file.size;
	}
	
	if(fileSizeTotal > 8388608){
		Logger.show(Logger.Types.LOG,"[CompressionHandler]",newFiles.length,"file(s) too large, now restarting to force compression...");

		let toast = "壓縮後的大小總和過大，正在重新執行...";
		if(isMobile())
			snkms.toastMessage(toast, 'close', 'red');
		else
			snkms.error(toast);
		let newFilesInFor = new Array();
		
		for(let file of newFiles){
			newFilesInFor.push(await compressImagePromise(file,true));
		}
		
		uploadPrepare(newFilesInFor, true);
	}
	else{
		Logger.show(Logger.Types.LOG,"[CompressionHandler]",newFiles.length,"file(s) preparing to upload.");
		uploadPrepare(newFiles, true);
	}
}

function uploadPrepare(files,flag){
	var cancel = false;
	var totalSize = 0;
	for(let file of files){
		totalSize += file.size;
	}
		
	if(totalSize > 8388608){
		if(flag){
			let toast = "上傳的檔案總和不得超過8MB";
			if(isMobile())
				snkms.toastMessage(toast, 'close', 'red');
			else
				snkms.error(toast);
		}
		else
			compressImage(files);
	}
	else if(files.length > 10){
		let toast = "單次上傳數量不得超過10個檔案";
		if(isMobile())
			snkms.toastMessage(toast, 'close', 'red');
		else
			snkms.error(toast);
	}
	else{
		if(!cancel && totalSize > 0 && files.length > 0)
			uploadFiles(files);
		else
			$("#fileToUpload").val('');
	}
}

function uploadFiles(files){
	var fd = new FormData();
	for(let file of files){
		fd.append('fileToUpload[]',file);
	}
	fd.append('submit',true);
		
	 $.ajax({
		 url: CDNServer + '/upload.php',
		 cache: false,
		  processData: false,
		  contentType: false,
		  type:'POST',
		 data: fd,
		 error: function(xhr) {
		   Logger.show(Logger.Types.LOG,xhr.responseText);
			let toast = "上傳失敗";
			if(isMobile())
				snkms.toastMessage(toast, 'close', 'red');
			else
				snkms.error(toast);
		   $('#fileUpload').val('');
		},
		xhr: function(){
			let myXhr = $.ajaxSettings.xhr();
			if(myXhr.upload){
			  myXhr.upload.addEventListener('progress',function(e) {
				if (e.lengthComputable) {
				  var percent = Math.floor(e.loaded/e.total*10000)/100;
				
				  if(percent <= 100) {
					$('#progress').css('width', percent+"%");
					$("#circle").show();
				  }
				  if(percent >= 100) {
					let toast = "正在處理...";
					if(isMobile())
						snkms.toastMessage(toast, 'backup', 'green');
					else
						snkms.success(toast);
					$("#circle").hide();
					$("#progress").addClass("done");
					setTimeout(function(){
						$("#progress").removeClass("done");
						$("#progress").removeAttr('style');
					},1000);
				  }
				}
			  }, false);
			}
			return myXhr;
		},
		 success: function(response) {
			
			$('#fileUpload').val('');
			
			if(typeof response === 'object' && response != null){
				$("#progress").removeAttr('style');
				$("#circle").removeClass('red');
				$("#circle").hide();
				
				let toast = "上傳成功";
				if(isMobile())
					snkms.toastMessage(toast, 'cloud_done', 'green');
				else
					snkms.success(toast);
		
				let message = new Array();
				for(let o in response){
					message.push(response[o].url);
				}
				
				// 若是悄悄話模式，以悄悄話傳送檔案網址
				if(privateChatTarget?.length > 0){
					WebSocketBinaryHandler({
						type: 'privateMessage',
						signature: privateChatTarget,
						message: {
							original: message.join(' ')
						},
						location: locate
					});
					
					onMessage("privateMessageSource","private",privateChatTarget,clientList[privateChatTarget]?.at(0).username,clientList[privateChatTarget]?.at(0).id,message.join(' '),new Date().getTime());
				}
				else{
					WebSocketBinaryHandler({
						type: 'message',
						location: locate,
						message: {
							original: message.join(' ')
						}
					});
				}
			}
			else{
				let toast = "發生不明錯誤";
				if(isMobile())
					snkms.toastMessage(toast, 'close', 'red');
				else
					snkms.error(toast);
				Logger.show(Logger.Types.LOG,response);
			}
		 }
	});
}

function onKeyEnter(ele){	
	setTimeout(()=>{
		$('.messageBox').css('height', $(ele).prop('scrollHeight') + 20 + "px");
		
		if(isMobile())
			$('.room').css('height',$(window).height() - $('.messageBox').height() - 20);
		else{
			$('.room').css('height',`calc(100vh - ${$('.messageBox').height()+20}px)`);
			$('.emoji-window').css('bottom',`${$('.messageBox').height()+15}px`);
		}
		
		if(privateChatTarget?.length > 0){
			$('.lobby > .menu').css('bottom',`${$('.messageBox').height()+70}px`);
		}
		else{
			$('.lobby > .menu').css('bottom',`${$('.messageBox').height()+30}px`);
		}
		
		onScroll(false);
	},5);
}

function openSettings() {
	if(isMobile() && window.innerWidth <= 480){
		toggleSidebar($(".wrapper_settings"), true, "left");
	}
	else{
		$('.openBackground').fadeIn(25, function() {
			$(".wrapper_settings").show();
			$(".wrapper_settings").animate({
				opacity: 1,
				width: "105vw",
				height: "105vh"
			}, 150, function() {
				$(".wrapper_settings").animate({
					width: "100vw",
					height: (isMobile())?"75vh":"100vh"
				}, 100, function() {// Animation complete.
				});
			});
		});
	}
}

function closeSettings() {
    if ($('.wrapper_settings').css('display') == 'none')
        return;

    $(".wrapper_settings").animate({
        width: "105vw",
        height: "105vh"
    }, 100, function() {
        $(".wrapper_settings").animate({
            opacity: 0,
            width: "0vw",
            height: "0vh"
        }, 150, function() {
            $('.openBackground').fadeOut(25);
            $(".wrapper_settings").hide();
        });
    });


	savingSettings();
}

function savingSettings(){
	if(localStorage.getItem('username') != $('#userName').val()){
		userName = $('#userName').val();
		WebSocketBinaryHandler({
			type: "refresh",
			location: locate,
			username: userName,
			session: sessionSelf
		});
	}

	localStorage.setItem('username', $('#userName').val());
}
/*
function ImageLoaded(img){
	onScroll(scrollBottom);
}
*/

function randomASCIICode(length) {
    var result = '';
    var dictionary = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	
    for ( var i = 0; i < length; i++ ) {
		result += dictionary.charAt(Math.floor(Math.random() * dictionary.length));
	}
	
	var resultArray = result.split('');
	result = '';
	resultArray.forEach(str =>{
		result += str.charCodeAt().toString().padStart(3,0);
	});
	
	return result.substring(0,length);
}

function randomToken(length) {
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

function ParseBBCode(text){
  const PrivateRoomURL = MainDomain + "/private/";
  const codeRegex = /```([a-z0-9]+)?\n\n*([^\n][^]*?)\n*```/ig;
  const emojiRegex = /:([0-9A-Za-z_]+):/ig;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const inviteURLRegex = /(https?:\/\/chat\.snkms\.com\/private\/)([0-9A-Za-z\-]+)/g;
  
  text = text.replace(emojiRegex, (m, w, x)=>{
	 return `[emoji]:${w.trim()}:[/emoji]`; 
  });
  text = text.replace(urlRegex, (m, w, x)=>{
	 if(w.trim().startsWith(PrivateRoomURL)){
		 let inviteCode = w.trim().split("/").filter(r => r.length > 0).at(-1);
		 return `[inviteURL=${PrivateRoomURL}]${inviteCode.trim()}[/inviteURL]`; 
	 }
	 else{
		return `[url]${w.trim()}[/url]`;
	 }
  });
  text = text.replace(codeRegex, (m, lang, w, x)=>{
	  w = w.trim().replace(/\[([a-z]+)\]([^\s]+)\[\/([a-z]+)\]/g,(sm, a, b, c)=>{
		  if(a === c){
			  return b;
		  }
		  else{
			  return sm;
		  }
	  });
	  w = w.trim().replace(/\[([a-z]+)(=)([^\s]+)\]([^\s]+)\[\/([a-z]+)\]/ig,(sm, a, b, c, d, e)=>{
		  if(a === e){
			  return `${c}${d}`;
		  }
		  else{
			  return sm;
		  }
	  });
	
	const language = [
		"diff",
		"sql",
		"csharp",
		"cs",
		"c",
		"cpp",
		"cc",
		"css",
		"html",
		"xml",
		"xhtml",
		"rss",
		"atom",
		"svg",
		"json",
		"js",
		"javascript",
		"java",
		"dos",
		"bat",
		"cmd",
		"dart",
		"cmake",
		"basic",
		"bbcode",
		"bash",
		"sh",
		"zsh",
		"nginx",
		"php",
		"perl",
		"pl",
		"pm",
		"python",
		"py",
		"gyp",
		"ruby",
		"rb",
		"scss",
		"shell",
		"vbnet",
		"vb",
		"vba",
		"vbscript",
		"vbs",
		"go",
		"kotlin",
		"yaml"
	];
	
	if(lang && language.includes(lang) && w.trim().length > 0)
		return `[code=${lang}]${w.trim()}[/code]`; 
	else if(lang)
		return `[code]${lang}${w.trim()}[/code]`; 
	else
		return `[code]${w.trim()}[/code]`; 
  });
  
  return text;
  /*
  let textArr = text.split("\n");
  let newTextLine = [];
  
  for(let lineText of text.split("\n")){
	  let newTextSpace = [];
	  for(inText of lineText.split(" ")){
		  if(inText.match(urlRegex)){
			  newTextSpace.push(inText.replace(urlRegex,"[url]$1[/url]"));
		  }
		  else if(inText.match(emojiRegex)){
			 newTextSpace.push(inText.replace(emojiRegex, function(matched, matchSub, offset, groups) {
				  if(emojis[matchSub] && matched == lineText){
					  return `[emoji-large]${matchSub}[/emoji]`;
				  }
				  else if(emojis[matchSub]){
					  return `[emoji-small]${matchSub}[/emoji]`;
				  }
				  else
					  return matched;
			 }));
		  }
		  else{
			  newTextSpace.push(inText);
		  }
	  }
	  newTextLine.push(newTextSpace.join(" "));
  }
  
  
  return newTextLine.join("\n");
  */
}

function emojify(text){
	const emojiRegex = /\[emoji\]:([0-9A-Za-z_]+):\[\/emoji\]/ig;
	return text.replace(emojiRegex, function(match, id, index, string) {
		let pixel = (window.devicePixelRatio == 1) ? 48 : (devicePixelRatio == 2) ? 96 : 128;
		let size = "large";
		let checker = string.replace(emojiRegex, "").trim();
		if(checker.length > 0)
			size = "small";
		
		
		return `<div title=":${id}:" data-id="${id}" class="emojis ${size}"><span style="--emoji-url: url(${emojis[id]}?size=${pixel})"></span></div>`;
  });
}

function parseInviteLink(text){
	const inviteRegex = /\[inviteURL=(.*?)\](.*?)\[\/inviteURL\]/g;
	return text.replace(inviteRegex, function(matched, word, inviteCode) {
		let notice = (locate == inviteCode) ? "已加入" : "加入";
		return '<a class="inviteLink" target="_self" href="' + word + inviteCode + '" data-room="' + inviteCode + '">邀請您加入 #房間 ' + inviteCode + '<span>' + notice + '</span></a>';
	});
}

function parseInviteCode(text){
	const inviteRegex = /\[invite\]([0-9A-Za-z\-_]+)\[\/invite\]/g;
	return text.replace(inviteRegex, function(matched, inviteCode) {
		let notice = (locate == inviteCode) ? "已加入" : "加入";
		let word = `${MainDomain}/private/${inviteCode}`;
		return '<a class="inviteLink" target="_self" href="' + word + '" data-room="' + inviteCode + '">邀請您加入 #房間 ' + inviteCode + '<span>' + notice + '</span></a>';
	});
}

function urlify(text) {
  const mediaList = {
		mp4: "video/mp4",
		webm: "video/webm",
		ogg: "audio/ogg",
		mp3: "audio/mpeg",
		wav: "audio/wav"
  };
	
  const urlRegex = /\[url\](https?:\/\/[^\s]+)\[\/url\]/g;
  return text.replace(urlRegex, function(matched, matchSub, offset, groups) {
	  
	if(matchSub.startsWith(CDNRedirect)){
		let url = new URL(matchSub);
		matchSub = CDNServer + '/' + url.pathname.split('/').slice(2).join('/');
	}
	
	if(checkImageURL(matchSub)){
		let nowID = crc32(new Date().getTime().toString()+matchSub);
		var tryTime = 0;
		var wait = setInterval(()=>{
			try{
				var $jElement = $('img[data-id="'+nowID+'"]');
				var w = $jElement[0].naturalWidth,
					h = $jElement[0].naturalHeight;
				if($jElement.length && w && h){
					onScroll(scrollBottom);
					clearInterval(wait);
				}
				
				if(Math.abs($jElement.offset().top) > $(".lobby").height() - 150)
					clearInterval(wait);
				
				if(tryTime > 35 && !w && !h)
					clearInterval(wait);
				
				tryTime++;
			}
			catch(error){
				Logger.show(Logger.Types.ERROR,error);
				clearInterval(wait);
			}
		},30);
		
		return '<div><a target="_blank" href="' + matchSub + '"><img onload="onScroll(false);" loading="lazy" data-id="' + nowID + '" src="' + matchSub + '" /></a></div>';
	}
	else if(matchSub.startsWith(`https://${location.hostname}/private/`)){
		return '[invite]' + matchSub.match(/([0-9a-zA-Z\-]+)$/ig).join() + '[/invite]';
	}
	//else if(matchSub.startsWith(`${CDNServer}/files/`) && mediaList[matchSub.split(".").at(-1)]
	else if(matchSub.startsWith(`https://`) && mediaList[matchSub.split(".").at(-1)]){
		return `<${mediaList[matchSub.split(".").at(-1)].split("/")[0]} onloadeddata="onScroll(false);" controls><source src="${matchSub}" type="${mediaList[matchSub.split(".").at(-1)]}"></${mediaList[matchSub.split(".").at(-1)].split("/")[0]}>`;
	}
	else if(matchSub.startsWith(`${CDNServer}/files/`)){
		let timeID = new Date().getTime();
		$.ajax({
			url: matchSub,
			cache: false,
			type:'HEAD',
			error: function(err){
				$(`.${crc32(matchSub)}[data-id="${timeID}"]`).parent().next().attr("href","javascript:void(0);");
				$(`.${crc32(matchSub)}[data-id="${timeID}"]`).css("color","#ff6d6d");
				$(`.${crc32(matchSub)}[data-id="${timeID}"]`).text("ERROR");
			},
			success: function(response, status, xhr) {
				let fileSize = xhr.getResponseHeader("Content-Length");
				$(`.${crc32(matchSub)}[data-id="${timeID}"]`).text(SizeFormatter(fileSize));
			}
		});
		
		let url = new URL(matchSub);
		let CDNReplacement = CDNRedirect + url.pathname;
		
		return `<div class="file"><span><a class="linkName" href="${CDNReplacement}" title="${matchSub.split("/").at(-1)}" class="filename">${matchSub.split("/").at(-1)}</a><br/><span data-id="${timeID}" class="${crc32(matchSub)}">-</span></span><a href="${CDNReplacement}" class="linkButton" title="下載 ${matchSub.split("/").at(-1)}"><img src="${MainDomain}/images/download.png" /></a></div>`;
	}
	else if(matchSub.match(/^https?:\/\/(www\.youtube\.com\/watch\?[^\s]+|youtu\.be\/[0-9a-zA-Z\-_]{11})/ig)){
		let videoCode = "";
		if(matchSub.match(/^https?:\/\/(youtu\.be\/[0-9a-zA-Z\-_]{11})/ig)){
			videoCode = matchSub.split("/").at(-1).split("?")[0];
		}
		else{
			videoCode = matchSub.match(/v=([0-9a-zA-Z\-_]+)/ig)[0].split("=").at(-1);
		}
		
		let time  = (matchSub.match(/t=([0-9]+)/ig))?matchSub.match(/t=([0-9]+)/ig)[0].split("=").at(-1):0;
		let timestamp = (time > 0)?'?start='+time:"";
		
		return `<iframe class="youtube" src="https://www.youtube.com/embed/${videoCode}${timestamp}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
	}
	else{
		let windowAction = (matchSub.match(/^(https?:\/\/chat\.snkms\.com)/ig))?"_self":"_blank";
		return '<a target="' + windowAction + '" href="' + matchSub + '">' + matchSub + '</a>';
	}
  })
}

function parseCodeArea(text){
	const codeRegex = /\[code(=[0-9a-z]+)?\]([^\n][^]*?)\[\/code\]/ig;
	return text.replace(codeRegex, function(matched, lang, code) {
		if(lang){
			lang = lang.substring(1);
			return '<pre><code class="language-'+lang+'">'+code+'</code></pre>';
		}
		else
			return '<pre><code>'+code+'</code></pre>';
	});
}

function checkImageURL(url) {
    return(url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*?)?$/i) != null);
}

function initFirst(window){
	setInterval(()=>{
		if($('#sender').text().length === 0 && parseInt($('#sender').css('height')) === 40 || $('#sender').text().length === 1 && $('#sender').text().match(/^\n$/g) || $('#sender').text().length === 2 && $('#sender').text().match(/^\r\n$/g))
			$(".textPlaceholder").show();
		else
			$(".textPlaceholder").hide();
	},50);
	
	if(localStorage.getItem('token') === null){
		let random = randomToken(70);
		localStorage.setItem('token', random);
		token = random;
	}
	else{
		token = localStorage.getItem('token');
	}
	
	$(window).on('popstate',function(e){
		localStorage.removeItem('lastRoom');
	});
	
	$(document).on('keydown',function(e){
		if(document.activeElement === document.body && !$('.snkms-jsd-m').is(':visible') && !$('.wrapper_settings').is(':visible')){
			if(!e.altKey && !e.shiftKey && !e.ctrlKey)
				$('#sender').focus();
		}
	});
	
	
	$('body').on('click','.privateStatus .privateButton',function(e){
		privateChatTarget = null;
		$('.privateStatus').remove();
	});
	
	$('body').on('click','.inviteLink',function(e){
		if($(this).attr('data-room') === locate){
			let toast = "您已經在這個房間了";
			if(isMobile())
				snkms.toastMessage(toast, 'close', 'red');
			else
				snkms.error(toast);
		}
		else{
			WebSocketBinaryHandler({
				type: 'login',
				token: token,
				username: userName,
				location: $(this).attr('data-room')
			});
		}
		e.preventDefault();
	});
	
	$('#sendMessage').on('click',function(e){
		if(wss.readyState == 1 && $('#sender').text().replace(/\n|\r/g,"").length > 0){
			$(this).blur();
			if($('#sender').text().length > 4000){
				var blobData = new Blob([$('#sender').text()], {
					type: 'text/plain'
				});
				var file = new File([blobData], "message.txt");
				
				uploadFiles([file]);
			}
			else{
				WebSocketBinaryHandler({
					type: 'message',
					location: locate,
					message: {
						original: $('#sender').text()
					}
				});
			}
			
			$('#sender').text('');
			
			if($('.textArea').hasClass("maximum"))
				$('#sender').focus();
			
			onKeyEnter($('#sender'));
			e.stopPropagation();
		}
	});
	$('#sender').on('keydown',function(e){
		if(e.keyCode == 13 && wss.readyState == 1 && $(this).text().replace(/\n|\r/g,"").length > 0){
			if(!e.shiftKey && !isMobile()){
				if(privateChatTarget?.length > 0){
					var targetSignature = privateChatTarget;
					var message = $(this).text();
					
					if(!clientList[targetSignature]){		
						let toast = "該使用者工作階段不存在";
						if(isMobile())
							snkms.toastMessage(toast, 'close', 'red');
						else
							snkms.error(toast);
						
						//$(this).text('');
						privateChatTarget = null;
						e.preventDefault();
						return;
					}
					else{
						if(message.trim().length == 0){
							let toast = "請輸入訊息內容";
							if(isMobile())
								snkms.toastMessage(toast, 'close', 'red');
							else
								snkms.error(toast);
							e.preventDefault();
							return;
						}
						
						WebSocketBinaryHandler({
							type: 'privateMessage',
							signature: targetSignature,
							message: {
								original: message
							},
							location: locate
						});
						
						onMessage("privateMessageSource","private",targetSignature,clientList[targetSignature]?.at(0).username,clientList[targetSignature]?.at(0).id,message,new Date().getTime());
					}
				}
				// 使用 Markdown 語法時不送出訊息
				else if($(this).text().startsWith("```") && !$(this).text().match(/```([a-zA-Z0-9]+)?\n*([^\n][^]*?)\n*```/g) || 
						$(this).text().match(/```/g) && $(this).text().match(/```/g).length % 2 == 1
				){
					onKeyEnter($(this));
					return;
				}
				else{
					if($('#sender').text().length > 4000){
						var blobData = new Blob([$('#sender').text()], {
							type: 'text/plain'
						});
						var file = new File([blobData], "message.txt");
						
						uploadFiles([file]);
					}
					else{			
						WebSocketBinaryHandler({
							type: 'message',
							location: locate,
							message: {
								original: $(this).text()
							}
						});
					}
				}
				$(this).text('');
			}
		}
		
		
		// ALT+Q or CTRL+Q 插入 Markdown 區塊
		if(e.keyCode == 81 && e.altKey || e.keyCode == 81 && e.ctrlKey){
			/*
			let cursorPos = $('#sender').prop('selectionStart');
			let v = $('#sender').text();
			let textBefore = v.substring(0,  cursorPos);
			let textAfter  = v.substring(cursorPos, v.length);
			let insertMarkdown = "```\n\n```";
			
			if(textBefore.length !== 0)
				textBefore = textBefore+"\n";
			
			$('#sender').text(`${textBefore}${insertMarkdown}${textAfter}`);
			
			$('#sender')[0].setSelectionRange($('#sender').prop('selectionStart') - 4, $('#sender').prop('selectionStart') - 4);
			*/
			
			if(document.getSelection().rangeCount > 0){
				var range = document.getSelection().getRangeAt(0);
				
				// 有選取文字時
				if(range.startOffset != range.endOffset){
					let insertMarkdown = "```";
					let textNodeStart = document.createTextNode(insertMarkdown+"\n");
					let textNodeEnd = document.createTextNode("\n"+insertMarkdown);
					range.insertNode(textNodeStart);
					
					// 將游標位置設定到最後一個節點
					range.setStart(range.endContainer, range.endOffset);
					range.setEnd(range.endContainer, range.endOffset);
					
					// 插入 markdown 文字
					range.insertNode(textNodeEnd);
					
					// 移動游標位置到起始插入處
					range.setStart(textNodeStart, 3);
					range.setEnd(textNodeStart, 3);
					
					
					// 因為文字節點無法被定位，因此使用元素節點來定位
					// 建立元素節點
					let elementNodeStart = document.createElement("span");
					elementNodeStart.setAttribute('data-paste', 'true');
					
					// 將元素節點插入到起始位置
					// 後續由觀察者(observer)執行游標移動
					range.insertNode(elementNodeStart);
				}
				else{
					let insertMarkdown = "```\n\n```";
					let textNode = document.createTextNode(insertMarkdown);
					range.insertNode(textNode);
					
					// 移動游標位置到起始插入處
					range.setStart(textNode, 4);
					range.setEnd(textNode, 4);
				}
				
				
				document.getSelection().removeAllRanges();
				document.getSelection().addRange(range);
			}
		}
		
		// TAB插入全形空白
		if(e.keyCode == 9){
			if(document.getSelection().rangeCount > 0){
				let range = document.getSelection().getRangeAt(0);
				var textNode = document.createTextNode("　");
				range.insertNode(textNode);
				
				// Move the selection to the middle of the inserted text node
				range.setStart(textNode, 1);
				range.setEnd(textNode, 1);
				document.getSelection().removeAllRanges();
				document.getSelection().addRange(range);
			}
		}
		
		if(e.keyCode == 13 && !e.shiftKey && !isMobile() || e.keyCode == 9)
			e.preventDefault();
		
		if(e.keyCode == 13){
			if(document.getSelection().rangeCount > 0){
				// 非同步處理事件
				setTimeout(()=>{
					// 將捲軸捲動到游標的位置，防止在最底層執行換行時捲軸卻沒有移動到最下方的問題
					var range = document.getSelection().getRangeAt(0);
					if(range.endContainer.nextSibling === null){
						var span = document.createElement('span');
						var textNode = document.createTextNode("\n");
						range.insertNode(textNode);
						range.insertNode(span);
						
						span.scrollIntoView();
						
						range.setStart(textNode, 0);
						range.setEnd(textNode, 0);
						document.getSelection().removeAllRanges();
						document.getSelection().addRange(range);
						
						setTimeout(()=>{
							$('#sender span').remove();
						},5);
					}
				},1);
			}
		}
		
		onKeyEnter($(this));
	});
	
	$('#sender').on('click',function(e){
		if(isMobile()){
			$(this).parents(".textArea").addClass("maximum");
			$("#add").addClass("right");
			//$("#add img").attr("src",MainDomain + "/images/arrow_right.png");
			//$("#upload").hide();
			e.stopPropagation();
		}
	});
	
	$('#sender').on('paste',function(e){
		e.preventDefault();
		const items = (e.clipboardData || e.originalEvent.clipboardData).items;
		var blob = null;
		for(let item of items){
		  if (item.type.indexOf('image') === 0) {
			blob = item.getAsFile();
		  }
		}
		
		// load image if there is a pasted image
		if (blob != null) {
		  snkms.success("已從剪貼簿貼上圖片");
		  var reader = new FileReader();
		  reader.onload = function(event){
			var imageURL = event.target.result;
			var base64ImageContent = imageURL.replace(/^data:(image\/[a-zA-Z]+);base64,/, "");
			var base64ContentType = imageURL.match(/^data:(image\/[a-zA-Z]+);base64,/)[1];
			var blob = base64ToBlob(base64ImageContent, base64ContentType);     
			uploadFiles([blob]);
		  };
		  reader.readAsDataURL(blob);
		}
		else{
			var text = (e.originalEvent || e).clipboardData.getData('text/plain');
			var range = document.getSelection().getRangeAt(0);

			// 刪除選取文字
			range.deleteContents();
			
			let textNode = document.createTextNode(text);
			range.insertNode(textNode);
			
			// 移動游標位置到末端插入處
			range.setStart(textNode, text.length);
			range.setEnd(textNode, text.length);
			
			// 因為文字節點無法被定位，因此使用元素節點來定位
			// 建立元素節點
			let elementNodeStart = document.createElement("span");
			elementNodeStart.setAttribute('data-paste', 'true');
			
			// 將元素節點插入到起始位置
			// 後續由觀察者(observer)執行游標移動
			range.insertNode(elementNodeStart);
			
			onKeyEnter($('#sender'));
		}
	});
	var lastRange = null;
	var droppedText = false;
	$('#sender').on('focus',function(e){
		setTimeout(()=>{
			// 防止拖曳文字進入輸入框內時，錯誤的重設游標停頓位置
			if(lastRange !== null && !droppedText){
				document.getSelection().removeAllRanges();
				document.getSelection().addRange(lastRange);
			}
			
			droppedText = false;
		},1);
		
		setTimeout(()=>{
			onKeyEnter($('#sender'));
		},250);
	});
	$('#sender').on('blur',function(e){
		//if(document.getSelection().rangeCount > 0 && $(document.getSelection().focusNode.parentElement).parents('#sender').length > 0){
		if(document.getSelection().rangeCount > 0 && 
			($(document.getSelection().focusNode.parentElement).parents('#sender').length > 0 || $(document.getSelection().focusNode.parentElement).is('#sender'))
		){
			lastRange = document.getSelection().getRangeAt(0);
		}
	});
	$('#sender').on('input',function(e){
		onKeyEnter($('#sender'));
	});
	
	$('#fileUpload').on('change',function(){
		uploadPrepare(this.files,false);
	});
	
	/*
	// 滑動程式碼區塊時不觸發側邊欄
	$(".lobby").on("touchstart touchmove touchend", "code", function(e){
		e.stopPropagation();
	});
	*/
	
	var startTime = 0,
		moveEndX = 0,
		moveEndY = 0,
		startX = 0,
		startY = 0,
		diffX = 0,
		diffY = 0,
		X = 0,
		Y = 0,
		dragStartX = 0,
		dragStartY = 0,
		touchMovingDirection = 0,
		touchStarting = false,
		touchStaying = false,
		touchScrolling = false,
		dragElement = new Object(),
		timer = null,
		timerScrolling = null;
		
	$('.lobby').on('scroll',function(e){
		clearTimeout(timerScrolling);
		timerScrolling = setTimeout(()=>{
			if(!touchStarting)
				touchScrolling = false;
		},250);
		
		touchScrolling = true;
	});
	
	$('.userList').on('scroll',function(e){
		clearTimeout(timerScrolling);
		timerScrolling = setTimeout(()=>{
			if(!touchStarting)
				touchScrolling = false;
		},250);
		
		touchScrolling = true;
	});
	
    $("body").on("touchstart", function(e) {
		if(e.originalEvent.touches.length > 1 || $(e.originalEvent.target).parents('.messageBox,.channelHeader').length > 0) return;
		if($(e.originalEvent.target).parents('.openBackground').length > 0 && $(e.originalEvent.target).tagName() === 'span') return;
		
		touchStarting = true;
		
		clearInterval(timer);
		timer = setInterval(()=>{
			if(diffX != 0 && diffX == X || diffY != 0 && diffY == Y){
				touchStaying = true;
			}
			else{
				touchStaying = false;
			}
			
			diffX = X,
			diffY = Y;
		},100);

    　　startX = e.originalEvent.changedTouches[0].pageX,
    　　startY = e.originalEvent.changedTouches[0].pageY;
		X = startX;
		Y = startY;
		startTime = new Date().getTime();
		
		dragStartX = e.originalEvent.changedTouches[0].pageX;
		dragStartY = e.originalEvent.changedTouches[0].pageY;
		
		var isShownEmojiWindow = $('.emoji-window').css('display') == 'block';
		
		if(snkms.isShownDialog(e.target))
			createDragElementsObject($(e.target).parents(".snkms-content").get(0));
		else{
			createDragElementsObject('.wrapper_settings');
			createDragElementsObject('.rightSide');
		}
		
		if(!$(".wrapper_settings").attr("data-open") && !$(".rightSide").attr("data-open")){
			$("#container,.lobby, .channelHeader").removeClass('hasRight');
			$("#container,.lobby, .channelHeader").removeClass('hasLeft');
		}
		
		$('.openBackground').removeClass('hasAnime');
    });

   $("body").on("touchmove", function(e) {
		if(e.originalEvent.touches.length > 1 || $(e.originalEvent.target).parents('.messageBox,.channelHeader').length > 0) return;
		if($(e.originalEvent.target).parents('.openBackground').length > 0 && $(e.originalEvent.target).tagName() === 'span') return;
		
		// 向左滑動 (動態行為)
		if(e.originalEvent.changedTouches[0].pageX < moveEndX){
			touchMovingDirection = -1;
		}
		// 向右滑動 (動態行為)
		else{
			touchMovingDirection = 1;
		}
		
		moveEndX = e.originalEvent.changedTouches[0].pageX;
		moveEndY = e.originalEvent.changedTouches[0].pageY;
		X = moveEndX - startX;
		Y = moveEndY - startY;
		
		// 左右欄位手勢滑動
		if(!snkms.isShownDialog(e.target) && !touchScrolling && Math.abs(X) > Math.abs(Y) || $('.openBackground').hasClass('noOverflow')){
			// 右側欄
			if(X > 0 && $(".rightSide").attr("data-open") && !$(".wrapper_settings").attr("data-open")){
				let movePosition = dragElement['.rightSide'].rx-Math.abs(moveEndX - dragStartX);
				let movePositionMinus = movePosition + $('.rightSide').width();
				
				// 判斷是否在合理範圍 (防止使用者拖曳出螢幕範圍)
				if(movePosition < 0 && movePositionMinus > 0){
					$('.openBackground').addClass('noOverflow')
					$(".rightSide,#container,.lobby,.channelHeader,.lobby > .menu").removeClass('hasAnime');
					$(".rightSide").css('right',movePosition+'px');
					
					$(".lobby > .menu").css('right',(movePositionMinus+13)+'px');
					$(".lobby").css('right',movePositionMinus+'px');
					$(".channelHeader").css('right',movePositionMinus+'px');
					$("#container").css('right',movePositionMinus+'px');
					
					$(".openBackground").css('opacity',1+parseInt($(".rightSide").css('right')) / $(".rightSide").width());
					$('.openBackground').show();
				}
			}
			// 左側欄
			else if(X < 0 && $(".wrapper_settings").attr("data-open") && !$(".rightSide").attr("data-open")){
				let movePosition = dragElement['.wrapper_settings'].x-Math.abs(moveEndX - dragStartX);
				let movePositionMinus = movePosition + $('.wrapper_settings').width();
				
				// 判斷是否在合理範圍 (防止使用者拖曳出螢幕範圍)
				if(movePosition < 0 && movePositionMinus > 0){
					$('.openBackground').addClass('noOverflow')
					$(".wrapper_settings,#container,.lobby,.channelHeader,.lobby > .menu").removeClass('hasAnime');
					$(".wrapper_settings").css('left',movePosition+'px');
					
					$(".lobby > .menu").css('right',((movePositionMinus-13)*-1)+'px');
					$(".lobby").css('left',movePositionMinus+'px');
					$(".channelHeader").css('left',movePositionMinus+'px');
					$("#container").css('left',movePositionMinus+'px');
					
					$(".openBackground").css('opacity',1+parseInt($(".wrapper_settings").css('left')) / $(".wrapper_settings").width());
					$('.openBackground').show();
				}
			}
		}
		
		// 對話框手勢操作
		if(snkms.isShownDialog(e.target) && dragElement[$(e.target).parents(".snkms-content")?.get(0)]){
			let movePosition = moveEndY-dragStartY+dragElement[$(e.target).parents(".snkms-content").get(0)].y;
			
			// 判斷是否在合理範圍，讓使用者只能在螢幕範圍內拖曳
			if(movePosition >= 0)
				$(e.target).parents(".snkms-content").css('top',movePosition+'px');
			else
				$(e.target).parents(".snkms-content").css('top','0px');
			
			$(e.target).parents(".snkms-content").removeClass('hasAnime');
		}
    });
	
    $("body").on("touchend", function(e) {
		if(e.originalEvent.touches.length > 1 || $(e.originalEvent.target).parents('.messageBox,.channelHeader').length > 0) return;
		if($(e.originalEvent.target).parents('.openBackground').length > 0 && $(e.originalEvent.target).tagName() === 'span') return;
		
		touchStarting = false;
		
　　　　 //e.preventDefault();
		clearInterval(timer);

		if($(".messageBox").hasClass("unhidden")) return;
		
		let endTime = new Date().getTime();
		moveEndX = e.originalEvent.changedTouches[0].pageX;
    　　moveEndY = e.originalEvent.changedTouches[0].pageY;
		X = moveEndX - startX;
		Y = moveEndY - startY;
		
		// 對話框關閉狀態下、按下及放開的座標差異不等於零時 (代表有移動)、沒有在捲動狀態時、主要行為是左右滑動時
		if(!snkms.isShownDialog(e.target) && X != 0 && !touchScrolling && Math.abs(X) > Math.abs(Y) || $('.openBackground').hasClass('noOverflow')){
			$(".openBackground").removeClass('noOverflow');
			$(".rightSide,#container,.lobby,.wrapper_settings, .channelHeader,.lobby > .menu").addClass('hasAnime');
			if(X < 0 && $(".rightSide").attr("data-open")){
				$("#container,.lobby, .channelHeader").addClass('hasRight');
			}
			else if(X > 0 && $(".wrapper_settings").attr("data-open")){
				$("#container,.lobby, .channelHeader").addClass('hasLeft');
			}
			
			if(parseInt($('.lobby').css('left')) < 0){
				if (parseFloat($('.openBackground').css('opacity')) > 0.5 && touchStaying && dragElement['.rightSide'] !== undefined ||
					touchMovingDirection === -1 && !touchStaying && dragElement['.rightSide'] !== undefined
				){
					toggleSidebar($(".rightSide"), true, "right");
				}
				else{
					toggleSidebar($(".rightSide"), false, "right");
				}
			}
			else{
				if (parseFloat($('.openBackground').css('opacity')) > 0.5 && touchStaying && dragElement['.wrapper_settings'] !== undefined ||
					touchMovingDirection === 1 && !touchStaying && dragElement['.wrapper_settings'] !== undefined
				){
					toggleSidebar($(".wrapper_settings"), true, "left");
				}
				else{
					toggleSidebar($(".wrapper_settings"), false, "left");
					$("#userName").blur();
					savingSettings();
				}
			}
		}
		
		// 對話框手勢操作
		if(Math.abs(X) < 65 && Y > 35 && !touchStaying && snkms.isShownDialog(e.target)){
			$('.snkms-content .snkms-title .close').click();
		}
		else if(snkms.isShownDialog(e.target) && dragElement[$(e.target).parents(".snkms-content")?.get(0)]){
			if(parseInt($(e.target).parents(".snkms-content").css('top')) > $(document).height() / 2.5){
				$('.snkms-content .snkms-title .close').click();
			}
			else{
				$(e.target).parents(".snkms-content").css('top','0px');
			}
			
			$(e.target).parents(".snkms-content").addClass('hasAnime');
		}
		
		
		
		touchScrolling = false;
    });
	
	// 在中間畫面(主畫面)手勢處理
    $(".lobby").on("touchend", function(e) {
		if(e.originalEvent.touches.length > 1) return;
		
　　　　 //e.preventDefault();
		clearInterval(timer);
		
		touchStarting = false;
		
		if($(".messageBox").hasClass("unhidden")) return;
		
		let endTime = new Date().getTime();
		
    　　moveEndX = e.originalEvent.changedTouches[0].pageX;
    　　moveEndY = e.originalEvent.changedTouches[0].pageY;
		
		X = moveEndX - startX;
		Y = moveEndY - startY;

		$(".rightSide,#container,.lobby,.wrapper_settings,.channelHeader,.lobby > .menu").addClass('hasAnime');
		if(X < 0){
			$("#container,.lobby, .channelHeader").addClass('hasRight');
		}
		else{
			$("#container,.lobby, .channelHeader").addClass('hasLeft');
		}

		// 在沒有捲動主畫面的情況下且主要行為為左右滑動時觸發
		if(!touchScrolling && Math.abs(X) > Math.abs(Y) || touchMovingDirection !== 0 && !touchScrolling && parseInt($('.lobby').css('left')) !== 0){
			
			// 判斷主畫面處於向左還是向右狀態
			
			// 處於向左狀態時 (開啟右側欄)
			if(parseInt($('.lobby').css('left')) < 0){
				if (parseFloat($('.openBackground').css('opacity')) > 0.5 && touchStaying && dragElement['.rightSide'] !== undefined ||
					touchMovingDirection === -1 && !touchStaying && dragElement['.rightSide'] !== undefined
				){
					toggleSidebar($(".rightSide"), true, "right");
				}
				else{
					toggleSidebar($(".rightSide"), false, "right");
				}
			}
			// 處於向右狀態時 (開啟左側欄)
			else{
				if (parseFloat($('.openBackground').css('opacity')) > 0.5 && touchStaying && dragElement['.wrapper_settings'] !== undefined ||
					touchMovingDirection === 1 && !touchStaying && dragElement['.wrapper_settings'] !== undefined
				){
					toggleSidebar($(".wrapper_settings"), true, "left");
				}
				else{
					toggleSidebar($(".wrapper_settings"), false, "left");
				}
			}
		}
		else{
			if(parseInt($('.lobby').css('left')) > 0)
				toggleSidebar($(".wrapper_settings"), false, "left");
			else
				toggleSidebar($(".rightSide"), false, "right");
		}
		moveEndX = 0;
		moveEndY = 0;
		X = 0;
		Y = 0;
		
		touchScrolling = false;
		$('.lobby').removeClass('noOverflow');
		e.stopPropagation();
    });
	
    $(".lobby").on("touchmove", function(e) {
		if(e.originalEvent.touches.length > 1) return;
		if($(".messageBox").hasClass("unhidden")) return;
		
		// 向左滑動 (動態行為)
		if(e.originalEvent.changedTouches[0].pageX < moveEndX){
			touchMovingDirection = -1;
		}
		// 向右滑動 (動態行為)
		else{
			touchMovingDirection = 1;
		}
		
		moveEndX = e.originalEvent.changedTouches[0].pageX;
		moveEndY = e.originalEvent.changedTouches[0].pageY;
		X = moveEndX - startX;
		Y = moveEndY - startY;
	
		// 在沒有捲動主畫面的情況下且主要行為為左右滑動時觸發 或是 主畫面處於非捲動狀態時 (無法捲動狀態)
		if(!touchScrolling && Math.abs(X) > Math.abs(Y) || $('.lobby').hasClass('noOverflow')){
			$('.lobby').addClass('noOverflow');
			
			// 右側欄
			if(X < 0){
				$(".lobby,#container,.wrapper_settings,.channelHeader").css('left','');
				let movePosition = dragElement['.rightSide'].rx+Math.abs(moveEndX - dragStartX);
				let movePositionMinus = ((moveEndX-dragStartX)*-1);

				if(movePosition < 0){
					$(".rightSide,#container,.lobby, .channelHeader,.lobby > .menu").removeClass('hasAnime');
					$(".rightSide").css('right',movePosition+'px');
					
					$(".lobby > .menu").css('right',(movePositionMinus+13)+'px');
					$(".channelHeader").css('right',movePositionMinus+'px');
					$(".lobby").css('right',movePositionMinus+'px');
					$("#container").css('right',movePositionMinus+'px');
					
					$(".openBackground").css('opacity',1+parseInt($(".rightSide").css('right')) / $(".rightSide").width());
					$('.openBackground').show();
				}
			}
			// 左側欄
			else{
				$(".lobby,#container,.rightSide,.channelHeader").css('right','');
				let movePosition = (dragElement['.wrapper_settings'].x+Math.abs(moveEndX - dragStartX));
				let movePositionMinus = ((moveEndX-dragStartX));
				
				if(movePosition < 0){
					$(".wrapper_settings,#container,.lobby, .channelHeader,.lobby > .menu").removeClass('hasAnime');
					$(".wrapper_settings").css('left',movePosition+'px');
					
					$(".lobby > .menu").css('right',((movePositionMinus-13)*-1)+'px');
					$(".channelHeader").css('left',movePositionMinus+'px');
					$(".lobby").css('left',movePositionMinus+'px');
					$("#container").css('left',movePositionMinus+'px');
					
					$(".openBackground").css('opacity',1+parseInt($(".wrapper_settings").css('left')) / $(".wrapper_settings").width());
					$('.openBackground').show();
				}
			}
		}
		else{
			//toggleSidebar($(".wrapper_settings"), false, "left");
			//toggleSidebar($(".rightSide"), false, "right");
		}
		//console.log(X);
		//$("#sender").val(X);
		e.stopPropagation();
    });
	
	// 元素水波紋效果
	var ripple_isScrolling = false,
		ripple_endScrolling,
		ripple_startScrolling,
		ripple_isRippleTouching = false,
		ripple_rippleTouchingTime = 0;
	
	$('.lobby, .userList').on('scroll', function(e){
		clearTimeout(ripple_endScrolling);
		
		if(ripple_startScrolling == 0){
			ripple_startScrolling = setTimeout(()=>{
				ripple_isScrolling = true;
			},25);
		}
		
		ripple_endScrolling = setTimeout(()=>{
			ripple_isScrolling = false;
			ripple_startScrolling = 0;
		}, 250);
	});

	$('.lobby > .chat').on('touchstart','[data-ripple]',function(e){
		ripple_rippleTouchingTime = new Date().getTime();
	});
	
	$('.lobby > .chat').on('touchend','[data-ripple]',function(e){
		ripple_isRippleTouching = false;
		ripple_rippleTouchingTime = 0;
	});
	
	$('.lobby > .chat').on('touchmove touchstart','[data-ripple]',function(e){
		var startTouchmoveTime = new Date().getTime();
		var diffTouchTime = startTouchmoveTime - ripple_rippleTouchingTime;
		
		if(ripple_isScrolling || 
			ripple_isRippleTouching || 
			diffTouchTime < 200 && diffTouchTime > 50 ||
			diffTouchTime > 1500
			) return;
		
		ripple_isRippleTouching = true;
		
		if(diffTouchTime < 50){
			let ele = this;
			setTimeout(()=>{
				if(!ripple_isScrolling && parseFloat($('.openBackground').css('opacity')) == 0){
					ElementRipple(ele, e);
				}
			},150);
		}
		else{
			ElementRipple(this, e);
		}
	});
	
	$('.wrapper_settings, .rightSide, .channelHeader').on('touchstart','[data-ripple]',function(e){
		ElementRipple(this, e);
	});
	$('body').on('touchstart','.snkms-jsd-m [data-ripple]',function(e){
		ElementRipple(this, e);
	});
	
	function ElementRipple(sElement, e){
		var $self = $(sElement);
		
		var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
		var initPos = $self.css("position"),
			offs = $self.offset(),
			x = touch.pageX - offs.left,
			y = touch.pageY - offs.top,
			dia = Math.min(sElement.offsetHeight, sElement.offsetWidth, 100), // start diameter
			$ripple = $('<div/>', {class : "ripple dark",appendTo : $self });
		
		if(!initPos || initPos==="static") {
		  $self.css({position:"relative"});
		}
		
		$('<div/>', {
		  class : "rippleWave",
		  css : {
			background: $self.data("ripple"),
			width: dia,
			height: dia,
			left: x - (dia/2),
			top: y - (dia/2),
		  },
		  appendTo : $ripple,
		  one : {
			animationend : function(){
			  $ripple.remove();
			}
		  }
		});
	}
	
	// 結束
	
    $("#search").on("keyup", function() {
		var id = $(this).val();
		$(".emoji-window .eBody .eContainer div").each(function(){
			if($(this).attr("data-id").indexOf(id) == -1){
				$(this).hide();
			}
			else{
				$(this).show();
			}
		});
    });
	
	$(".headerButton.list").on("click",function(e){
		$(".lobby, #container, .channelHeader").addClass('hasLeft');
		$(".lobby, #container, .channelHeader").removeClass('hasRight');
		toggleSidebar($(".wrapper_settings"),true,'left');
	});
	
	$(".headerButton.channel").on("click",function(e){
		$(".lobby, #container, .channelHeader").addClass('hasRight');
		$(".lobby, #container, .channelHeader").removeClass('hasLeft');
		toggleSidebar($(".rightSide"),true,'right');
	});
	
	$(".additional").on("click",function(e){
		e.stopPropagation();
	});
	
	$(".additional div").on("click",function(e){
		$(".additional").hide();
		$(".messageBox").removeClass("unhidden");
	});
	
	$("#add").on("click",function(e){
		if($(this).hasClass("right")){
			$("body").trigger("click");
			$("#sender").focus();
		}
		else{
			$(".additional").toggle();
			$(".emoji-window").hide();
			if($(".additional").css('display') == "block"){
				$(".messageBox").addClass("unhidden");
			}
			else{
				$(".messageBox").removeClass("unhidden");
			}
		}
		e.stopPropagation();
	});
	
	$("#privateChatCreate").on("click",function(e){
		inviteList = [];
		const $element = $(this);
		
		let elements = "";
		for(let c in clientList){
			if(c == tokenHashSelf) continue;
			
			elements += `<div><label class="container"><input name="inviteList" type="checkbox" value="${c}"><span class="checkmark"></span>${clientList[c]?.at(0).username}#${crc32(c)}</label></div>`;
		}
		
		if(elements.length > 0)
			elements = `<hr/>${elements}`;
		
		snkms.option("建立房間","要建立臨時私聊房間嗎？<br/>建立私聊後可以分享連結以向您的朋友一同進行隱密又安全的聊天！<div style='font-size:12px;margin-top: 15px;'>設有密碼之房間將受到端對端加密保護</div>",[{name: "無密碼",value: "noPassword"}],"有密碼",function(evt, value){
			const choosen = value;
			const senderWorker = async function(private_key){
				let obj = {
					type: "create",
					session: sessionSelf
				};
				
				if(private_key !== "noPassword" && private_key.trim().length > 0){
					obj.password = await hashString(private_key);
					roomPassword = private_key;
					
					let creatorKeyPair = await getSecretPublicKeyRaw();
					let keyPair = await getNewSecretPublicKeyRaw();
					
					obj.publicKeyBase64 = keyPair.publicKeyRawBase64;
					obj.creatorPrivateKeyBase64 = await encodePrivateKey(creatorKeyPair.privateKey);
				}

				WebSocketBinaryHandler(obj);
				if($element.hasClass("additionalSetting"))
					toggleSidebar($(".wrapper_settings"), false, "left");
			};
			
			if(elements.length > 0){
				setTimeout(()=>{
					snkms.confirm(`選擇要邀請到新建立的私人房間的對象，若都沒有勾選對象也可以在建立後發送房間ID給他們。${elements}`,function(){
						$('input[name="inviteList"]:checked').each(function(){
							inviteList.push($(this).val());
						});
						
						senderWorker(choosen);
					});
				},250);
			}
			else{
				senderWorker(choosen);
			}
		}, null, 2);
	});
	
	$("#privateChatJoin").on("click",function(e){
		const $element = $(this);
		snkms.prompt("加入房間","請輸入房間ID或網址",MainDomain + "/private/########",function(e,value){
			if(locate === value.split("/").at(-1)){
				let toast = "您已經在這個房間了";
				if(isMobile())
					snkms.toastMessage(toast, 'close', 'red');
				else
					snkms.error(toast);
				return;
			}
			
			if(value.match(/^(https?:\/\/chat\.snkms\.com\/private)/ig) || value.match(/^([0-9A-Za-z\-_]{1,16})$/g)){
				locate = value.replace(MainDomain + "/private/","");
				
				WebSocketBinaryHandler({
					type: 'login',
					token: token,
					username: userName,
					location: locate
				});
				
				if($element.hasClass("additionalSetting"))
					toggleSidebar($(".wrapper_settings"), false, "left");
			}
			else{
				let toast = "格式錯誤，無法加入房間";
				if(isMobile())
					snkms.toastMessage(toast, 'close', 'red');
				else
					snkms.error(toast);
			}
		});
	});
	
	$("#publicChat").on("click",function(e){
		if(locate == "public") {
			let toast = "您已經在大廳了";
			if(isMobile())
				snkms.toastMessage(toast, 'close', 'red');
			else
				snkms.error(toast);
		}
		else{
			locate = "public";
			WebSocketBinaryHandler({
				type: 'login',
				token: token,
				username: userName,
				location: "public"
			});
		}
		
		if($(this).hasClass("additionalSetting")){
			toggleSidebar($(".wrapper_settings"), false, "left");
		}
	});
	
	$('.userWrapper').on('click','div[id] > #dropdown', function(e){
		let $main = $(this).parent();
		
		$main.children('#sessionList').toggle();
		$(this).toggleClass('down');
		
		e.stopPropagation();
	});
	
	$('.userWrapper').on('touchstart','div[id] > #dropdown', function(e){
		e.stopPropagation();
	});
	
	$(".userList").on("click",'.userWrapper > div[title][id]',function(e){
		var targetSession = $(this).attr('id');
		privateChat(targetSession);
	});
	
	$(".lobby > .chat").on("click",'div > author',function(e){
		var targetSession = $(this).attr('data-user');
		privateChat(targetSession);
	});

	$("#moveUp").on("click",function(e){
		$(".lobby").animate ({scrollTop: 0}, 250);
	});
	
	$("#moveDown").on("click",function(e){
		$(".lobby").animate ({scrollTop: $(".lobby > .chat").height()}, 250);
	});
	
	var downTarget;
	$("body").on("mousedown",function(e){
		downTarget = e.target;
	});
	
	$("body").on("click",function(e){
		if(e.target === downTarget){
			if(isMobile() && $(".emoji-window").css('display') == 'block'){
				$('.openBackground').fadeOut(350,function(){
					$('.openBackground').css('opacity', '');
				});
				$(".emoji-window").addClass('close');
				setTimeout(()=>{
					$(".emoji-window").removeClass('close');
					$(".emoji-window").hide();
					$(".messageBox").removeClass('fixed');
				},375);
			}
			else
				$(".emoji-window").hide();
		}
			
		
		$(".additional").hide();
		$("#upload").show();
		$(".textArea").removeClass("maximum");
		$("#add").removeClass("right");
		$("#add img").attr("src",MainDomain + "/images/add.png");
		$(".messageBox").removeClass("unhidden");
	});
	
	$(".emoji-window").on("click",function(e){
		e.stopPropagation();
	});
	
	$("#eClose").on("click",function(e){
		if(isMobile()){
			$(".emoji-window").addClass('close');
			$('.openBackground').fadeOut(350,function(){
				$('.openBackground').css('opacity', '');
				$(".emoji-window").removeClass('close');
				$(".emoji-window").hide();
				$(".messageBox").removeClass('fixed');
			});
		}
		else
			$(".emoji-window").hide();
		
		$(".messageBox").removeClass("unhidden");
		e.stopPropagation();
	});
	$("#emojis").on("click",function(e){
		$(".additional").hide();
		
		if(isMobile()){
			$(".emoji-window #search").attr("placeholder","尋找表情符號！");
			$(".emoji-window #search").attr("readonly",true);
			
			if($(".emoji-window").css('display') == "block"){
				$(".messageBox").addClass("unhidden");
			}
			else{
				$(".messageBox").removeClass("unhidden");
			}
			
			
			$('.openBackground').css('opacity',1);
			$('.openBackground').fadeIn(350);
			$(".messageBox").addClass('fixed');
			$(".emoji-window").show();
		}
		else{
			
			$(".emoji-window").toggle();
			$(".emoji-window #search").focus();
		}
		
		e.stopPropagation();
	});
	
	$(".emoji-window .eBody .eContainer").on("click","div[data-id]",function(e){
		var v = $('#sender').text();
		
		$('#sender').focus();

		let range = (lastRange === null) ? document.getSelection().getRangeAt(0) : lastRange;
		
		if(!$(document.getSelection().focusNode.parentElement).is('#sender') && $(document.getSelection().focusNode.parentElement).parents('#sender').length === 0){
			range = document.getSelection().getRangeAt(0);
			let r = document.createRange();
			r.setStart(document.querySelector('#sender'), 0);
			r.setEnd(document.querySelector('#sender'), 0);
			range = r;
		}
		
		let text = `:${$(this).attr("data-id")}:`;

		var textBefore = v.substring(0,  range.startOffset);
		var textAfter  = v.substring(range.endOffset, v.length);
		
		if(textBefore.length > 0 && v.substr(range.startOffset-1,1) != " ")
			text = " " + text;
		if(textAfter.length > 0 && v.substr(range.endOffset,1) != " ")
			text = text + " ";
		
		var textNode = document.createTextNode(text);
		range.insertNode(textNode);

		// 移動游標位置到末端插入處
		range.setStart(textNode, text.length);
		range.setEnd(textNode, text.length);

		// 因為文字節點無法被定位，因此使用元素節點來定位
		// 建立元素節點
		let elementNodeStart = document.createElement("span");
		elementNodeStart.setAttribute('data-paste', 'true');
		
		// 將元素節點插入到起始位置
		// 後續由觀察者(observer)執行游標移動
		range.insertNode(elementNodeStart);

		if(!e.shiftKey){
			$(".emoji-window").hide();
			$('.openBackground').css('opacity', '');
			$('.openBackground').css('z-index', '');
			$('.openBackground').hide();
			
			$(".messageBox").removeClass("unhidden");
		}
		
		if(e.ctrlKey && v.length === 0){
			var e = $.Event( "keydown", { keyCode: 13 } );
			$('#sender').trigger(e);
		}
	});
	
	$(".emoji-window .eHeader").on("click","#search",function(e){
		if(isMobile()){
			var p = prompt("輸入要搜尋的表情符號...");
			var e = $.Event("keyup");
			$("#search").val(p);
			$("#search").trigger(e);
			
			if($(".textArea").hasClass("maximum"))
				$("#sender").focus();
		}
	});
	
	$(".channelName, .channelHeader .headerTitle").on("click",function(){
		var tempInput = document.createElement('input'),
			text = window.location.href;

		document.body.appendChild(tempInput);
		tempInput.value = text;
		tempInput.select();
		document.execCommand('copy');
		document.body.removeChild(tempInput);
		
		let toast = "已將房間位置複製到剪貼簿";
		if(isMobile())
			snkms.toastMessage(toast, 'content_copy', 'green');
		else
			snkms.success(toast);
	});
	
	$(".emoji-window .eBody .eContainer").on("mouseover","div[data-id]",function(e){
		var id = $(this).attr("data-id");
		$("#search").attr("placeholder",`:${id}:`);
	});
	
	$(".emoji-window .eBody .eContainer").on("mouseout","div[data-id]",function(e){
		$("#search").attr("placeholder","");
	});
	
	
	$(".room").on("contextmenu",".msgWrapper img.emojis",function(e){
		return false;
	});
	$(".messageBox").on("contextmenu","img",function(e){
		return false;
	});
	$(".menu .speedMove").on("contextmenu","img",function(e){
		return false;
	});
	$("body").on("contextmenu",".privateButton img",function(e){
		return false;
	});
	
	$("body").on("dragstart",".privateButton img, .msgWrapper img.emojis, .messageBox img, .menu .speedMove img",function(e){
		return false;
	});
	
	initSetup();
	
	$('#userName').val(localStorage.getItem('username'));
	
	let originalHeight = $(window).height();
	
	$(window).resize(function(){
		setTimeout(()=>{
			onKeyEnter($('#sender'));
		},250);
	});
	
	$(window).on('popstate',function(e){
		location.replace(location.href);
	});
	
	$(window).load(function(){
		onScroll(true);
	});
	
	$(window).resize(function(){
		initSettings();
	});
	
	$(document).ready(function(){
		initSettings()
	});
	
	$('#settings').on('click',function(){
		openSettings();
	});
	$('.wrapper_settings').on('click','#onClose',function(){
		closeSettings();
	});
	
    $(document).on('keydown', function(e) {
        if (e.which == 27) {
            closeSettings();
        }
    });
	
	$(document).on( "dragenter", function(e) {
		if(e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.types.indexOf("Files") !== -1){
			if(!$(".dragHover").length){
				$("body").append('<div class="dragHover"><div></div></div>');
				$(".dragHover").fadeIn(150);
				$(".dragHover").on("dragleave",function(){
					$(".dragHover").fadeOut(150,function(){
						$(this).remove();
					});
				});
			}
			
			e.preventDefault();
		}
	});
	$(document).on( "dragleave", function(e) {
		if(e.target === document.querySelector('.dragHover') || e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.types.indexOf("Files") !== -1){
			e.preventDefault();
		}
	});
	$(document).on( "dragover", function(e) {
		if(e.target === document.querySelector('.dragHover') || e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.types.indexOf("Files") !== -1){
			e.preventDefault();
		}
	});
	$(document).on( "drop", function(e) {
		dropHandler(e);
		if(e.target === document.querySelector('.dragHover') || e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.types.indexOf("Files") !== -1){
			e.preventDefault();
		}
		
		if($(e.target).parents('#sender').length > 0){
			droppedText = true;
		}
		else{
			droppedText = false;
		}
		
		//e.preventDefault();
	});
	
	// 防止拖曳進入輸入框的連結或文字含有HTML標籤
	/*$('#sender').bind('DOMNodeInserted', function(event){
		  if(event.originalEvent && event.originalEvent.target){
			var target = $(event.originalEvent.target);
			if(event.originalEvent.target.tagName != undefined){
				var text = document.createTextNode(target.context.href || target.context.innerText);
				event.originalEvent.target.before(text);
				target.remove();
			}
		  }
	});*/
	
	// 防止拖曳進入輸入框的連結或文字含有HTML標籤
	// 同時自動偵測輸入框變化以反應游標位置
	const observer = new MutationObserver(MutationCallback);
	
	function MutationCallback(mutations) {
	   var changed = false;
	   observer.disconnect();
	   mutations.forEach((record) => {
		  if(record.type === 'childList' && record.addedNodes.length > 0){
			  record.addedNodes.forEach(node => {
				  if(node.tagName != undefined && node.getAttribute('triggered') === null && node.tagName !== 'BR'){
						var target = $(node);
						
						target.replaceWith(function(){
							if($(this).attr('data-paste')){
								return '<span triggered="true" newElement="true"></span>';
							}
							else{
								let content = ($(this).attr('href') || $(this).text());
								if($(this).hasClass('emojis') && $(this).attr('title')){
									content = $(this).attr('title');
								}
								
								return '<span triggered="true" newElement="true">'+((content?.length)?content:' ')+'</span><br/>';
							}
						});

						changed = true;
				  }
			  });
		  }
	   });
	   
		if(changed){
			// 防止拖曳進入的文字後方出現換行符號
			var content = $('#sender').html();
			$('#sender').html(content.replaceAll(/<br\/?>(\n)?/ig,''));
			var elements = document.querySelectorAll('#sender span[newElement]');
			var i = 0;

			elements.forEach(e => {
				i++;
				
				if(elements.length === i){
					e.setAttribute('cursorPoint', true);
				}
				
				e.removeAttribute('newElement');
			});

			// 移動游標位置到插入處末端
			var pointerNode = document.querySelector('#sender span[cursorPoint]');
			if(pointerNode != null){
				setTimeout(()=>{
					// If you pass the DOM node you should give the start and end offsets as 0 and 1 to create a range over the DOM node
					// (Select All Over DOM Node)
					// https://stackoverflow.com/a/30856479/14486292
					var range = document.createRange();
					
					range.setStart(pointerNode, pointerNode.textContent?.length ? 1 : 0);
					range.setEnd(pointerNode, pointerNode.textContent?.length ? 1 : 0);

					// 將捲軸捲動到元素位置
					pointerNode.scrollIntoView();
					
					// 重設游標位置
					document.getSelection().removeAllRanges();
					document.getSelection().addRange(range);
					
					// 移除標記
					pointerNode.removeAttribute('cursorPoint');
					onKeyEnter($('#sender'));
				},1);
			}
		}
		observer.observe(document.getElementById('sender'), {
		  childList: true,
		  characterData: true,
		  subtree: true
		});
	};
	
	
	observer.observe(document.getElementById('sender'), {
	  childList: true,
	  characterData: true,
	  subtree: true
	});
	
	
	var dropHandler = function(e) {
		var fileList = e.originalEvent.dataTransfer.files;
		if(fileList.length == 0){$(".dragHover").remove();return;}
		
		uploadPrepare(fileList, false);
		$(".dragHover").fadeOut(150,function(){
			$(this).remove();
		});
	};
	
	$('.lobby').on('scroll',function(){
		let containerHeight = $(this).height();
		let scrollHeight = $(this).prop("scrollHeight");
		let scrollTop = $(this).scrollTop();
		
		let nowPost = scrollHeight - scrollTop;
		if(containerHeight > nowPost - 10){
			scrollBottom = true;
		}
		else{
			scrollBottom = false;
		}
		
		if(containerHeight < nowPost - 200){
			$("#moveDown").show();
		}
		else{
			$("#moveDown").hide();
		}
		
		if(nowPost + 200 < scrollHeight){
			$("#moveUp").show();
		}
		else{
			$("#moveUp").hide();
		}
	});
	
	if(!isMobile() || window.innerWidth > 480){
		$('.wrapper_settings').fadeIn(10, function() {
			$('.wrapper_settings').hide();
		});
	}
	
	function createDragElementsObject(target){
		if(!dragElement[target])
			dragElement[target] = {
				rx: 0,
				x: 0,
				y: 0
			};
		dragElement[target].y = parseInt($(target).css('top'));
		dragElement[target].x = parseInt($(target).css('left'));
		dragElement[target].rx = parseInt($(target).css('right'));
	}
}

function initSetup(){
	if(!localStorage.getItem('username')){
		snkms.prompt('設定', '該如何稱呼你？','',
					function(evt, value) {
						userName = value;
						localStorage.setItem('username', value);
						$('#userName').val(value);
						WebSocketConnect();
						$('.userlist > div').show();
					},function(){
						const rndName = getRandomNickname();
						
						userName = rndName;
						localStorage.setItem('username', rndName);
						$('#userName').val(rndName);
						WebSocketConnect();
						$('.userlist > div').show();
					});
	}
	else{
		userName = localStorage.getItem('username');
		WebSocketConnect();
		$('.userlist > div').show();
	}
	
	if(isMobile()){
		$('.room').css('height',$(window).height() - $('.messageBox').height() - 20);
		$('#userName').attr('readonly',true);
		$('#userName').on('click',function(){
			snkms.prompt('設定', '該如何稱呼你？','',
						function(evt, value) {
							userName = value;
							$('#userName').val(value);
							savingSettings();
						});
		});
	}
	
	emojis = Object.keys(emojis).sort().reduce(
	  (obj, key) => { 
		obj[key] = emojis[key]; 
		return obj;
	  },{}
	);
	
	let devicePixel = (window.devicePixelRatio == 1) ? 32 : (devicePixelRatio == 2) ? 64 : 96;
	for(let e in emojis){
		$(".emoji-window .eBody .eContainer").append(`<div title=":${e}:" data-id="${e}" data-ripple><span style="--emoji-url: url(${emojis[e]}?size=${devicePixel});"></span></div>`);
	}
	
	$.fn.tagName = function() {
	  return this.prop("tagName").toLowerCase();
	};
}

function initSettings(){
	if(isMobile() && window.innerWidth <= 480){
		var elements = $(".additional").find('div');
		
		elements.each(function(){
			$(this).addClass("additionalSetting");
			$(".settings_body").append($(this));
		});
		
		$(".additional").empty();
	}
	else{
		var elements = $(".settings_body").find('.additionalSetting');
		var k = 0;
		elements.each(function(){
			k++;
			$(this).removeClass("additionalSetting");
			$(".additional").append($(this));
			
			if(k % 2 == 0 && k != elements.length)
				$(".additional").append("<br/>");
		});
	}
	
	//$('.userList').css('bottom', $('.chatInfo').outerHeight() + 'px');
}

function escapeHtml(unsafe){
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

function isMobile() { 
	var userAgentInfo = navigator.userAgent; 
	var Agents = new Array("Android", "iPhone", "SymbianOS", "Windows Phone", "iPad", "iPod");
	var flag = false; 
	for (var v = 0; v < 6; v++ ) { 
	if (userAgentInfo.indexOf(Agents[v]) > 0) { flag = true;break;}
	}
	return flag;
}

function base64ToBlob(base64, mime){
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
	return new Blob(byteArrays, {type: mime});
};

// https://stackoverflow.com/a/18639999/14486292
function crc32(str) {
    var crcTable = crcTableGlobal || (crcTableGlobal = makeCRCTable());
    var crc = 0 ^ (-1);

    for (var i = 0; i < str.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

function makeCRCTable(){
    var c;
    var crcTable = [];
    for(var n =0; n < 256; n++){
        c = n;
        for(var k =0; k < 8; k++){
            c = ((c&1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1));
        }
        crcTable[n] = c;
    }
    return crcTable;
}

function getNowDate(){
	let date = new Date();
	let year = date.getFullYear();
	let month = (date.getMonth()+1 < 10)?'0'+(date.getMonth()+1):date.getMonth()+1;
	let day = (date.getDate() < 10)?'0'+date.getDate():date.getDate();
	
	return `${year}/${month}/${day}`;
}

function getRandomNickname(){
	var list = ["Emily","Amy","Alice","Grace","Tina","Joyce","Vivian","Cindy","Ivy","Jenny","Claire","Annie","Vicky","Jessica","Peggy","Sandy","Irene","Iris","Maggie","Winnie"];
	return list.at(Math.floor(Math.random() * list.length));
}

// 取得公私鑰對
async function getKeyPair(){
	if(localStorage.getItem('keyPair') != null){
		return JSON.parse(localStorage.getItem('keyPair'));
	}
	else{
		let keyPair = await ecdh.generateKeyPair();
		let publicKeyJwk = await ecdh.exportKey(keyPair.publicKey);
		let privateKeyJwk = await ecdh.exportKey(keyPair.privateKey);
		
		let obj = {
			"publicKey": publicKeyJwk,
			"privateKey": privateKeyJwk
		};
		
		localStorage.setItem('keyPair', JSON.stringify(obj));
		
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
async function getSecretPublicKeyRaw() {
    let keyPair = await getStoredKeyPair();
    let publicKey = await ecdh.exportPublicKey(keyPair.publicKey);
    let publicKeyEncode = new Uint8Array(publicKey).map((byte, index) => {
        let charCode = roomPassword.charCodeAt(index % roomPassword.length);
        return byte ^ charCode;
    });

    return {
        publicKeyRawBase64: btoa(String.fromCharCode(...publicKeyEncode)),
        privateKey: keyPair.privateKey
    };
}

// 取得base64私鑰
async function encodePrivateKey(privateKeyCrypto) {
	let privateKeyJwk = await ecdh.exportKey(privateKeyCrypto);
	let jsonJwk = JSON.stringify(privateKeyJwk);
	let arrayObj = jsonJwk.split("");
	
	let charCodeArr = arrayObj.map((str, index) => {
        let charCode = roomPassword.charCodeAt(index % roomPassword.length);
        return str.charCodeAt(0) ^ charCode;
    });
	//console.log(charCodeArr);
    return btoa(unescape(encodeURIComponent(String.fromCharCode(...charCodeArr))));
}

// 解密base64私鑰
async function decodePrivateKey(privateKeyBase64) {
    let privateKeyJwkArray = Uint8Array.from(decodeURIComponent(escape(atob(privateKeyBase64))), c => c.charCodeAt(0));
    let privateKeyDecode = privateKeyJwkArray.map((byte, index) => {
        let charCode = roomPassword.charCodeAt(index % roomPassword.length);
        return byte ^ charCode;
    });
	
	let arrayObj = String.fromCharCode(...privateKeyDecode)
	let privateKey = await ecdh.importKey(JSON.parse(arrayObj), "private");
    return privateKey;
}

// 取得加密公鑰及私鑰(新產生)
async function getNewSecretPublicKeyRaw() {
    let keyPair = await ecdh.generateKeyPair();
    let publicKey = await ecdh.exportPublicKey(keyPair.publicKey);
    let publicKeyEncode = new Uint8Array(publicKey).map((byte, index) => {
        let charCode = roomPassword.charCodeAt(index % roomPassword.length);
        return byte ^ charCode;
    });

    return {
        publicKeyRawBase64: btoa(String.fromCharCode(...publicKeyEncode)),
        privateKey: keyPair.privateKey
    };
}

// 解密公鑰並取得公享金鑰
async function getSharedSecret(publicKeyRawBase64, privateKey) {
    let publicKeyRaw = Uint8Array.from(atob(publicKeyRawBase64), c => c.charCodeAt(0));
    let publicKeyDecode = publicKeyRaw.map((byte, index) => {
        let charCode = roomPassword.charCodeAt(index % roomPassword.length);
        return byte ^ charCode;
    });

    let publicKey = await ecdh.importPublicKey(publicKeyDecode);
    let secretKey = await ecdh.deriveSecretKey(privateKey, publicKey);
    let sharedSecretRaw = await crypto.subtle.exportKey("raw", secretKey);
	
    return {secretKey, sharedSecretRaw};
}

// 加密訊息
async function encryptMessage(sharedSecretKey, message) {
    const enc = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 12 bytes IV for AES-GCM
    const encodedMessage = enc.encode(message);

    const encrypted = await crypto.subtle.encrypt(
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
async function decryptMessage(sharedSecretKey, iv, encryptedMessage) {
    const dec = new TextDecoder();

    const decrypted = await crypto.subtle.decrypt(
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
async function hashString(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
	
    return hashHex.toUpperCase();
}

// 載入初始化函數
$(function(){
	initFirst(window);
});

var ecdh = {
    generateKeyPair: async function() {
        return await crypto.subtle.generateKey(
            {
                name: "ECDH",
                namedCurve: "P-521"
            },
            true,
            ["deriveKey"]
        );
    },
    deriveSecretKey: async function(privateKey, publicKey) {
        return await crypto.subtle.deriveKey(
            {
                name: "ECDH",
                public: publicKey
            },
            privateKey,
            {
                name: "AES-GCM",
                length: 256
            },
            true,
            ["encrypt", "decrypt"]
        );
    },
    exportPublicKey: async function(key) {
        const exported = await crypto.subtle.exportKey("raw", key);
        return Array.from(new Uint8Array(exported));
    },
    exportPrivateKey: async function(key) {
        const exported = await crypto.subtle.exportKey("raw", key);
        return Array.from(new Uint8Array(exported));
    },
    importPublicKey: async function(rawKey) {
        return await crypto.subtle.importKey(
            "raw",
            new Uint8Array(rawKey),
            {
                name: "ECDH",
                namedCurve: "P-521"
            },
            true,
            []
        );
    },
    exportKey: async function(key) {
        return await crypto.subtle.exportKey("jwk", key);
    },
    importKey: async function(jwk, type) {
        return await crypto.subtle.importKey(
            "jwk",
            jwk,
            {
                name: "ECDH",
                namedCurve: "P-521"
            },
            true,
            type === "public" ? [] : ["deriveKey"]
        );
    }
};

var Logger = function(isDebugger){
	if(window.Logger != undefined && typeof window.Logger === "object" && isDebugger){
		return window.Logger;
	}
	else{
		if(isDebugger){
			console.log('[Logger]', "debugger mode");
			return {
				Types: {
					WARN: console.warn,
					ERROR: console.error,
					LOG: console.log
				},
				show: function(type,...raw){
					type(...raw);
				}
			};
		}
		else{
			return {
				Types: {
					WARN: null,
					ERROR: null,
					LOG: null
				},
				show: function(type,...raw){
					return null;
				}
			};
		}
	}
}(isDebugger);

var snkms = function($){
	// *** 內部變數區域 *** //
	
	// 關閉動畫
	// @private
	function slideOut(selector,callback){
		$(selector).animate({right:"15px"},'fast',function(){
			$(this).animate({right:"-260px"},'fast',function(){
				$(this).remove();
				
				if(typeof callback === 'function')
					callback();
				
				setTimeout(()=>{
					if($('.snkms-message').children().length === 0){
						$('.snkms-message').remove();
					}
				},250);
			});
		});
	};
	
	// 搖動動畫(未輸入內容時的提示)
	// @private
	function shakingWindow(time){
		$('.snkms-content').addClass('shake');
		$('.snkms-content .content-text #option-input').focus();
		$('.snkms-content').removeClass('noAnime');
		setTimeout(function(){
			$('.snkms-content').removeClass('shake');
			$('.snkms-content').addClass('noAnime');
		}, (time) ? time: 350);
	};
	
	// 鍵盤事件
	// @private
	function keyboardEventHandler(e){
		if(e.keyCode == 27){
			let $dom = $('.snkms-content .body-bottom #cancel');
			if($dom.length > 0)
				$dom.click();
			else
				removeElements();
		}
		if(e.keyCode == 13){
			$('.snkms-content .body-bottom #ok').click();
		}
	};
	
	// 全域建立DOM函數
	// @private
	function initializeElements(hasCancel){
		if($('.snkms-jsd-m').length === 1){
			$('.snkms-jsd-m').remove();
		}
		var DragDOM = undefined;
		
		$('body').addClass('noOverflow');
		$('body').append('<div class="snkms-jsd-m">');
		$('.snkms-jsd-m').append(`<div class="snkms-content">`);
		$('.snkms-content').append('<div class="snkms-title">');
		$('.snkms-title').append('<div class="close"><i class="material-icons">close</i></div>');
		$('.snkms-title').append('<div class="content">');
		$('.snkms-content').append('<div class="content-text">');
		$('.snkms-content').append('<div class="body-bottom">');
		
		if(hasCancel)
			$('.snkms-content .body-bottom').append('<button id="cancel" data-ripple>取消</button>');
		
		$('.snkms-content .body-bottom').append('<button id="ok" data-ripple>好的</button>');
		
		$(window).on('keydown', keyboardEventHandler);
		$('body').on('click','.snkms-content .snkms-title .close',function(){
			let $dom = $('.snkms-content .body-bottom #cancel');
			if($dom.length > 0)
				$dom.click();
			else
				removeElements();
		});
		
		var clicking = false;
		var endx = 0;
		var endy = 0;	
		var downx = 0;
		var downy = 0;
		var g_left = 0;
		var g_top = 0;
		
		// 滑鼠按下
		$(document).on('mousedown','.snkms-title',function(e){
			DragDOM = ".snkms-content";
			clicking = true;
			//設定移動後的預設位置
			//獲取div的初始位置，要注意的是需要轉整型，因為獲取到值帶px
			var left = parseInt($(DragDOM).css("left"),10);
			var top = parseInt($(DragDOM).css("top"),10);
			//獲取滑鼠按下時的座標，區別於下面的es.pageX,es.pageY
			downx=e.pageX;
			downy=e.pageY;
			
			g_left=left;
			g_top=top;
				
			$('body').css('user-select','none');
		});
		
		// 滑鼠放開
		$(document).on('mouseup','.snkms-jsd-m',function(){
			clicking = false;
			$('body').css('user-select','');
		})
		
		// 滑鼠移動
		$(document).on('mousemove','.snkms-jsd-m',function(es){
			if(clicking == false) return;
			var endx= es.pageX-downx+g_left;
			var endy= es.pageY-downy+g_top;
							
			$(DragDOM).css("left",endx+"px").css("top",endy+"px")    
		});
	};
	
	// 全域移除DOM函數
	function removeElements(){
		$('body').removeClass('noOverflow');
		$('.snkms-jsd-m .snkms-content').removeClass('noAnime');
		$('.snkms-jsd-m .snkms-content').addClass('close');
		
		// 刪除所有JSD事件
		$('body').off('click onReadValue','.snkms-content .body-bottom #ok');
		$('body').off('click','.snkms-content .body-bottom #cancel');
		$('body').off('click','.snkms-content .snkms-title .close');
		
		$(document).off('mousemove','.snkms-jsd-m');
		$(document).off('mouseup','.snkms-jsd-m');
		$(document).off('mousedown','.snkms-title');
		
		$(window).unbind('keydown', keyboardEventHandler);
		
		// 淡出並移除元素
		$('.snkms-jsd-m').fadeOut(400,function(){$(this).remove();});
	};
	
	// *** 外部變數區域 *** //
	return {
		isShownDialog: function(target){
			return $(target).parents(".snkms-jsd-m").length > 0;
		},
		// 手機版訊息
		toastMessage: function(content, icon, color, callback){
			icon = (typeof icon === 'string')?icon:'';
			color = (typeof icon === 'string')?' '+color:'';
			$('body').append('<div data-convert="false" class="toast'+color+'"><i class="material-icons">'+icon+'</i><span>'+content+'</span></div>');
			
			$('body .toast[data-convert="false"]').each(function(){				
				$(this).attr('data-convert',"true");
				$(this).slideDown(200);
				$('.channelHeader').addClass('slideDown');
				$('.channelName').addClass('slideDown');
				$('.settings_title').addClass('slideDown');
				$('.userList').addClass('slideDown');
				
				setTimeout(()=>{
					$(this).attr('data-readyRemove',true);
					
					if($('body .toast[data-readyRemove="true"]').length === $('body .toast').length){
						$('.channelHeader').removeClass('slideDown');
						$('.channelName').removeClass('slideDown');
						$('.settings_title').removeClass('slideDown');
						$('.userList').removeClass('slideDown');
					}
					
					$(this).slideUp(250,function(){
						$(this).remove();
						if(typeof callback === 'function') callback();
					});
				},3000);
				/*
				var timerToastCount = setInterval(()=>{
					if($('body .toast').length === 0){
						$('.channelHeader').removeClass('slideDown');
						$('.channelName').removeClass('slideDown');
						$('.settings_title').removeClass('slideDown');
						$('.userList').removeClass('slideDown');
						clearInterval(timerToastCount);
					}
				},100);
				*/
			});
		},
		// success 函數
		success: function(content,callback,duration){
			duration = (duration && typeof duration === 'number')?duration:3000;
			
			if(!$('.snkms-message').length){$('body').append('<div class="snkms-message">');}
			$('.snkms-message').append('<div data-registered="false" class="snkms-status snkms-success">'+content+'<span></span></div>');
			$('.snkms-success[data-registered="false"]').each(function() {
				var dom = this;
				var timeout = setTimeout(function(){
					slideOut(dom,callback);
				}, duration);
				
				$(this).on('click',function(){
					clearTimeout(timeout);
					slideOut(dom,callback);
				});
				
				if(duration !== 5000)
					$(this).children('span').attr('style',`animation-duration: ${duration}ms`);
				
				$(this).attr('data-registered',true);
			});
		},
		// error 函數
		error: function(content,callback,duration){
			duration = (duration && typeof duration === 'number')?duration:3000;
			
			if(!$('.snkms-message').length){$('body').append('<div class="snkms-message">');}
			$('.snkms-message').append('<div data-registered="false" class="snkms-status snkms-error">'+content+'<span></span></div>');
			$('.snkms-error[data-registered="false"]').each(function() {
				var dom = this;
				var timeout = setTimeout(function(){
					slideOut(dom,callback);
				}, duration);
				
				$(this).on('click',function(){
					clearTimeout(timeout);
					slideOut(dom,callback);
				});
				
				if(duration !== 5000)
					$(this).children('span').attr('style',`animation-duration: ${duration}ms`);
				
				$(this).attr('data-registered',true);
			});
		},
		// alert 彈出視窗函數
		alert: function(title,content){
			initializeElements(false);
			if(!content){
				var content = title;
				var title = '系統訊息';
			}
			$('.snkms-title .content').text(title);
			$('.snkms-content .content-text').html(content);
			
			$('body').on('click','.snkms-content .body-bottom #ok',function(){
				removeElements();
			});
		},
		// confirm 彈出確認視窗函數
		confirm: function(content,ok,cancel){
			initializeElements(true);
			$('.snkms-title .content').text('系統訊息');
			$('.snkms-content .content-text').html(content);
			
			
			if(ok && typeof ok === 'function')
				$('body').on('click','.snkms-content .body-bottom #ok',ok);
			
			$('body').on('click','.snkms-content .body-bottom #ok',function(){
				removeElements();
			});
			
			if(cancel && typeof cancel === 'function'){
				// 將函數綁定到取消按鈕以及右上角的叉叉
				$('body').on('click','.snkms-content .body-bottom #cancel',cancel);
				$('body').on('click','.snkms-title .close',cancel);

				$('body').on('click','.snkms-content .body-bottom #cancel',function(){
					removeElements();
				});
			}
			else{
				$('body').on('click','.snkms-content .body-bottom #cancel',function(evt){
					removeElements();
				});
			}
		},
		// prompt 彈出輸入視窗函數
		prompt: function(title,content,placeholder,ok,cancel){
			initializeElements(true);
			$('.snkms-title .content').text(title);
			$('.snkms-content .content-text').html(content+'<div><input type="text" placeholder="'+placeholder+'" id="prompt-input" /></div>');
			
			setTimeout(()=>{
				$('.snkms-content .content-text #prompt-input').focus();
			},250);
			
			$('body').on('click','.snkms-content .body-bottom #ok',function(evt) {
				var value = $('.snkms-content .content-text #prompt-input').val();
				if(!value){
					shakingWindow();
				}
				else{
					// 觸發自訂 onReadValue 事件並傳遞輸入框內容
					$("#ok").trigger("onReadValue",[value]);
				}
			});
			
			if(ok && typeof ok === 'function')
				$('body').on('onReadValue','.snkms-content .body-bottom #ok',ok);
			
			$('body').on('onReadValue','.snkms-content .body-bottom #ok',function(){
				removeElements();
			});
			
			if(cancel && typeof cancel === 'function'){
				$('body').on('click','.snkms-content .body-bottom #cancel',cancel);
				$('body').on('click','.snkms-content .body-bottom #cancel',function(){
					removeElements();
				});
			}
			else{
				$('body').on('click','.snkms-content .body-bottom #cancel',function(evt){
					removeElements();
				});
			}
		
		},
		// option 彈出下拉選單視窗函數
		option: function(title,content,options,hasOtherInput,ok,cancel,defaultSelectedNumber){
			initializeElements(true);
			$('.snkms-title .content').text(title);
			$('.snkms-content .content-text').html(content+'<div><select id="option-input"><option value="DEFAULT">-</option></select></div>');
			$('.snkms-content .content-text #option-input').focus();
			
			if(typeof options === 'object' && Array.isArray(options)){
				for(let o of options){
					if(o.value && o.name)
						$('.snkms-content .content-text #option-input').append('<option value="'+o.value+'">'+o.name+'</option>');
					else{
						removeElements();
						throw new Error(`The option parms error:\nname: ${o.name}, value: ${o.value}`);
					}
				}
			}
			else{
				removeElements();
				throw new Error(`The option type should be array.`);
			}
			
			var inputCount = 1 + options.length;
			
			if(typeof hasOtherInput === 'boolean' && hasOtherInput === true || typeof hasOtherInput === 'string' && hasOtherInput.length > 0){
				if(typeof hasOtherInput === 'string' && hasOtherInput.length > 0)
					$('.snkms-content .content-text #option-input').append('<option value="OTHER">'+hasOtherInput+'</option>');
				else
					$('.snkms-content .content-text #option-input').append('<option value="OTHER">其他</option>');
				
				$('.snkms-content .content-text #option-input').parent().append('<input style="display:none;" type="text" id="prompt-input" />');
				
				$('body').on('change','.snkms-content .content-text #option-input',function(evt) {
					if($(this).val() === 'OTHER'){
						$('.snkms-content .content-text #prompt-input').show();
						$('.snkms-content .content-text #prompt-input').focus();
					}
					else{
						$('.snkms-content .content-text #prompt-input').hide();
					}
				});
				
				inputCount++;
			}
			
			if(typeof defaultSelectedNumber === 'number'){
				if(defaultSelectedNumber < inputCount){
					$('.snkms-content .content-text #option-input option').filter(function(idx){
						return defaultSelectedNumber === idx;
					}).attr('selected', true).change();
				}
				else{
					removeElements();
					throw new Error(`The number selected by default must be less than the number of options. choose: ${defaultSelectedNumber}, maximum: ${inputCount}`);
				}
			}
			
			
			$('body').on('click','.snkms-content .body-bottom #ok',function(evt) {
				var value = $('.snkms-content .content-text #option-input').val();
				if(!value || value === 'DEFAULT'){
					shakingWindow();
				}
				else{
					if(value === 'OTHER' && $('.snkms-content .content-text #prompt-input').length > 0 && $('.snkms-content .content-text #prompt-input').val())
						value = $('.snkms-content .content-text #prompt-input').val();
					
					if(value === 'OTHER' || value.trim().length === 0){
						shakingWindow();
					}
					else{	
						// 觸發自訂 onReadValue 事件並傳遞輸入框內容
						$("#ok").trigger("onReadValue",[value]);
					}
				}
			});
			
			if(ok && typeof ok === 'function')
				$('body').on('onReadValue','.snkms-content .body-bottom #ok',ok);
			
			$('body').on('onReadValue','.snkms-content .body-bottom #ok',function(){
				removeElements();
			});
			
			if(cancel && typeof cancel === 'function'){
				$('body').on('click','.snkms-content .body-bottom #cancel',cancel);
				$('body').on('click','.snkms-content .body-bottom #cancel',function(){
					removeElements();
				});
			}
			else{
				$('body').on('click','.snkms-content .body-bottom #cancel',function(evt){
					removeElements();
				});
			}
		
		}
	}
// end
}($);

// Check that service workers are supported
if ('serviceWorker' in navigator) {
  // Use the window load event to keep the page load performant
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/js/service-workers.js');
  });
}

delete window.localStorage;
delete window.crypto;
// end of immediately function
})(jQuery, window);
window.onScroll = function(force){
	let containerHeight = $('.lobby > .chat').height();
	let scrollHeight = $('.lobby > .chat').prop("scrollHeight");
	let scrollTop = $('.lobby > .chat').scrollTop();
	
	let nowPost = scrollHeight - scrollTop;
	
	if(nowPost < 700 || force || scrollBottom){
		$('.lobby').scrollTop(scrollHeight);
	}
	
	if($('.lobby > .chat').height() > $('.lobby').height())
		$("#moveUp").show();
	else
		$("#moveUp").hide();
}
/*
window.mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};
*/
