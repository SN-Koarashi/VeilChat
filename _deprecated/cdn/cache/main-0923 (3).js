// 全域變數
var wss,
	localStorage = window.localStorage,
	clientList = {},
	inviteList = [],
	userName = "Unknown",
	locate = "public",
	sessionSelf,
	scrollBottom = false;

// start of immediately function
(function($){
function connect(){
	wss = new WebSocket('wss://api.snkms.com:443/ws');
	
	wss.onopen = () => {
		console.log('[WebSocketHandler]','Open connection.');
		snkms.success("與伺服器連線成功");
		wss.send(JSON.stringify({
			type: 'login',
			username: userName,
			location: $('#room_id').val()
		}));
		
		onScroll(false);
	}
	
	wss.onclose = (e) => {
		console.log('[WebSocketHandler]','Close connection.');
		onScroll(false);
		snkms.error("與伺服器連線失敗: "+e.code,function(){
			connect();
		});
	}
	
	wss.onerror = () => {
		console.log('[WebSocketHandler]','Error connection.');
	}
	
	wss.onmessage = (e) => {
		let data = JSON.parse(e.data);
		console.log("[WebSocketHandler]",data);

		if(data.type == 'profile'){
			clientList = {};
			$('.userWrapper').empty();
			var uList = data.user;

			for(let u in uList){
				uList[u].forEach(e =>{
					clientList[e.session] = {
						address: u,
						username: e.username,
						id: e.id
					};

					if($('.userWrapper').find(`#${u}`).length == 0)
						$('.userWrapper').append(`<div title="${e.username}#${crc32(u)} / 位置摘要: ${u}" id="${u}">`);
					
					if($('.userWrapper').find(`#${u} #username`).length == 0)
						$('.userWrapper').find(`#${u}`).append(`<div id="username"><author></author><pid></pid></div>`);
					
					$('.userWrapper').find(`#${u} #username author`).text(`${e.username}`);
					$('.userWrapper').find(`#${u} #username pid`).text(`#${crc32(u)}`);
					$('.userWrapper').find(`#${u}`).append(`<span id="session" data-id="${e.session}">${e.id}</span>`);
				});
			}
			
			
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
			
			$('.lobby > .chat').find(`author[data-self-id="${crc32(userName+clientList[sessionSelf].address)}"]`).addClass('sameWorker');
			$('.userWrapper').find(`#session[data-id="${sessionSelf}"]`).addClass('me');
		}
		else if(data.type == 'verified'){
			let tempLocate = locate;
			locate = data.location;
			sessionSelf = data.session;
			$('.settings_footer span').text(sessionSelf);
			
			if(!data.status){
				let channelName = (locate == "public")?"#大廳":"#私聊 "+locate;
				
				$('.lobby > .chat').empty();
				$('.lobby > .chat').append(`<div id="system">目前房間為 ${channelName}</div>`);
				$('.channelName').text(channelName);
				$('.textPlaceholder').text(`傳訊息到 ${channelName}`);
				document.title = channelName + " @ XCoreNET 匿名聊天室 - 天夜之心";
				
				if(locate == "public"){
					window.history.pushState(null, document.title, "/");
				}
				else{
					window.history.pushState(null, document.title, '/private/'+locate);
					snkms.success("私聊加入成功");
					$('.lobby > .chat').append(`<div id="system">私聊房間位置及其所有訊息會在所有使用者離開後60秒自動銷毀</div>`);
				}
			}
			else{
				if(data.status == "private_failed"){
					locate = "public";
					snkms.error(data.message);
				}
				else if(inviteList.length > 0){
					inviteList.forEach(s => {
						privateChat(s, `[invite]${locate}[/invite]`);
					});
					
					inviteList = [];
				}
				
				wss.send(JSON.stringify({
					type: 'login',
					username: userName,
					location: locate
				}));
			}
		}
		else if(data.type == 'history'){
			data.message.forEach(e => {
				onMessage(data.type,e.session,e.address,e.username,e.id,e.message,e.time);
				onScroll(true);
			});
		}
		else if(data.type == 'message'){
			onMessage(data.type,data.session,clientList[data.session].address,clientList[data.session].username,clientList[data.session].id,data.message,new Date().getTime());
		}
		else if(data.type == 'privateMessage'){
			onMessage(data.type,data.source.session,clientList[data.source.session].address,clientList[data.source.session].username,clientList[data.source.session].id,data.message,new Date().getTime());
		}
		else if(data.type == 'forbidden'){
			$('.lobby > .chat').append(`<div id="system">伺服器拒絕您的連線: ${data.message}</div>`);
		}
		else{
			console.warn('Unknown type',data.type);
		}
	}
}

function onMessage(messageType,session,address,username,id,message,timestamp){
	let date = new Date(timestamp);
	let year = date.getFullYear();
	let month = (date.getMonth()+1 < 10)?'0'+(date.getMonth()+1):date.getMonth()+1;
	let day = (date.getDate() < 10)?'0'+date.getDate():date.getDate();
	let hour = (date.getHours() < 10)?'0'+date.getHours():date.getHours();
	let minute = (date.getMinutes() < 10)?'0'+date.getMinutes():date.getMinutes();

	if(messageType.startsWith("privateMessage")){
		let sourceText = "[悄悄話]";
		if(messageType.endsWith("Source"))
			sourceText = "[發送給]";
		
		$('.lobby > .chat').append(`<div id="${date.getTime()}"><author data-id="${session}" title="來源工作階段: ${session}" class="private">${sourceText} ${username}#${crc32(address)}</author> <span title="${year}/${month}/${day} ${hour}:${minute}">${DateFormatter(timestamp)}</span><div data-convert="true" class="msgWrapper"></div></div>`);
	}
	else{
		$('.lobby > .chat').append(`<div id="${date.getTime()}"><author data-id="${session}" data-self-id="${crc32(username+address)}" class="${session}" title="來源工作階段: ${session} / 工作階段ID: ${id}">${username}#${crc32(address)}</author> <span title="${year}/${month}/${day} ${hour}:${minute}">${DateFormatter(timestamp)}</span><div data-convert="true" class="msgWrapper"></div></div>`);
	}
	
	$('.lobby > .chat div[id="'+date.getTime()+'"]').find('div.msgWrapper').text(message);
	
	$('.lobby > .chat div.msgWrapper[data-convert="true"]').each(function(){
		let content = $(this).text();
		$(this).html(ContentFormatter(content));
		$(this).removeAttr('data-convert');
	});
	
	$('.lobby > .chat').find(`.${sessionSelf}`).addClass('me');
	
	if(clientList[sessionSelf] && !$('.lobby > .chat').find(`author[data-self-id="${crc32(userName+clientList[sessionSelf].address)}"]`).hasClass('me'))
		$('.lobby > .chat').find(`author[data-self-id="${crc32(userName+clientList[sessionSelf].address)}"]`).addClass('sameWorker');
	
	onScroll(messageType == "history");
}

function getNowDate(){
	let date = new Date();
	let year = date.getFullYear();
	let month = (date.getMonth()+1 < 10)?'0'+(date.getMonth()+1):date.getMonth()+1;
	let day = (date.getDate() < 10)?'0'+date.getDate():date.getDate();
	
	return `${year}/${month}/${day}`;
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

function toggleSidebar($element,flag,openDirection){
	if(window.innerWidth > 480) return;
	
	if(flag){
		//$element.css(openDirection,"5px");
		$element.attr("data-open",true);
		
		$('body').attr('style','overflow:hidden;');
		$(".lobby").addClass("inHidden");
		$(".messageBox #container").addClass("inHidden");
		$(".lobby").addClass(openDirection);
		$(".messageBox #container").addClass(openDirection);
		$(".openBackground").fadeIn(250);
		$(".menu").fadeOut(250);
	}
	else{
		//$element.css(openDirection,"-100vw");
		$element.removeAttr("data-open");
		
		$('body').attr('style','');
		$(".lobby").removeClass("inHidden");
		$(".messageBox #container").removeClass("inHidden");
		$(".lobby").removeClass(openDirection);
		$(".messageBox #container").removeClass(openDirection);
		$(".openBackground").fadeOut(250);
		$(".menu").fadeIn(250);
	}
}

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

function crc32(str) {
    var crcTable = window.crcTable || (window.crcTable = makeCRCTable());
    var crc = 0 ^ (-1);

    for (var i = 0; i < str.length; i++ ) {
        crc = (crc >>> 8) ^ crcTable[(crc ^ str.charCodeAt(i)) & 0xFF];
    }

    return (crc ^ (-1)) >>> 0;
};

$(function(){
	setInterval(()=>{
		if($('#sender').val().length == 0)
			$(".textPlaceholder").show();
		else
			$(".textPlaceholder").hide();
	},10);
	
	$('#sendMessage').on('click',function(){
		if(wss.readyState == 1 && $('#sender').val().replace(/\n|\r/g,"").length > 0){
			$(this).blur();
			wss.send(JSON.stringify({
				type: 'message',
				location: locate,
				message: $('#sender').val()
			}));
			$('#sender').val('');
			$('#sender').focus();
			onKeyEnter($('#sender'));
		}
	});
	$('#sender').on('keydown',function(e){
		if(e.keyCode == 13 && wss.readyState == 1 && $(this).val().replace(/\n|\r/g,"").length > 0){
			if(!e.shiftKey && !mobileAndTabletCheck()){
				if($(this).val().startsWith("/msg ")){
					var msgSplit = $(this).val().split(" ");
					var targetSession = (msgSplit.splice(0,2))[1];
					var message = msgSplit.join(" ");
					
					if(!clientList[targetSession]){
						snkms.error("該使用者工作階段不存在");
						$(this).val('');
						e.preventDefault();
						return;
					}
					else{
						if(message.trim().length == 0){
							snkms.error("請輸入訊息內容");
							e.preventDefault();
							return;
						}
						
						wss.send(JSON.stringify({
							type: 'privateMessage',
							session: targetSession,
							message: message,
							location: locate
						}));
						
						onMessage("privateMessageSource",targetSession,clientList[targetSession].address,clientList[targetSession].username,clientList[targetSession].id,message,new Date().getTime());
					}
				}
				else{
					wss.send(JSON.stringify({
						type: 'message',
						location: locate,
						message: $(this).val()
					}));
				}
				$(this).val('');
			}
		}
		
		if(e.keyCode == 13 && !e.shiftKey && !mobileAndTabletCheck())
			e.preventDefault();

		onKeyEnter($(this));
	});
	
	$('#sender').on('click',function(e){
		if(mobileAndTabletCheck()){
			$(this).parent().addClass("maximum");
			$("#add").addClass("right");
			$("#add img").attr("src","https://chat.snkms.com/images/arrow_right.png");
			$("#upload").hide();
			e.stopPropagation();
		}
	});
	
	$('#sender').on('paste',function(e){
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
			uploadImage([blob]);
		  };
		  reader.readAsDataURL(blob);
		}
	});
	
	$('#fileUpload').on('change',function(){
		uploadPrepare(this.files,false);
	});
	
    $("body").on("touchstart", function(e) {
　　　　 //e.preventDefault();
    　　startX = e.originalEvent.changedTouches[0].pageX,
    　　startY = e.originalEvent.changedTouches[0].pageY;
		X = startX;
		Y = startY;
		startTime = new Date().getTime();
    });
    $("body").on("touchend", function(e) {
　　　　 //e.preventDefault();
		let endTime = new Date().getTime();
		if (X > 25 && $(".rightSide").attr("data-open") && Math.abs(Y) < 30 && endTime - startTime < 150){
			toggleSidebar($(".rightSide"), false, "right");
		}
		if (X < -25 && $(".wrapper_settings").attr("data-open") && Math.abs(Y) < 30 && endTime - startTime < 150){
			toggleSidebar($(".wrapper_settings"), false, "left");
			$("#userName").blur();
			savingSettings();
		}
    });
	
    $(".lobby").on("touchend", function(e) {
　　　　 //e.preventDefault();
		if($(".messageBox").hasClass("unhidden")) return;

    　　let endX = e.originalEvent.changedTouches[0].pageX;
    　　let endY = e.originalEvent.changedTouches[0].pageY;
		let endTime = new Date().getTime();
		X = endX - startX;
		Y = endY - startY;
		
		if (X < -25 && Math.abs(Y) < 30 && endTime - startTime < 150){
			toggleSidebar($(".rightSide"), true, "right");
		}
		if (X > 25 && Math.abs(Y) < 30 && endTime - startTime < 150){
			toggleSidebar($(".wrapper_settings"), true, "left");
		}
		
		moveEndX = 0;
		moveEndY = 0;
		X = 0;
		Y = 0;
		e.stopPropagation();
    });
    $("body").on("touchmove", function(e) {
		moveEndX = e.originalEvent.changedTouches[0].pageX;
		moveEndY = e.originalEvent.changedTouches[0].pageY;
		X = moveEndX - startX;
		Y = moveEndY - startY;
		
		if (X > 45 && $(".rightSide").attr("data-open") && Math.abs(Y) < 30){
			toggleSidebar($(".rightSide"), false, "right");
		}
		if (X < -45 && $(".wrapper_settings").attr("data-open") && Math.abs(Y) < 30){
			toggleSidebar($(".wrapper_settings"), false, "left");
			$("#userName").blur();
			savingSettings();
		}
    });
	
    $(".lobby").on("touchmove", function(e) {
		if($(".messageBox").hasClass("unhidden")) return;
		
		moveEndX = e.originalEvent.changedTouches[0].pageX;
		moveEndY = e.originalEvent.changedTouches[0].pageY;
		X = moveEndX - startX;
		Y = moveEndY - startY;

		if (X < -45 && Math.abs(Y) < 30){
			toggleSidebar($(".rightSide"), true, "right");
		}
		if (X > 45 && Math.abs(Y) < 30){
			toggleSidebar($(".wrapper_settings"), true, "left");
		}
		
		//$("#sender").val(X);
		e.stopPropagation();
    });
	
    $("#search").on("keyup", function() {
		var id = $(this).val();
		$(".emoji-window .eBody div").each(function(){
			if($(this).attr("data-id").indexOf(id) == -1){
				$(this).hide();
			}
			else{
				$(this).show();
			}
		});
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
		//snkms.confirm("要建立私聊嗎？<br/>建立私聊後可以分享連結以向您的朋友一同進行隱密又安全的聊天！",function(){
		let elements = "";
		for(let c in clientList){
			if(c == sessionSelf) continue;
			
			elements += `<div><label class="container"><input name="inviteList" type="checkbox" value="${c}"><span class="checkmark"></span>${clientList[c].username}#${crc32(clientList[c].address)} (${clientList[c].id})</label></div>`;
			//elements += `<div><label><input name="inviteList" type="checkbox" value="${c}" />${clientList[c].username}#${crc32(clientList[c].address)} (${clientList[c].id})</label></div>`;
		}
		
		if(elements.length > 0)
			elements = `要建立私聊嗎？您可以選擇要邀請的工作階段到新建立的私聊。<hr/>${elements}`;
		else
			elements = "要建立私聊嗎？<br/>建立私聊後可以分享連結以向您的朋友一同進行隱密又安全的聊天！";
		
		snkms.confirm(elements,function(){
			$('input[name="inviteList"]:checked').each(function(){
				inviteList.push($(this).val());
			});
			
			wss.send(JSON.stringify({
				type: "create",
				session: sessionSelf
			}));
		});
	});
	
	$("#privateChatJoin").on("click",function(e){
		snkms.prompt("加入私聊","請輸入私聊ID或網址","https://chat.snkms.com/private/########",function(e,value){
			if(value.match(/^(https?:\/\/chat\.snkms\.com\/private)/ig) || value.match(/^([0-9A-Za-z\-]{8})$/g)){
				wss.send(JSON.stringify({
					type: 'login',
					username: userName,
					location: value.replace("https://chat.snkms.com/private/","")
				}));
			}
			else{
				snkms.error("格式錯誤，無法加入私聊");
			}
		});
	});
	
	$("#publicChat").on("click",function(e){
		if(locate == "public") 
			snkms.error("您已經在大廳了");
		else{
			wss.send(JSON.stringify({
				type: 'login',
				username: userName,
				location: "public"
			}));
		}
	});
	
	
	$(".userList").on("click",'.userWrapper #session',function(e){
		var targetSession = $(this).attr('data-id');
		privateChat(targetSession);
	});
	
	$(".lobby > .chat").on("click",'div > author',function(e){
		var targetSession = $(this).attr('data-id');
		privateChat(targetSession);
	});

	$("#moveUp").on("click",function(e){
		$(".lobby").animate ({scrollTop: 0}, 250);
	});
	
	$("#moveDown").on("click",function(e){
		$(".lobby").animate ({scrollTop: $(".lobby > .chat").height()}, 250);
	});
	
	$("body").on("click",function(){
		$(".emoji-window").hide();
		$(".additional").hide();
		$("#upload").show();
		$(".textArea").removeClass("maximum");
		$("#add").removeClass("right");
		$("#add img").attr("src","https://chat.snkms.com/images/add.png");
		$(".messageBox").removeClass("unhidden");
	});
	
	$(".emoji-window").on("click",function(e){
		e.stopPropagation();
	});
	
	$("#eClose").on("click",function(e){
		$(".emoji-window").hide();
		$(".messageBox").removeClass("unhidden");
		e.stopPropagation();
	});
	$("#emojis").on("click",function(e){
		$(".emoji-window").toggle();
		$(".additional").hide();
		
		if(mobileAndTabletCheck()){
			$(".emoji-window #search").attr("placeholder","尋找表情符號！");
			$(".emoji-window #search").attr("readonly",true);
			
			if($(".textArea").hasClass("maximum"))
				$("#sender").focus();
			
			if($(".emoji-window").css('display') == "block"){
				$(".messageBox").addClass("unhidden");
			}
			else{
				$(".messageBox").removeClass("unhidden");
			}
		}
		else{
			$(".emoji-window #search").focus();
		}
		
		e.stopPropagation();
	});
	
	$(".emoji-window .eBody").on("click","div[data-id]",function(e){
		var cursorPos = $('#sender').prop('selectionStart');
		var v = $('#sender').val();
		var textBefore = v.substring(0,  cursorPos);
		var textAfter  = v.substring(cursorPos, v.length);
		var beforeSpace = "";
		var afterSpace = "";
		
		if(textBefore.length > 0 && v.substr(cursorPos-1,1) != " ")
			beforeSpace = " ";
		if(textAfter.length > 0 && v.substr(cursorPos,1) != " ")
			afterSpace = " ";
		
		let insertLength = cursorPos + beforeSpace.length + $(this).attr("data-id").length + afterSpace.length + 2;
		$('#sender').val(`${textBefore}${beforeSpace}:${$(this).attr("data-id")}:${afterSpace}${textAfter}`);
		
		if(!mobileAndTabletCheck() || $("#add").hasClass("right")) $('#sender').focus();
		$('#sender')[0].setSelectionRange(insertLength, insertLength);
		
		if(!e.shiftKey){
			$(".emoji-window").hide();
			$(".messageBox").removeClass("unhidden");
		}
		
		if(v.length == 0){
			var e = $.Event( "keydown", { keyCode: 13 } );
			$('#sender').trigger(e);
		}
	});
	
	$(".emoji-window .eHeader").on("click","#search",function(e){
		if(mobileAndTabletCheck()){
			var p = prompt("輸入要搜尋的表情符號...");
			var e = $.Event("keyup");
			$("#search").val(p);
			$("#search").trigger(e);
			
			if($(".textArea").hasClass("maximum"))
				$("#sender").focus();
		}
	});
	
	$(".channelName").on("click",function(){
		var tempInput = document.createElement('input'),
			text = window.location.href;

		document.body.appendChild(tempInput);
		tempInput.value = text;
		tempInput.select();
		document.execCommand('copy');
		document.body.removeChild(tempInput);
		
		snkms.success("已將房間位置複製到剪貼簿");
	});
	
	$(".emoji-window .eBody").on("mouseover","div[data-id]",function(e){
		var id = $(this).attr("data-id");
		$("#search").attr("placeholder",`:${id}:`);
	});
	
	$(".emoji-window .eBody").on("mouseout","div[data-id]",function(e){
		$("#search").attr("placeholder","");
	});
	
	
	$(".room").on("contextmenu",".msgWrapper img.emojis",function(e){
		return false;
	});
	$(".messageBox").on("contextmenu","img",function(e){
		return false;
	});
	
	setup();
	
	$('#userName').val(localStorage.getItem('username'));
	
	let originalHeight = $(window).height();
	
	$(window).resize(function(){
		setTimeout(()=>{
			if(mobileAndTabletCheck() && originalHeight < $(window).height()) 
				$('.room').css('height',$(window).height() - $('.messageBox').height() - 20);
			
			originalHeight = $(window).height();
			
			if(mobileAndTabletCheck() && window.innerWidth > 480)
				$(".wrapper_settings").hide();
			if(mobileAndTabletCheck() && window.innerWidth <= 480)
				$(".wrapper_settings").removeAttr('style');
		},75);
	});
	
	$(window).on('popstate',function(e){
		location.replace(location.href);
	});
	
	$(window).load(function(){
		onScroll(true);
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
	
	if(!mobileAndTabletCheck() || window.innerWidth > 480){
		$('.wrapper_settings').fadeIn(10, function() {
			$('.wrapper_settings').hide();
		});
	}
});

function privateChat(targetSession, message){
	if(!clientList[targetSession]){
		snkms.error("該使用者工作階段已不在此聊天室");
		return;
	}
	
	if(targetSession == sessionSelf){
		snkms.error("不要對自己說悄悄話");
		return;
	}
	
	if(message){
		wss.send(JSON.stringify({
			type: 'privateMessage',
			session: targetSession,
			message: message,
			location: locate
		}));
		onMessage("privateMessageSource",targetSession,clientList[targetSession].address,clientList[targetSession].username,clientList[targetSession].id,message,new Date().getTime());
	}
	else{
		if($("#sender").val().length > 0 || mobileAndTabletCheck()){
			snkms.prompt("傳送悄悄話",`傳送悄悄話給 ${clientList[targetSession].username}#${crc32(clientList[targetSession].address)} (${clientList[targetSession].id})`,targetSession,function(e,value){
				wss.send(JSON.stringify({
					type: 'privateMessage',
					session: targetSession,
					message: value,
					location: locate
				}));
				onMessage("privateMessageSource",targetSession,clientList[targetSession].address,clientList[targetSession].username,clientList[targetSession].id,value,new Date().getTime());
			});
		}
		else{
			$("#sender").val(`/msg ${targetSession} `);
			$("#sender").focus();
		}
	}
}

function compressImagePromise(file,flag){
	return new Promise((resolve, reject)=>{
		if(file.type.startsWith("image/")){
			if(file.size > 6291456 || flag){
				console.log("[CompressionHandlerPromise]",file.name,"Starting reader...");
				 var reader = new FileReader();
				 reader.onload = function(event){
					let imageURL = event.target.result;
					let newImg = new Image();
					newImg.onload = function(){
						console.log("[CompressionHandlerPromise]",file.name,"Starting compressing...","Quality:",0.75);
						let cvs = document.createElement('canvas');
						let ctx = cvs.getContext('2d');
						cvs.width = newImg.naturalWidth;
						cvs.height = newImg.naturalHeight;
						ctx.drawImage(newImg,0,0,newImg.naturalWidth,newImg.naturalHeight,0,0,cvs.width,cvs.height);

						cvs.toBlob(function(blob){
							console.log("[CompressionHandlerPromise]",file.name,"Compressed.");
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
				console.log("[CompressionHandlerPromise]",file.name,"has less than 6MB, skipping...");
				resolve(file);
			}
		}
		else{
			console.log("[CompressionHandlerPromise]",file.name,"is not a image.");
			resolve(file);
		}
	});
}

async function compressImage(files){
	$("#progress").css('background','red');
	$("#circle").addClass('red');
	$("#circle").show();
	
	snkms.success("正在執行本機壓縮處理程序...");
	
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
		console.log("[CompressionHandler]",newFiles.length,"file(s) too large, now restarting to force compression...");
		snkms.error("壓縮後的大小總和過大，正在重新執行...");
		let newFilesInFor = new Array();
		
		for(let file of newFiles){
			newFilesInFor.push(await compressImagePromise(file,true));
		}
		
		uploadPrepare(newFilesInFor, true);
	}
	else{
		console.log("[CompressionHandler]",newFiles.length,"file(s) preparing to upload.");
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
		if(flag)
			snkms.error("上傳的檔案總和不得超過8MB");
		else
			compressImage(files);
	}
	else if(files.length > 10){
		snkms.error("單次上傳數量不得超過10個檔案");
	}
	else{
		if(!cancel && totalSize > 0 && files.length > 0)
			uploadImage(files);
		else
			$("#fileToUpload").val('');
	}
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

function uploadImage(files){
	var fd = new FormData();
	for(let file of files){
		fd.append('fileToUpload[]',file);
	}
	fd.append('submit',true);
		
	 $.ajax({
		 url: 'https://cdn.eoe.asia/upload.php',
		 cache: false,
		  processData: false,
		  contentType: false,
		  type:'POST',
		 data: fd,
		 error: function(xhr) {
		   console.log(xhr.responseText);
		   snkms.error("上傳失敗");
		   $('#fileUpload').val('');
		},
		xhr: function(){
			myXhr = $.ajaxSettings.xhr();
			if(myXhr.upload){
			  myXhr.upload.addEventListener('progress',function(e) {
				if (e.lengthComputable) {
				  var percent = Math.floor(e.loaded/e.total*10000)/100;
				
				  if(percent <= 100) {
					$('#progress').css('width', percent+"%");
					$("#circle").show();
				  }
				  if(percent >= 100) {
					snkms.success("正在處理...");
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
				snkms.success("上傳成功");
				let message = new Array();
				for(let o in response){
					message.push(response[o].url);
				}
				
				wss.send(JSON.stringify({
					type: 'message',
					location: locate,
					message: message.join(' ')
				}));
			}
			else{
				snkms.error("發生不明錯誤");
				console.log(response);
			}
		 }
	});
}

function onKeyEnter(ele){
	setTimeout(()=>{
		var text = $(ele).val();
		var eachLine = text.split('\n').length-1;
		var cHeight = eachLine*21;
					
		if(cHeight+40 < 150){
			$(ele).css('height',cHeight+40);
			$('.messageBox').css('height',cHeight+60);
			$('.messageBox .dynamic').css('bottom',cHeight+55);
			$(ele).removeClass('scroll');
		}
		else{
			$(ele).addClass('scroll');
			if($(ele).prop('scrollHeight') - $(ele).scrollTop() < 160) $(ele).scrollTop($(ele).prop('scrollHeight'));
		}
					
		if(mobileAndTabletCheck())
			$('.room').css('height',$(window).height() - $('.messageBox').height() - 20);
		else
			$('.room').css('height',`calc(100vh - ${$('.messageBox').height()+20}px)`);
		
		$('.lobby > .menu').css('bottom',`${$('.messageBox').height()+30}px`);
		
		onScroll(false);
	},5);
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
		wss.send(JSON.stringify({
			type: "refresh",
			location: locate,
			username: userName,
			session: sessionSelf
		}));
	}

	localStorage.setItem('username', $('#userName').val());
}

function ImageLoaded(img){
	onScroll(scrollBottom);
}

function openSettings() {
	if(mobileAndTabletCheck() && window.innerWidth <= 480){
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
					height: (mobileAndTabletCheck())?"75vh":"100vh"
				}, 100, function() {// Animation complete.
				});
			});
		});
	}
}

function ContentFormatter(text){
  text = ParseBBCode(text);
  text = urlify(escapeHtml(text));
  text = parseInvite(text);
  
  return emojify(text);
}

function ParseBBCode(text){
  var emojiRegex = /:([0-9A-Za-z_]+):/ig;
  var urlRegex = /(https?:\/\/[^\s]+)/g;
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
}

function emojify(text){
  var emojiRegex = /\[emoji-(large|small)\]([0-9A-Za-z_]+)\[\/emoji\]/ig;
  return text.replace(emojiRegex, function(match, p1, p2, offset, string) {
	  let pixel = (window.devicePixelRatio == 1) ? 24 : (devicePixelRatio == 2) ? 48 : 64;
	  if(p1 == "large"){//style="--emoji-url: url(${emojis[e]}?size=32);"
		pixel = (window.devicePixelRatio == 1) ? 48 : (devicePixelRatio == 2) ? 96 : 128;
	  }
	  
	  return `<div title=":${p2}:" data-id="${p2}" class="emojis ${p1}"><span style="--emoji-url: url(${emojis[p2]}?size=${pixel});"></span></div>`;
  });
}

function parseInvite(text){
	var inviteRegex = /\[invite\]([0-9a-zA-Z-]+)\[\/invite\]/g;
	return text.replace(inviteRegex, function(matched, matchSub, offset, groups) {
		let notice = (locate == matchSub) ? "已加入" : "加入";
		return '<a class="inviteLink" target="_self" href="https://chat.snkms.com/private/' + matchSub + '">邀請您加入 #私聊 ' + matchSub + '<span>' + notice + '</span></a>';
	});
}

function urlify(text) {
  var urlRegex = /\[url\](https?:\/\/[^\s]+)\[\/url\]/g;
  return text.replace(urlRegex, function(matched, matchSub, offset, groups) {
	if(checkURL(matchSub)){
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
				console.error(error);
				clearInterval(wait);
			}
		},30);
		
		return '<div><a target="_blank" href="' + matchSub + '"><img onload="onScroll(false);" loading="lazy" data-id="' + nowID + '" src="' + matchSub + '" /></a></div>';
	}
	else if(matchSub.startsWith(`https://${location.hostname}/private/`)){
		return '[invite]' + matchSub.match(/([0-9a-zA-Z]+)$/ig).join() + '[/invite]';
	}
	else{
		let windowAction = (matchSub.match(/^(https?:\/\/chat\.snkms\.com)/ig))?"_self":"_blank";
		return '<a target="' + windowAction + '" href="' + matchSub + '">' + matchSub + '</a>';
	}
  })
}

function checkURL(url) {
    return(url.match(/\.(jpeg|jpg|gif|png|webp)(\?.*?)?$/i) != null);
}

function setup(){
	if(!localStorage.getItem('username')){
		snkms.prompt('設定', '該如何稱呼你？','',
					function(evt, value) {
						userName = value;
						localStorage.setItem('username', value);
						$('#userName').val(value);
						connect();
						$('.userlist > div').show();
					},function(){
						connect();
						$('.userlist > div').show();
					});
	}
	else{
		userName = localStorage.getItem('username');
		connect();
		$('.userlist > div').show();
	}
	
	if(mobileAndTabletCheck()){
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
		$(".emoji-window .eBody").append(`<div title=":${e}:" data-id="${e}"><span style="--emoji-url: url(${emojis[e]}?size=${devicePixel});"></span></div>`);
	}
}
function escapeHtml(unsafe){
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

// end of immediately function
})(jQuery);
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
window.mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};
