<?php error_reporting(0);
//if($_SERVER['REMOTE_ADDR'] != '220.133.93.223'){http_response_code(403);exit;}
//if($_SERVER['REMOTE_ADDR'] != '36.234.235.56'){http_response_code(403);exit;}
?>
<!DOCTYPE html>
<html>
<head>
<title>Veil Chat</title>
<meta charset="utf-8" />
<meta name="robots" content="noindex,nofollow"/> 
<meta property="og:title" content="Veil Chat"/>
<meta property="og:description" content="以匿名主打的端對端加密網頁即時聊天室，免登入立即使用，與您的團隊或朋友進行小組討論、溝通聊天。" />
<meta name="description" content="以匿名主打的端對端加密網頁即時聊天室，免登入立即使用，與您的團隊或朋友進行小組討論、溝通聊天。"/>
<meta name="viewport" content="width=device-width, height=device-height, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover, interactive-widget=resizes-content" />
<meta name="format-detection" content="telephone=no">
<meta name="theme-color" content="#131313">
<meta name="msapplication-navbutton-color" content="#131313">
<meta name="apple-mobile-web-app-status-bar-style" content="#131313">
<meta name="apple-mobile-web-app-capable" content="yes" />
<link id="favicon" rel="icon" type="image/x-icon" href="/favicon.ico"/>
<link rel="canonical" href="https://chat.snkms.com" />
<link rel="apple-touch-icon" sizes="192x192" href="https://chat.snkms.com/images/sw/apple-icon-192x.png" />
<link rel="manifest" href="https://chat.snkms.com/manifest.json" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" crossorigin="anonymous" />
<link rel="stylesheet" href="https://i.snkms.com/highlight.js/atom-one-dark.css" />
<link rel="stylesheet" href="https://chat.snkms.com/css/main.css?v2408142" />
<script type="application/ld+json">[{"@context":"http:\/\/schema.org","@type":"WebSite","name":"Veil Chat","url":"https:\/\/chat.snkms.com\/","alternateName":"\u5929\u591c\u4e4b\u5fc3"}]</script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js" integrity="sha256-BbhdlvQf/xTY9gja0Dq3HiwQF8LaCRTXxZKRutelT44=" crossorigin="anonymous"></script>
<script src="https://i.snkms.com/js/jquery.cookie.min.js"></script>
<script src="https://i.snkms.com/highlight.js/highlight.min.js"></script>
<script src="https://chat.snkms.com/js/debugger.js"></script>
<script src="https://chat.snkms.com/js/emojis.js"></script>
<script src="https://chat.snkms.com/js/main.encrypted.js?v2501041"></script>
<?php require_once('C:/xampp/php_api/analytics.php');?>
</head>
<body>
<div id="progress">
	<span></span>
</div>
<div id="circle"></div>
<div class="openBackground"><div></div><span></span><div></div></div>
<div class="wrapper_settings">
	<input type="hidden" id="room_id" value="<?php echo $_GET['private'];?>" readonly />
	<div class="settings_title">詳細設定<img id="onClose" src="https://chat.snkms.com/images/close_black.png" /></div>
	<div class="settings_body">
		<label>名稱<input id="userName" type="text" /></label>
	</div>
	<div class="settings_footer">目前的工作階段: <span></span></div>
</div>
<div class="room">
	<div class="channelHeader">
		<div class="headerButton list" data-ripple><img src="https://chat.snkms.com/images/menu.png" /></div>
		<div class="headerTitle">#載入中</div>
		<div class="headerButton channel" data-ripple><img src="https://chat.snkms.com/images/group.png" /></div>
	</div>
	<div class="lobby">
		<div class="menu">
			<div class="speedMove">
				<div title="捲動到最上方" id="moveUp"><img src="https://chat.snkms.com/images/arrow_up.png" /></div>
				<div title="捲動到最下方" id="moveDown"><img src="https://chat.snkms.com/images/arrow_down.png" /></div>
			</div>
		</div>
		<div class="chat"></div>
	</div>
	<div class="rightSide">
		<div class="channelName">#載入中</div>
		<div class="userList">
			<div class="userTitle">使用者列表<span>0</span></div>
			<div class="userWrapper">
			</div>
		</div>
		<div class="chatInfo">
			<div class="chatNotice">
			透過此聊天室上傳之圖片及文字訊息僅供短暫資訊傳遞、交流用途，伺服器將會在重新啟動之後刪除上述內容，並不負責永久儲存，如有相關需求請自行留存備份。<br/>
			Tips: 在使用者列表或是聊天室中點擊使用者的暱稱可開始進行悄悄話！
			</div>
		</div>
	</div>
</div>
<div class="messageBox">
	<div class="emoji-window dynamic">
		<div class="eHeader">
			<div class="ehLeft">
				<div class="searcher"><input id="search" type="text" maxlength="32" autocomplete="off" /></div>
			</div>
			<div class="ehRight">
				<div id="eClose"><div class="button" data-ripple><img src="https://chat.snkms.com/images/close_black.png"/></div></div>
			</div>
		</div>
		<div class="eBody">
			<div class="eContainer"></div>
		</div>
	</div>
	<div class="additional dynamic">
		<div id="privateChatCreate" class="button big" data-ripple><img src="https://chat.snkms.com/images/chatAdd.png"/><span>建立私聊</span></div>
		<div id="privateChatJoin" class="button big" data-ripple><img src="https://chat.snkms.com/images/read_more.png"/><span>加入私聊</span></div>
		<br/>
		<div id="settings" class="button"><img src="https://chat.snkms.com/images/settings.png"/><span>設定</span></div>
		<div id="publicChat" class="button big" data-ripple><img src="https://chat.snkms.com/images/home.png"/><span>返回大廳</span></div>
	</div>
	<div id="container">
		<div title="更多選項" id="add" class="button"><img src="https://chat.snkms.com/images/add.png"/></div>
		<div title="上傳檔案" id="upload" class="button"><label><input type="file" name="fileUpload[]" id="fileUpload" multiple /><img src="https://chat.snkms.com/images/upload.png"/></label></div>
		<div title="表情符號" id="emojis" class="button"><img src="https://chat.snkms.com/images/emoji.png"/></div>
		<div class="textArea">
			<div class="textPlaceholder"></div>
			<div class="senderWrapper">
				<div id="sender" contenteditable="true"></div>
			</div>
		</div>
		<div id="sendMessage" class="button" title="傳送訊息"><img src="https://chat.snkms.com/images/send.png"/></div>
	</div>
</div>
</body>
</html>