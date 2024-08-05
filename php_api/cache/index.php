<?php
error_reporting(0);
?>
<!DOCTYPE html>
<html>
<head>
<title>XCoreNET 匿名聊天室 - 天夜之心</title>
<meta charset="utf-8" />
<meta name="robots" content="noindex,nofollow"/> 
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="theme-color" content="#131313">
<meta name="msapplication-navbutton-color" content="#131313">
<meta name="apple-mobile-web-app-status-bar-style" content="#131313">
<meta name="apple-mobile-web-app-capable" content="yes" />
<link id="favicon" rel="icon" type="image/x-icon" href="https://i.snkms.com/favicon.ico"/>
<link rel="apple-touch-icon" sizes="192x192" href="https://chat.snkms.com/images/sw/apple-icon-192x.png" />
<link rel="manifest" href="https://chat.snkms.com/manifest.json" />
<link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.8.2/jquery.min.js"></script>
<script src="https://i.snkms.com/js/jquery.cookie.min.js"></script>
<link rel="stylesheet" href="https://i.snkms.com/css/snkms-jsd.min.css" />
<script src="https://i.snkms.com/js/snkms-jsd.min.js?v5"></script>
<link rel="stylesheet" href="https://chat.snkms.com/main.css?v220917-7" />
<script src="https://chat.snkms.com/main.js?v220917-10"></script>
<?php require_once('C:/xampp/php_api/analytics.php');?>
<script>
// Check that service workers are supported
if ('serviceWorker' in navigator) {
  // Use the window load event to keep the page load performant
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-workers.js');
  });
}
</script>
</head>
<body>
<div id="progress">
	<span></span>
</div>
<div id="circle"></div>
<div class="touchArea"></div>
<div class="openBackground"></div>
<div class="wrapBackground"></div>
<div class="wrapper_settings">
	<input type="hidden" id="room_id" value="<?php echo $_GET['private'];?>" readonly />
	<div class="settings_title">詳細設定<img id="onClose" src="https://chat.snkms.com/images/close_black.png" /></div>
	<div class="settings_body">
		<label>名稱<input id="userName" type="text" /></label>
	</div>
	<div class="settings_footer">目前的工作階段: <span></span></div>
</div>
<div class="room">
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
	<div class="channelName">#大廳</div>
	<div class="userList">
		<div class="userTitle">使用者列表</div>
		<div class="userWrapper">
		</div>
	</div>
	<div class="chatInfo">
		<div class="chatNotice">
		透過此聊天室上傳之圖片及文字訊息僅供短暫資訊傳遞、交流用途，遠端伺服器將會在重新啟動之後刪除上述內容，並不負責永久儲存，如有相關需求請自行留存備份。<br/>
		Tips: 在使用者列表點擊他們的工作階段ID或是在聊天室中點擊他們的名字可開始悄悄話！
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
				<div id="eClose"><div class="button"><img src="https://chat.snkms.com/images/close_black.png"/></div></div>
			</div>
		</div>
		<div class="eBody"></div>
	</div>
	<div class="additional dynamic">
		<div id="privateChatCreate" class="button big"><img src="https://chat.snkms.com/images/chatAdd.png"/><span>建立私聊</span></div>
		<div id="privateChatJoin" class="button big"><img src="https://chat.snkms.com/images/read_more.png"/><span>加入私聊</span></div>
		<br/>
		<div id="settings" class="button"><img src="https://chat.snkms.com/images/settings.png"/><span>設定</span></div>
		<div id="publicChat" class="button big"><img src="https://chat.snkms.com/images/home.png"/><span>返回大廳</span></div>
	</div>
	<div id="container">
		<div title="更多選項" id="add" class="button"><img src="https://chat.snkms.com/images/add.png"/></div>
		<div title="上傳圖片" id="upload" class="button"><label><input type="file" name="fileUpload[]" id="fileUpload" accept="image/jpeg,image/png,image/gif,image/webp" multiple /><img src="https://chat.snkms.com/images/upload.png"/></label></div>
		<div  title="表情符號" id="emojis" class="button"><img src="https://chat.snkms.com/images/emoji.png"/></div>
		<textarea id="sender" type="text" placeholder="輸入訊息..."></textarea>
		<div id="sendMessage" class="button"><img src="https://chat.snkms.com/images/send.png"/></div>
	</div>
</div>
</body>
</html>