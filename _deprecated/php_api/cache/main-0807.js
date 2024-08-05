var wss,
	localStorage = window.localStorage,
	clientList = {},
	userName = "Unknown",
	locate = "public",
	sessionSelf,
	scrollBottom = false,
	emojis = {"redking":"https://cdn.discordapp.com/emojis/251340909084540934.png","MRE":"https://cdn.discordapp.com/emojis/251341492071694337.png","golden_ore":"https://cdn.discordapp.com/emojis/455270463497830401.png","muffin":"https://cdn.discordapp.com/emojis/455270463560744960.png","DontWatchMe":"https://cdn.discordapp.com/emojis/455274803952353280.png","patrick":"https://cdn.discordapp.com/emojis/469058432050266112.png","thonking":"https://cdn.discordapp.com/emojis/470945606550945792.png","thwnking":"https://cdn.discordapp.com/emojis/471644273024958474.png","pikachu":"https://cdn.discordapp.com/emojis/478127654466486272.png","oops":"https://cdn.discordapp.com/emojis/481743058187059200.png","thanking":"https://cdn.discordapp.com/emojis/491233774030553101.png","thrnking":"https://cdn.discordapp.com/emojis/491597765034639360.png","shutup":"https://cdn.discordapp.com/emojis/495223807276089366.png","mrmapleleaf":"https://cdn.discordapp.com/emojis/497036256241516546.png","nightdragon":"https://cdn.discordapp.com/emojis/499943021085982720.png","hello":"https://cdn.discordapp.com/emojis/502834420990869514.png","crazy_behappy":"https://cdn.discordapp.com/emojis/503438538071867413.png","impatient":"https://cdn.discordapp.com/emojis/503914151601635339.png","thynking":"https://cdn.discordapp.com/emojis/513676865488158720.png","fishing":"https://cdn.discordapp.com/emojis/513677363066961930.png","crying":"https://cdn.discordapp.com/emojis/513679274255843348.png","thonpichuking":"https://cdn.discordapp.com/emojis/519489787556659220.png","golden_poro":"https://cdn.discordapp.com/emojis/531142902580248579.png","polo":"https://cdn.discordapp.com/emojis/537327815419232257.png","thinpoloking":"https://cdn.discordapp.com/emojis/538366760265711632.png","pakiritrick":"https://cdn.discordapp.com/emojis/540866326147760140.png","explosion":"https://cdn.discordapp.com/emojis/566516907570626560.png","capo":"https://cdn.discordapp.com/emojis/573828642963193887.png","tenshiangry":"https://cdn.discordapp.com/emojis/576337703029964810.png","patrick_ore":"https://cdn.discordapp.com/emojis/581102275913842694.png","purple":"https://cdn.discordapp.com/emojis/585112333676969984.png","AK12":"https://cdn.discordapp.com/emojis/586168179814957076.png","shock":"https://cdn.discordapp.com/emojis/586810669618167809.png","__":"https://cdn.discordapp.com/emojis/593437875064799290.png","squidward":"https://cdn.discordapp.com/emojis/597145376926990336.png","nopadoru":"https://cdn.discordapp.com/emojis/602363957092548619.png","thonkingfbi":"https://cdn.discordapp.com/emojis/608660688428335104.png","thonkingfbiplus":"https://cdn.discordapp.com/emojis/615515070616829953.png","sad":"https://cdn.discordapp.com/emojis/620267149239255056.png","smile":"https://cdn.discordapp.com/emojis/622368034681651200.png","spoo":"https://cdn.discordapp.com/emojis/640904738673524749.png","nooops":"https://cdn.discordapp.com/emojis/647712760968249346.png","blackman":"https://cdn.discordapp.com/emojis/673573582252670983.png","drakeNo":"https://cdn.discordapp.com/emojis/673869983578849282.png","IamBAD":"https://cdn.discordapp.com/emojis/676479729561239552.png","spoon":"https://cdn.discordapp.com/emojis/676788632673189927.png","Yandere":"https://cdn.discordapp.com/emojis/681813858222080016.png","IamReady":"https://cdn.discordapp.com/emojis/681815965280763930.png","patrick_ingot":"https://cdn.discordapp.com/emojis/683022640918823021.png","ah":"https://cdn.discordapp.com/emojis/698148722286264380.png","whoosh":"https://cdn.discordapp.com/emojis/704287880289321010.png","flyer":"https://cdn.discordapp.com/emojis/704316114699681822.png","idea":"https://cdn.discordapp.com/emojis/704316855539466240.png","help":"https://cdn.discordapp.com/emojis/704318008109301811.png","DONTunderstand":"https://cdn.discordapp.com/emojis/708632993278853130.png","holdup":"https://cdn.discordapp.com/emojis/709036653641203793.png","kuku":"https://cdn.discordapp.com/emojis/709408053237121096.png","terrifying":"https://cdn.discordapp.com/emojis/709408519866155140.png","ahkong":"https://cdn.discordapp.com/emojis/709418837505998859.png","RRRRRR":"https://cdn.discordapp.com/emojis/710426370596929576.png","free":"https://cdn.discordapp.com/emojis/710826024916615248.png","slime":"https://cdn.discordapp.com/emojis/711512619265294366.png","LH_rustled":"https://cdn.discordapp.com/emojis/714795364280041503.png","cer_bad":"https://cdn.discordapp.com/emojis/714796086497247253.png","robot":"https://cdn.discordapp.com/emojis/714797685416132629.gif","huh":"https://cdn.discordapp.com/emojis/716309277924524082.png","starburst":"https://cdn.discordapp.com/emojis/717714007527522355.gif","dino":"https://cdn.discordapp.com/emojis/717978951611580446.png","SnowBall":"https://cdn.discordapp.com/emojis/720521492126892123.png","seal":"https://cdn.discordapp.com/emojis/720650380316246073.png","touchingMe":"https://cdn.discordapp.com/emojis/721644185395920916.png","pongPans":"https://cdn.discordapp.com/emojis/723566685558407218.png","heeey":"https://cdn.discordapp.com/emojis/735386084300554252.png","ohGod":"https://cdn.discordapp.com/emojis/735386105691635802.png","mad":"https://cdn.discordapp.com/emojis/735386444952109076.png","notInterest":"https://cdn.discordapp.com/emojis/735386761449963540.png","kuR":"https://cdn.discordapp.com/emojis/735387129219383318.png","ahahYeah":"https://cdn.discordapp.com/emojis/735387391606390814.png","chuchu":"https://cdn.discordapp.com/emojis/747035651597271080.png","snows":"https://cdn.discordapp.com/emojis/747495887240036533.png","snowwar":"https://cdn.discordapp.com/emojis/747496179230703739.gif","Wooorrrr":"https://cdn.discordapp.com/emojis/748239212641386658.png","pscared":"https://cdn.discordapp.com/emojis/750309067339333652.png","DirtyDan":"https://cdn.discordapp.com/emojis/753296302426685510.png","wood":"https://cdn.discordapp.com/emojis/765442652337733642.png","thonbikings":"https://cdn.discordapp.com/emojis/771309161472065546.png","sub_reborn":"https://cdn.discordapp.com/emojis/839759709538877440.png","miner":"https://cdn.discordapp.com/emojis/843797472861093918.png","furk":"https://cdn.discordapp.com/emojis/844725748149518347.gif","toodanger":"https://cdn.discordapp.com/emojis/844725922153758722.gif","waiiiit":"https://cdn.discordapp.com/emojis/844740722782765097.gif","great":"https://cdn.discordapp.com/emojis/844740982536405022.gif","riiice":"https://cdn.discordapp.com/emojis/844741475627565056.gif","ummm":"https://cdn.discordapp.com/emojis/848731496600436737.gif","polan":"https://cdn.discordapp.com/emojis/849256402094260225.png","lover":"https://cdn.discordapp.com/emojis/849257071206465577.gif","danger":"https://cdn.discordapp.com/emojis/849257079314186240.png","dude":"https://cdn.discordapp.com/emojis/849257410443083786.png","rainbowca":"https://cdn.discordapp.com/emojis/849694487420076033.gif","suriv":"https://cdn.discordapp.com/emojis/849886044764504064.png","carrot":"https://cdn.discordapp.com/emojis/850242492733325362.gif","bee":"https://cdn.discordapp.com/emojis/851878552398987304.png","RRRRRRRRRPG":"https://cdn.discordapp.com/emojis/856593679900213258.gif","dust":"https://cdn.discordapp.com/emojis/876514069287432232.png","okla":"https://cdn.discordapp.com/emojis/895198279455875122.png","love":"https://cdn.discordapp.com/emojis/895199988647342110.png","furious":"https://cdn.discordapp.com/emojis/899287403498467420.png","jjjjjjjuuuumppp":"https://cdn.discordapp.com/emojis/899597038130434048.gif","yeeeeaaaarrrr":"https://cdn.discordapp.com/emojis/899597062897815573.gif","wooola":"https://cdn.discordapp.com/emojis/900200869088346133.gif","thonopposite":"https://cdn.discordapp.com/emojis/900236597524566026.png","waaa":"https://cdn.discordapp.com/emojis/904309074475221032.gif","noway":"https://cdn.discordapp.com/emojis/904315703836962826.gif","firehole":"https://cdn.discordapp.com/emojis/909321291323023390.gif","kukusad":"https://cdn.discordapp.com/emojis/909321299233501255.gif","marineCorps":"https://cdn.discordapp.com/emojis/915899299332775948.png","padoruuu":"https://cdn.discordapp.com/emojis/916725341538615336.png","toasterbf":"https://cdn.discordapp.com/emojis/923159110160121857.gif","toastergf":"https://cdn.discordapp.com/emojis/923159122130636830.gif","thonsamking":"https://cdn.discordapp.com/emojis/923175499843403826.png","thoncuting":"https://cdn.discordapp.com/emojis/929027817562341437.png","thondistoring":"https://cdn.discordapp.com/emojis/929027859438243890.png","thontocuting":"https://cdn.discordapp.com/emojis/929102397500964996.gif","thondistoringa":"https://cdn.discordapp.com/emojis/929102795959844895.gif","thonwaa":"https://cdn.discordapp.com/emojis/929105393190322237.gif","coldog":"https://cdn.discordapp.com/emojis/929572672650743908.png","tooSmall":"https://cdn.discordapp.com/emojis/938749743767633941.gif","pongpong":"https://cdn.discordapp.com/emojis/939207409103167489.gif","kukuCat":"https://cdn.discordapp.com/emojis/949637238923354152.png","pudding":"https://cdn.discordapp.com/emojis/950228202339573800.png","predators":"https://cdn.discordapp.com/emojis/951039586891616276.png","Kyorochan":"https://cdn.discordapp.com/emojis/961208466955960361.png","wooooood":"https://cdn.discordapp.com/emojis/974609489657491496.gif","ssssslimmm":"https://cdn.discordapp.com/emojis/974609514093482004.gif","moooomoo":"https://cdn.discordapp.com/emojis/974609529457246238.gif"};
function connect(){
	wss = new WebSocket('wss://api.snkms.com:443/ws');
	
	wss.onopen = () => {
		console.log('[WebSocketHandler]','Open connection.');
		//$('.lobby').append('<div id="system">與伺服器連線成功</div>');
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
		//$('.lobby').append('<div id="system">與伺服器連線失敗</div>');
	}
	
	wss.onmessage = (e) => {
		let data = JSON.parse(e.data);
		console.log("[WebSocketHandler]",data);

		if(data.type == 'profile'){
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
						$('.userWrapper').append(`<div title="位置：${u}" id="${u}">`);
					
					if($('.userWrapper').find(`#${u} #username`).length == 0)
						$('.userWrapper').find(`#${u}`).append(`<div id="username"><author></author><pid></pid></div>`);
					
					$('.userWrapper').find(`#${u} #username author`).text(`${e.username}`);
					$('.userWrapper').find(`#${u} #username pid`).text(`#${crc32(u)}`);
					$('.userWrapper').find(`#${u}`).append(`<span id="${e.session}">${e.id}</span>`);
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
			
			$('.lobby').find(`author[data-self-id="${crc32(userName+clientList[sessionSelf].address)}"]`).addClass('sameWorker');
			$('.userWrapper').find(`#${sessionSelf}`).addClass('me');
		}
		else if(data.type == 'verified'){
			let tempLocate = locate;
			locate = data.location;
			sessionSelf = data.session;
			$('.settings_footer').text(sessionSelf);
			
			if(!data.status){
				let channelName = (locate == "public")?"#大廳":"#私聊 "+locate;
				
				$('.lobby').empty();
				$('.lobby').append(`<div id="system">目前房間為 ${channelName}</div>`);
				$('.channelName').text(channelName);
				document.title = channelName + " @ 線上即時聊天室 - 天夜之心";
				
				if(locate == "public"){
					window.history.pushState(null, document.title, "/");
				}
				else{
					window.history.pushState(null, document.title, '/private/'+locate);
					snkms.success("私聊加入成功");
					$('.lobby').append(`<div id="system">私聊房間位置及其所有訊息會在所有使用者離開後60秒自動銷毀</div>`);
				}
			}
			else{
				if(data.status == "private_failed"){
					locate = "public";
					snkms.error(data.message);
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
				onMessage(e.session,e.address,e.username,e.id,e.message,e.time);
				onScroll(true);
			});
		}
		else if(data.type == 'message'){
			onMessage(data.session,clientList[data.session].address,clientList[data.session].username,clientList[data.session].id,data.message,new Date().getTime());
		}
		else if(data.type == 'forbidden'){
			$('.lobby').append(`<div id="system">伺服器拒絕您的連線: ${data.message}</div>`);
		}
		else{
			console.warn('Unknown type',data.type);
		}
	}
}

function onMessage(session,address,username,id,message,timestamp){
	let date = new Date(timestamp);
	let year = date.getFullYear();
	let month = (date.getMonth()+1 < 10)?'0'+(date.getMonth()+1):date.getMonth()+1;
	let day = (date.getDate() < 10)?'0'+date.getDate():date.getDate();
	let hour = (date.getHours() < 10)?'0'+date.getHours():date.getHours();
	let minute = (date.getMinutes() < 10)?'0'+date.getMinutes():date.getMinutes();

	var ele = $('.lobby').append(`<div id="${date.getTime()}"><author data-self-id="${crc32(username+address)}" class="${session}" title="Session: ${session} / ID: ${id}">${username}#${crc32(address)}</author> <span title="${year}/${month}/${day} ${hour}:${minute}">${DateFormatter(timestamp)}</span><div data-convert="true" class="msgWrapper"></div></div>`);
	$('.lobby div[id="'+date.getTime()+'"]').find('div.msgWrapper').text(message);
	
	$('.lobby div.msgWrapper[data-convert="true"]').each(function(){
		let content = $(this).text();
		$(this).html(ContentFormatter(content));
		$(this).removeAttr('data-convert');
	});
	
	$('.lobby').find(`.${sessionSelf}`).addClass('me');
	
	if(clientList[sessionSelf] && !$('.lobby').find(`author[data-self-id="${crc32(userName+clientList[sessionSelf].address)}"]`).hasClass('me'))
		$('.lobby').find(`author[data-self-id="${crc32(userName+clientList[sessionSelf].address)}"]`).addClass('sameWorker');
	
	onScroll(false);
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

function onScroll(force){
	let containerHeight = $('.lobby').height();
	let scrollHeight = $('.lobby').prop("scrollHeight");
	let scrollTop = $('.lobby').scrollTop();
	
	let nowPost = scrollHeight - scrollTop;
	
	if(nowPost < 700 || force || scrollBottom){
		$('.lobby').scrollTop(scrollHeight);
	}
}

function toggleSidebar(flag){
	if(flag){
		$(".rightSide").css('right',"0px");
		$(".touchArea").hide();
		$(".openBackground").fadeIn(250);
		$('body').attr('style','overflow:hidden;');
	}
	else{
		$(".rightSide").css('right',"-250px");
		$(".touchArea").show();
		$(".openBackground").fadeOut(250);
		$('body').attr('style','');
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
				wss.send(JSON.stringify({
					type: 'message',
					location: locate,
					message: $(this).val()
				}));
				$(this).val('');
			}
		}
		
		if(e.keyCode == 13 && !e.shiftKey && !mobileAndTabletCheck())
			e.preventDefault();

		onKeyEnter($(this));
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
	
    $(".touchArea").on("touchstart", function(e) {
　　　　  //e.preventDefault();
    　　　startX = e.originalEvent.changedTouches[0].pageX,
    　　　startY = e.originalEvent.changedTouches[0].pageY;
    });
    $("body").on("touchstart", function(e) {
　　　　  //e.preventDefault();
    　　　startX = e.originalEvent.changedTouches[0].pageX,
    　　　startY = e.originalEvent.changedTouches[0].pageY;
    });
    $("body").on("touchmove", function(e) {
		　moveEndX = e.originalEvent.changedTouches[0].pageX;
		　X = moveEndX - startX;
		if (X > 30){
			toggleSidebar(false);
		}
    });
    $(".touchArea").on("touchmove", function(e) {
		　moveEndX = e.originalEvent.changedTouches[0].pageX;
		　X = moveEndX - startX;
		if (X < -60){
			toggleSidebar(true);
		}
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
	});
	
	$("#add").on("click",function(e){
		$(".additional").toggle();
		$(".emoji-window").hide();
		e.stopPropagation();
	});
	
	$("#privateChat").on("click",function(e){
		snkms.confirm("要建立私聊嗎？<br/>建立私聊後可以分享連結以向您的朋友一同進行隱密又安全的聊天！",function(){
			wss.send(JSON.stringify({
				type: "create",
				session: sessionSelf
			}));
		});
	});
	
	$("body").on("click",function(){
		$(".emoji-window").hide();
		$(".additional").hide();
	});
	
	$(".emoji-window").on("click",function(e){
		e.stopPropagation();
	});
	
	$("#eClose").on("click",function(e){
		$(".emoji-window").hide();
		e.stopPropagation();
	});
	$("#emojis").on("click",function(e){
		$(".emoji-window").toggle();
		$(".additional").hide();
		
		if(mobileAndTabletCheck()){
			$(".emoji-window #search").attr("placeholder","尋找表情符號！");
			$(".emoji-window #search").attr("readonly",true);
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
		$('#sender').focus();
		$('#sender')[0].setSelectionRange(insertLength, insertLength);
		
		if(!e.shiftKey){
			$(".emoji-window").hide();
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
			if(mobileAndTabletCheck && originalHeight < $(window).height()) 
				$('.room').css('height',$(window).height() - $('.messageBox').height() - 20);
			
			originalHeight = $(window).height();
		},75);
	});
	
	$(window).on('popstate',function(e){
		location.replace(location.href);
	});
	
	$(window).load(function(){
		onScroll(true);
	});
	
    $('.wrapper_settings').fadeIn(10, function() {
        $('.wrapper_settings').hide();
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
	});
});

function compressImage(files,flag,decrease){
	$("#progress").css('background','red');
	$("#circle").addClass('red');
	$("#circle").show();
	
	if(flag){
		console.log("[CompressionHandler]","Force compression is enabled.");
		snkms.success("正在執行本機強制壓縮處理程序...");
	}
	else{
		snkms.success("正在執行本機壓縮處理程序...");
	}
	
	let newFiles = new Array();
	let k = 0;
	for(let file of files){
		if(file.size > 6291456 || flag){
			console.log("[CompressionHandler]",file.name,"Starting reader...");
			 var reader = new FileReader();
			 reader.onload = function(event){
				let imageURL = event.target.result;
				let newImg = new Image();
				newImg.onload = function(){
					console.log("[CompressionHandler]",file.name,"Starting compressing...","Quality:",0.85 - decrease);
					let cvs = document.createElement('canvas');
					let ctx = cvs.getContext('2d');
					cvs.width = newImg.naturalWidth;
					cvs.height = newImg.naturalHeight;
					ctx.drawImage(newImg,0,0,newImg.naturalWidth,newImg.naturalHeight,0,0,cvs.width,cvs.height);

					cvs.toBlob(function(blob){
						console.log("[CompressionHandler]",file.name,"Compressed.");
						newFiles.push(blob);
						k++;
						$("#progress").css('width',((k/files.length)*100)+"%");
					}, 'image/webp', 0.85 - decrease);
				};
				
				newImg.src = imageURL;
			 };
			  reader.onerror = function () {
				  throw new Error("[CompressionHandler] There was an issue reading the file." + reader.error);
			  };
			 reader.readAsDataURL(file);
		}
		else{
			console.log("[CompressionHandler]",file.name,"has less than 6MB, skipping...");
			newFiles.push(file);
			k++;
			$("#progress").css('width',((k/files.length)*100)+"%");
			continue;
		}
	}
	
	var wait = setInterval(()=>{
		if(files.length == k && k > 0 && newFiles.length > 0){
			clearInterval(wait);
			
			$("#progress").removeAttr('style');
			$("#circle").removeClass('red');
			$("#circle").hide();
			
			let fileSizeTotal = 0;
			for(let file of newFiles){
				fileSizeTotal += file.size;
			}
			
			if(fileSizeTotal > 8388608){
				if(!decrease && flag)
					decrease = 0.15;
				let percent = (0.85 - decrease)*100;
				
				console.log("[CompressionHandler]",newFiles.length,"file(s) too large, now restarting to force compression...");
				snkms.error("壓縮後的大小總和過大，正在重新執行... 成像品質："+percent+"%");
				setTimeout(()=>{
					compressImage(files, true, decrease);
				},1500);
			}
			else{
				console.log("[CompressionHandler]",newFiles.length,"file(s) preparing to upload.");
				uploadPrepare(newFiles, true);
			}
		}
	},250);
}

function uploadPrepare(files,flag){
	var cancel = false;
	var totalSize = 0;
	for(let file of files){
		totalSize += file.size;
			
		if(!file.type.match(/^image/i)){
			snkms.error("無法上傳非圖片檔案");
			cancel = true;
		}
	}
		
	if(totalSize > 8388608){
		if(flag)
			snkms.error("上傳的檔案總和不得超過8MB");
		else
			compressImage(files,false,0);
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
            $('.wrapBackground').fadeOut(25);
            $(".wrapper_settings").hide();
        });
    });


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
    $('.wrapBackground').fadeIn(25, function() {
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

function ContentFormatter(text){
  var bbcode = ParseBBCode(text);
  var urledText = urlify(escapeHtml(bbcode));
  
  return emojify(urledText);
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
	  if(p1 == "large"){//style="--emoji-url: url(${emojis[e]}?size=32);"
		return `<div title=":${p2}:" data-id="${p2}" class="emojis large" style="--emoji-url: url(${emojis[p2]}?size=48);"></div>`;
	  }
	  else{
		//return `<img onload="ImageLoaded(this);" title=":${p2}:" data-id="${p2}" class="emojis" src="${emojis[p2]}?size=24" />`;
		return `<div title=":${p2}:" data-id="${p2}" class="emojis small" style="--emoji-url: url(${emojis[p2]}?size=24);"></div>`;
	  }
  });
}

function urlify(text) {
  var urlRegex = /\[url\](https?:\/\/[^\s]+)\[\/url\]/g;
  return text.replace(urlRegex, function(matched, matchSub, offset, groups) {
	if(checkURL(matchSub)){
		let nowID = crc32(new Date().getTime().toString()+matchSub);
		var wait = setInterval(()=>{
			var $jElement = $('img[data-id="'+nowID+'"]');
			var w = $jElement[0].naturalWidth,
				h = $jElement[0].naturalHeight;
			if($jElement.length && w && h){
				onScroll(scrollBottom);
				clearInterval(wait);
			}
		},30);
		return '<div><a target="_blank" href="' + matchSub + '"><img loading="lazy" data-id="' + nowID + '" src="' + matchSub + '" /></a></div>';
	}
	else
		return '<a target="_blank" href="' + matchSub + '">' + matchSub + '</a>';
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
	
	if(mobileAndTabletCheck())
		$('.room').css('height',$(window).height() - $('.messageBox').height() - 20);
	
	emojis = Object.keys(emojis).sort().reduce(
	  (obj, key) => { 
		obj[key] = emojis[key]; 
		return obj;
	  },{}
	);
	
	for(let e in emojis){
		$(".emoji-window .eBody").append(`<div title=":${e}:" data-id="${e}" style="--emoji-url: url(${emojis[e]}?size=32);"></div>`);
	}
}
function escapeHtml(unsafe){
    return unsafe.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');
}

window.mobileAndTabletCheck = function() {
  let check = false;
  (function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino|android|ipad|playbook|silk/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
  return check;
};