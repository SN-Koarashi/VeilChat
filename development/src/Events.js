"use strict";
import $ from 'jquery';
import config from './config.js';
import { getRandomNickname, crc32, base64ToBlob, isMobile, randomToken } from './Utils.js';
import Dialog from './Dialog.js';
import { WebSocketConnect, WebSocketBinaryHandler } from './WebSocket.js';
import {
	savingSettings,
	toggleSidebar,
	onMessage,
	onKeyEnter,
	onScroll,
	uploadFiles,
	uploadPrepare,
	privateChat,
	openSettings,
	closeSettings
} from './ChatUtils.js';
import { hashString, getSecretPublicKeyRaw, getNewSecretPublicKeyRaw, encodePrivateKey } from './Crypto.js';

function initSettings() {
	if (isMobile() && window.innerWidth <= 480) {
		let elements = $(".additional").find('div');

		elements.each(function () {
			$(this).addClass("additionalSetting");
			$(".settings_body").append($(this));
		});

		$(".additional").empty();
	}
	else {
		let elements = $(".settings_body").find('.additionalSetting');
		var k = 0;
		elements.each(function () {
			k++;
			$(this).removeClass("additionalSetting");
			$(".additional").append($(this));

			if (k % 2 == 0 && k != elements.length)
				$(".additional").append("<br/>");
		});
	}

	//$('.userList').css('bottom', $('.chatInfo').outerHeight() + 'px');
}

function initSetup() {
	if (!config.localStorage.getItem('username')) {
		Dialog.prompt('設定', '該如何稱呼你？', '',
			function (evt, value) {
				config.userName = value;
				config.localStorage.setItem('username', value);
				$('#userName').val(value);
				WebSocketConnect();
				$('.userlist > div').show();
			}, function () {
				const rndName = getRandomNickname();

				config.userName = rndName;
				config.localStorage.setItem('username', rndName);
				$('#userName').val(rndName);
				WebSocketConnect();
				$('.userlist > div').show();
			});
	}
	else {
		config.userName = config.localStorage.getItem('username');
		WebSocketConnect();
		$('.userlist > div').show();
	}

	if (isMobile()) {
		$('.room').css('height', $(window).height() - $('.messageBox').height() - 20);
		$('#userName').attr('readonly', true);
		$('#userName').on('click', function () {
			Dialog.prompt('設定', '該如何稱呼你？', '',
				function (evt, value) {
					config.userName = value;
					$('#userName').val(value);
					savingSettings();
				});
		});
	}

	window.emojis = Object.keys(window.emojis).sort().reduce(
		(obj, key) => {
			obj[key] = window.emojis[key];
			return obj;
		}, {}
	);

	let devicePixel = (window.devicePixelRatio == 1) ? 32 : (devicePixelRatio == 2) ? 64 : 96;
	for (let e in window.emojis) {
		$(".emoji-window .eBody .eContainer").append(`<div title=":${e}:" data-id="${e}" data-ripple><span style="--emoji-url: url(${window.emojis[e]}?size=${devicePixel});"></span></div>`);
	}

	$.fn.tagName = function () {
		return this.prop("tagName").toLowerCase();
	};
}

export function initFirst(window) {
	setInterval(() => {
		if ($('#sender').text().length === 0 && parseInt($('#sender').css('height')) === 40 || $('#sender').text().length === 1 && $('#sender').text().match(/^\n$/g) || $('#sender').text().length === 2 && $('#sender').text().match(/^\r\n$/g))
			$(".textPlaceholder").show();
		else
			$(".textPlaceholder").hide();
	}, 50);

	if (config.localStorage.getItem('token') === null) {
		let random = randomToken(70);
		config.localStorage.setItem('token', random);
		config.token = random;
	}
	else {
		config.token = config.localStorage.getItem('token');
	}

	$(window).on('popstate', function () {
		config.localStorage.removeItem('lastRoom');
	});

	$(document).on('keydown', function (e) {
		if (document.activeElement === document.body && !$('.snkms-jsd-m').is(':visible') && !$('.wrapper_settings').is(':visible')) {
			if (!e.altKey && !e.shiftKey && !e.ctrlKey)
				$('#sender').focus();
		}
	});


	$('body').on('click', '.privateStatus .privateButton', function () {
		config.privateChatTarget = null;
		$('.privateStatus').remove();
	});

	$('body').on('click', '.inviteLink', function (e) {
		if ($(this).attr('data-room') === config.locate) {
			let toast = "您已經在這個房間了";
			if (isMobile())
				Dialog.toastMessage(toast, 'close', 'red');
			else
				Dialog.error(toast);
		}
		else {
			WebSocketBinaryHandler({
				type: 'login',
				token: config.token,
				username: config.userName,
				location: $(this).attr('data-room')
			});
		}
		e.preventDefault();
	});

	$('#sendMessage').on('click', function (e) {
		if (config.wss.readyState == 1 && $('#sender').text().replace(/\n|\r/g, "").length > 0) {
			$(this).blur();
			if ($('#sender').text().length > 4000) {
				var blobData = new Blob([$('#sender').text()], {
					type: 'text/plain'
				});
				var file = new File([blobData], "message.txt");

				uploadFiles([file]);
			}
			else {
				WebSocketBinaryHandler({
					type: 'message',
					location: config.locate,
					message: {
						original: $('#sender').text()
					}
				});
			}

			$('#sender').text('');

			if ($('.textArea').hasClass("maximum"))
				$('#sender').focus();

			onKeyEnter($('#sender'));
			e.stopPropagation();
		}
	});
	$('#sender').on('keydown', function (e) {
		if (e.keyCode == 13 && config.wss.readyState == 1 && $(this).text().replace(/\n|\r/g, "").length > 0) {
			if (!e.shiftKey && !isMobile()) {
				if (config.privateChatTarget?.length > 0) {
					var targetSignature = config.privateChatTarget;
					var message = $(this).text();

					if (!config.clientList[targetSignature]) {
						let toast = "該使用者工作階段不存在";
						if (isMobile())
							Dialog.toastMessage(toast, 'close', 'red');
						else
							Dialog.error(toast);

						//$(this).text('');
						config.privateChatTarget = null;
						e.preventDefault();
						return;
					}
					else {
						if (message.trim().length == 0) {
							let toast = "請輸入訊息內容";
							if (isMobile())
								Dialog.toastMessage(toast, 'close', 'red');
							else
								Dialog.error(toast);
							e.preventDefault();
							return;
						}

						WebSocketBinaryHandler({
							type: 'privateMessage',
							signature: targetSignature,
							message: {
								original: message
							},
							location: config.locate
						});

						onMessage("privateMessageSource", "private", targetSignature, config.clientList[targetSignature]?.at(0).username, config.clientList[targetSignature]?.at(0).id, message, new Date().getTime());
					}
				}
				// 使用 Markdown 語法時不送出訊息
				else if ($(this).text().startsWith("```") && !$(this).text().match(/```([a-zA-Z0-9]+)?\n*([^\n][^]*?)\n*```/g) ||
					$(this).text().match(/```/g) && $(this).text().match(/```/g).length % 2 == 1
				) {
					onKeyEnter($(this));
					return;
				}
				else {
					if ($('#sender').text().length > 4000) {
						var blobData = new Blob([$('#sender').text()], {
							type: 'text/plain'
						});
						var file = new File([blobData], "message.txt");

						uploadFiles([file]);
					}
					else {
						WebSocketBinaryHandler({
							type: 'message',
							location: config.locate,
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
		if (e.keyCode == 81 && e.altKey || e.keyCode == 81 && e.ctrlKey) {
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

			if (document.getSelection().rangeCount > 0) {
				var range = document.getSelection().getRangeAt(0);

				// 有選取文字時
				if (range.startOffset != range.endOffset) {
					let insertMarkdown = "```";
					let textNodeStart = document.createTextNode(insertMarkdown + "\n");
					let textNodeEnd = document.createTextNode("\n" + insertMarkdown);
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
				else {
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
		if (e.keyCode == 9) {
			if (document.getSelection().rangeCount > 0) {
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

		if (e.keyCode == 13 && !e.shiftKey && !isMobile() || e.keyCode == 9)
			e.preventDefault();

		if (e.keyCode == 13) {
			if (document.getSelection().rangeCount > 0) {
				// 非同步處理事件
				setTimeout(() => {
					// 將捲軸捲動到游標的位置，防止在最底層執行換行時捲軸卻沒有移動到最下方的問題
					var range = document.getSelection().getRangeAt(0);
					if (range.endContainer.nextSibling === null) {
						var span = document.createElement('span');
						var textNode = document.createTextNode("\n");
						range.insertNode(textNode);
						range.insertNode(span);

						span.scrollIntoView();

						range.setStart(textNode, 0);
						range.setEnd(textNode, 0);
						document.getSelection().removeAllRanges();
						document.getSelection().addRange(range);

						setTimeout(() => {
							$('#sender span').remove();
						}, 5);
					}
				}, 1);
			}
		}

		onKeyEnter($(this));
	});

	$('#sender').on('click', function (e) {
		if (isMobile()) {
			$(this).parents(".textArea").addClass("maximum");
			$("#add").addClass("right");
			//$("#add img").attr("src",MainDomain + "/images/arrow_right.png");
			//$("#upload").hide();
			e.stopPropagation();
		}
	});

	$('#sender').on('paste', function (e) {
		e.preventDefault();
		const items = (e.clipboardData || e.originalEvent.clipboardData).items;
		var blob = null;
		for (let item of items) {
			if (item.type.indexOf('image') === 0) {
				blob = item.getAsFile();
			}
		}

		// load image if there is a pasted image
		if (blob != null) {
			Dialog.success("已從剪貼簿貼上圖片");
			var reader = new FileReader();
			reader.onload = function (event) {
				var imageURL = event.target.result;
				var base64ImageContent = imageURL.replace(/^data:(image\/[a-zA-Z]+);base64,/, "");
				var base64ContentType = imageURL.match(/^data:(image\/[a-zA-Z]+);base64,/)[1];
				var blob = base64ToBlob(base64ImageContent, base64ContentType);
				uploadFiles([blob]);
			};
			reader.readAsDataURL(blob);
		}
		else {
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
	$('#sender').on('focus', function () {
		setTimeout(() => {
			// 防止拖曳文字進入輸入框內時，錯誤的重設游標停頓位置
			if (lastRange !== null && !droppedText) {
				document.getSelection().removeAllRanges();
				document.getSelection().addRange(lastRange);
			}

			droppedText = false;
		}, 1);

		setTimeout(() => {
			onKeyEnter($('#sender'));
		}, 250);
	});
	$('#sender').on('blur', function () {
		//if(document.getSelection().rangeCount > 0 && $(document.getSelection().focusNode.parentElement).parents('#sender').length > 0){
		if (document.getSelection().rangeCount > 0 &&
			($(document.getSelection().focusNode.parentElement).parents('#sender').length > 0 || $(document.getSelection().focusNode.parentElement).is('#sender'))
		) {
			lastRange = document.getSelection().getRangeAt(0);
		}
	});
	$('#sender').on('input', function () {
		onKeyEnter($('#sender'));
	});

	$('#fileUpload').on('change', function () {
		uploadPrepare(this.files, false);
	});

	/*
	// 滑動程式碼區塊時不觸發側邊欄
	$(".lobby").on("touchstart touchmove touchend", "code", function(e){
		e.stopPropagation();
	});
	*/

	// eslint-disable-next-line no-unused-vars
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

	$('.lobby').on('scroll', function () {
		clearTimeout(timerScrolling);
		timerScrolling = setTimeout(() => {
			if (!touchStarting)
				touchScrolling = false;
		}, 250);

		touchScrolling = true;
	});

	$('.userList').on('scroll', function () {
		clearTimeout(timerScrolling);
		timerScrolling = setTimeout(() => {
			if (!touchStarting)
				touchScrolling = false;
		}, 250);

		touchScrolling = true;
	});

	$("body").on("touchstart", function (e) {
		if (e.originalEvent.touches.length > 1 || $(e.originalEvent.target).parents('.messageBox,.channelHeader').length > 0) return;
		if ($(e.originalEvent.target).parents('.openBackground').length > 0 && $(e.originalEvent.target).tagName() === 'span') return;

		touchStarting = true;

		clearInterval(timer);
		timer = setInterval(() => {
			if (diffX != 0 && diffX == X || diffY != 0 && diffY == Y) {
				touchStaying = true;
			}
			else {
				touchStaying = false;
			}

			diffX = X,
				diffY = Y;
		}, 100);

		startX = e.originalEvent.changedTouches[0].pageX,
			startY = e.originalEvent.changedTouches[0].pageY;
		X = startX;
		Y = startY;
		startTime = new Date().getTime();

		dragStartX = e.originalEvent.changedTouches[0].pageX;
		dragStartY = e.originalEvent.changedTouches[0].pageY;

		$('.emoji-window').css('display') == 'block';

		if (Dialog.isShownDialog(e.target))
			createDragElementsObject($(e.target).parents(".snkms-content").get(0));
		else {
			createDragElementsObject('.wrapper_settings');
			createDragElementsObject('.rightSide');
		}

		if (!$(".wrapper_settings").attr("data-open") && !$(".rightSide").attr("data-open")) {
			$("#container,.lobby, .channelHeader").removeClass('hasRight');
			$("#container,.lobby, .channelHeader").removeClass('hasLeft');
		}

		$('.openBackground').removeClass('hasAnime');
	});

	$("body").on("touchmove", function (e) {
		if (e.originalEvent.touches.length > 1 || $(e.originalEvent.target).parents('.messageBox,.channelHeader').length > 0) return;
		if ($(e.originalEvent.target).parents('.openBackground').length > 0 && $(e.originalEvent.target).tagName() === 'span') return;

		// 向左滑動 (動態行為)
		if (e.originalEvent.changedTouches[0].pageX < moveEndX) {
			touchMovingDirection = -1;
		}
		// 向右滑動 (動態行為)
		else {
			touchMovingDirection = 1;
		}

		moveEndX = e.originalEvent.changedTouches[0].pageX;
		moveEndY = e.originalEvent.changedTouches[0].pageY;
		X = moveEndX - startX;
		Y = moveEndY - startY;

		// 左右欄位手勢滑動
		if (!Dialog.isShownDialog(e.target) && !touchScrolling && Math.abs(X) > Math.abs(Y) || $('.openBackground').hasClass('noOverflow')) {
			// 右側欄
			if (X > 0 && $(".rightSide").attr("data-open") && !$(".wrapper_settings").attr("data-open")) {
				let movePosition = dragElement['.rightSide'].rx - Math.abs(moveEndX - dragStartX);
				let movePositionMinus = movePosition + $('.rightSide').width();

				// 判斷是否在合理範圍 (防止使用者拖曳出螢幕範圍)
				if (movePosition < 0 && movePositionMinus > 0) {
					$('.openBackground').addClass('noOverflow')
					$(".rightSide,#container,.lobby,.channelHeader,.lobby > .menu").removeClass('hasAnime');
					$(".rightSide").css('right', movePosition + 'px');

					$(".lobby > .menu").css('right', (movePositionMinus + 13) + 'px');
					$(".lobby").css('right', movePositionMinus + 'px');
					$(".channelHeader").css('right', movePositionMinus + 'px');
					$("#container").css('right', movePositionMinus + 'px');

					$(".openBackground").css('opacity', 1 + parseInt($(".rightSide").css('right')) / $(".rightSide").width());
					$('.openBackground').show();
				}
			}
			// 左側欄
			else if (X < 0 && $(".wrapper_settings").attr("data-open") && !$(".rightSide").attr("data-open")) {
				let movePosition = dragElement['.wrapper_settings'].x - Math.abs(moveEndX - dragStartX);
				let movePositionMinus = movePosition + $('.wrapper_settings').width();

				// 判斷是否在合理範圍 (防止使用者拖曳出螢幕範圍)
				if (movePosition < 0 && movePositionMinus > 0) {
					$('.openBackground').addClass('noOverflow')
					$(".wrapper_settings,#container,.lobby,.channelHeader,.lobby > .menu").removeClass('hasAnime');
					$(".wrapper_settings").css('left', movePosition + 'px');

					$(".lobby > .menu").css('right', ((movePositionMinus - 13) * -1) + 'px');
					$(".lobby").css('left', movePositionMinus + 'px');
					$(".channelHeader").css('left', movePositionMinus + 'px');
					$("#container").css('left', movePositionMinus + 'px');

					$(".openBackground").css('opacity', 1 + parseInt($(".wrapper_settings").css('left')) / $(".wrapper_settings").width());
					$('.openBackground').show();
				}
			}
		}

		// 對話框手勢操作
		if (Dialog.isShownDialog(e.target) && dragElement[$(e.target).parents(".snkms-content")?.get(0)]) {
			let movePosition = moveEndY - dragStartY + dragElement[$(e.target).parents(".snkms-content").get(0)].y;

			// 判斷是否在合理範圍，讓使用者只能在螢幕範圍內拖曳
			if (movePosition >= 0)
				$(e.target).parents(".snkms-content").css('top', movePosition + 'px');
			else
				$(e.target).parents(".snkms-content").css('top', '0px');

			$(e.target).parents(".snkms-content").removeClass('hasAnime');
		}
	});

	$("body").on("touchend", function (e) {
		if (e.originalEvent.touches.length > 1 || $(e.originalEvent.target).parents('.messageBox,.channelHeader').length > 0) return;
		if ($(e.originalEvent.target).parents('.openBackground').length > 0 && $(e.originalEvent.target).tagName() === 'span') return;

		touchStarting = false;

		//e.preventDefault();
		clearInterval(timer);

		if ($(".messageBox").hasClass("unhidden")) return;

		// let endTime = new Date().getTime();
		moveEndX = e.originalEvent.changedTouches[0].pageX;
		moveEndY = e.originalEvent.changedTouches[0].pageY;
		X = moveEndX - startX;
		Y = moveEndY - startY;

		// 對話框關閉狀態下、按下及放開的座標差異不等於零時 (代表有移動)、沒有在捲動狀態時、主要行為是左右滑動時
		if (!Dialog.isShownDialog(e.target) && X != 0 && !touchScrolling && Math.abs(X) > Math.abs(Y) || $('.openBackground').hasClass('noOverflow')) {
			$(".openBackground").removeClass('noOverflow');
			$(".rightSide,#container,.lobby,.wrapper_settings, .channelHeader,.lobby > .menu").addClass('hasAnime');
			if (X < 0 && $(".rightSide").attr("data-open")) {
				$("#container,.lobby, .channelHeader").addClass('hasRight');
			}
			else if (X > 0 && $(".wrapper_settings").attr("data-open")) {
				$("#container,.lobby, .channelHeader").addClass('hasLeft');
			}

			if (parseInt($('.lobby').css('left')) < 0) {
				if (parseFloat($('.openBackground').css('opacity')) > 0.5 && touchStaying && dragElement['.rightSide'] !== undefined ||
					touchMovingDirection === -1 && !touchStaying && dragElement['.rightSide'] !== undefined
				) {
					toggleSidebar($(".rightSide"), true, "right");
				}
				else {
					toggleSidebar($(".rightSide"), false, "right");
				}
			}
			else {
				if (parseFloat($('.openBackground').css('opacity')) > 0.5 && touchStaying && dragElement['.wrapper_settings'] !== undefined ||
					touchMovingDirection === 1 && !touchStaying && dragElement['.wrapper_settings'] !== undefined
				) {
					toggleSidebar($(".wrapper_settings"), true, "left");
				}
				else {
					toggleSidebar($(".wrapper_settings"), false, "left");
					$("#userName").blur();
					savingSettings();
				}
			}
		}

		// 對話框手勢操作
		if (Math.abs(X) < 65 && Y > 35 && !touchStaying && Dialog.isShownDialog(e.target)) {
			$('.snkms-content .snkms-title .close').click();
		}
		else if (Dialog.isShownDialog(e.target) && dragElement[$(e.target).parents(".snkms-content")?.get(0)]) {
			if (parseInt($(e.target).parents(".snkms-content").css('top')) > $(document).height() / 2.5) {
				$('.snkms-content .snkms-title .close').click();
			}
			else {
				$(e.target).parents(".snkms-content").css('top', '0px');
			}

			$(e.target).parents(".snkms-content").addClass('hasAnime');
		}



		touchScrolling = false;
	});

	// 在中間畫面(主畫面)手勢處理
	$(".lobby").on("touchend", function (e) {
		if (e.originalEvent.touches.length > 1) return;

		//e.preventDefault();
		clearInterval(timer);

		touchStarting = false;

		if ($(".messageBox").hasClass("unhidden")) return;

		// let endTime = new Date().getTime();

		moveEndX = e.originalEvent.changedTouches[0].pageX;
		moveEndY = e.originalEvent.changedTouches[0].pageY;

		X = moveEndX - startX;
		Y = moveEndY - startY;

		$(".rightSide,#container,.lobby,.wrapper_settings,.channelHeader,.lobby > .menu").addClass('hasAnime');
		if (X < 0) {
			$("#container,.lobby, .channelHeader").addClass('hasRight');
		}
		else {
			$("#container,.lobby, .channelHeader").addClass('hasLeft');
		}

		// 在沒有捲動主畫面的情況下且主要行為為左右滑動時觸發
		if (!touchScrolling && Math.abs(X) > Math.abs(Y) || touchMovingDirection !== 0 && !touchScrolling && parseInt($('.lobby').css('left')) !== 0) {

			// 判斷主畫面處於向左還是向右狀態

			// 處於向左狀態時 (開啟右側欄)
			if (parseInt($('.lobby').css('left')) < 0) {
				if (parseFloat($('.openBackground').css('opacity')) > 0.5 && touchStaying && dragElement['.rightSide'] !== undefined ||
					touchMovingDirection === -1 && !touchStaying && dragElement['.rightSide'] !== undefined
				) {
					toggleSidebar($(".rightSide"), true, "right");
				}
				else {
					toggleSidebar($(".rightSide"), false, "right");
				}
			}
			// 處於向右狀態時 (開啟左側欄)
			else {
				if (parseFloat($('.openBackground').css('opacity')) > 0.5 && touchStaying && dragElement['.wrapper_settings'] !== undefined ||
					touchMovingDirection === 1 && !touchStaying && dragElement['.wrapper_settings'] !== undefined
				) {
					toggleSidebar($(".wrapper_settings"), true, "left");
				}
				else {
					toggleSidebar($(".wrapper_settings"), false, "left");
				}
			}
		}
		else {
			if (parseInt($('.lobby').css('left')) > 0)
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

	$(".lobby").on("touchmove", function (e) {
		if (e.originalEvent.touches.length > 1) return;
		if ($(".messageBox").hasClass("unhidden")) return;

		// 向左滑動 (動態行為)
		if (e.originalEvent.changedTouches[0].pageX < moveEndX) {
			touchMovingDirection = -1;
		}
		// 向右滑動 (動態行為)
		else {
			touchMovingDirection = 1;
		}

		moveEndX = e.originalEvent.changedTouches[0].pageX;
		moveEndY = e.originalEvent.changedTouches[0].pageY;
		X = moveEndX - startX;
		Y = moveEndY - startY;

		// 在沒有捲動主畫面的情況下且主要行為為左右滑動時觸發 或是 主畫面處於非捲動狀態時 (無法捲動狀態)
		if (!touchScrolling && Math.abs(X) > Math.abs(Y) || $('.lobby').hasClass('noOverflow')) {
			$('.lobby').addClass('noOverflow');

			// 右側欄
			if (X < 0) {
				$(".lobby,#container,.wrapper_settings,.channelHeader").css('left', '');
				let movePosition = dragElement['.rightSide'].rx + Math.abs(moveEndX - dragStartX);
				let movePositionMinus = ((moveEndX - dragStartX) * -1);

				if (movePosition < 0) {
					$(".rightSide,#container,.lobby, .channelHeader,.lobby > .menu").removeClass('hasAnime');
					$(".rightSide").css('right', movePosition + 'px');

					$(".lobby > .menu").css('right', (movePositionMinus + 13) + 'px');
					$(".channelHeader").css('right', movePositionMinus + 'px');
					$(".lobby").css('right', movePositionMinus + 'px');
					$("#container").css('right', movePositionMinus + 'px');

					$(".openBackground").css('opacity', 1 + parseInt($(".rightSide").css('right')) / $(".rightSide").width());
					$('.openBackground').show();
				}
			}
			// 左側欄
			else {
				$(".lobby,#container,.rightSide,.channelHeader").css('right', '');
				let movePosition = (dragElement['.wrapper_settings'].x + Math.abs(moveEndX - dragStartX));
				let movePositionMinus = ((moveEndX - dragStartX));

				if (movePosition < 0) {
					$(".wrapper_settings,#container,.lobby, .channelHeader,.lobby > .menu").removeClass('hasAnime');
					$(".wrapper_settings").css('left', movePosition + 'px');

					$(".lobby > .menu").css('right', ((movePositionMinus - 13) * -1) + 'px');
					$(".channelHeader").css('left', movePositionMinus + 'px');
					$(".lobby").css('left', movePositionMinus + 'px');
					$("#container").css('left', movePositionMinus + 'px');

					$(".openBackground").css('opacity', 1 + parseInt($(".wrapper_settings").css('left')) / $(".wrapper_settings").width());
					$('.openBackground').show();
				}
			}
		}
		else {
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

	$('.lobby, .userList').on('scroll', function () {
		clearTimeout(ripple_endScrolling);

		if (ripple_startScrolling == 0) {
			ripple_startScrolling = setTimeout(() => {
				ripple_isScrolling = true;
			}, 25);
		}

		ripple_endScrolling = setTimeout(() => {
			ripple_isScrolling = false;
			ripple_startScrolling = 0;
		}, 250);
	});

	$('.lobby > .chat').on('touchstart', '[data-ripple]', function () {
		ripple_rippleTouchingTime = new Date().getTime();
	});

	$('.lobby > .chat').on('touchend', '[data-ripple]', function () {
		ripple_isRippleTouching = false;
		ripple_rippleTouchingTime = 0;
	});

	$('.lobby > .chat').on('touchmove touchstart', '[data-ripple]', function (e) {
		var startTouchmoveTime = new Date().getTime();
		var diffTouchTime = startTouchmoveTime - ripple_rippleTouchingTime;

		if (ripple_isScrolling ||
			ripple_isRippleTouching ||
			diffTouchTime < 200 && diffTouchTime > 50 ||
			diffTouchTime > 1500
		) return;

		ripple_isRippleTouching = true;

		if (diffTouchTime < 50) {
			let ele = this;
			setTimeout(() => {
				if (!ripple_isScrolling && parseFloat($('.openBackground').css('opacity')) == 0) {
					ElementRipple(ele, e);
				}
			}, 150);
		}
		else {
			ElementRipple(this, e);
		}
	});

	$('.wrapper_settings, .rightSide, .channelHeader').on('touchstart', '[data-ripple]', function (e) {
		ElementRipple(this, e);
	});
	$('body').on('touchstart', '.snkms-jsd-m [data-ripple]', function (e) {
		ElementRipple(this, e);
	});

	function ElementRipple(sElement, e) {
		var $self = $(sElement);

		var touch = e.originalEvent.touches[0] || e.originalEvent.changedTouches[0];
		var initPos = $self.css("position"),
			offs = $self.offset(),
			x = touch.pageX - offs.left,
			y = touch.pageY - offs.top,
			dia = Math.min(sElement.offsetHeight, sElement.offsetWidth, 100), // start diameter
			$ripple = $('<div/>', { class: "ripple dark", appendTo: $self });

		if (!initPos || initPos === "static") {
			$self.css({ position: "relative" });
		}

		$('<div/>', {
			class: "rippleWave",
			css: {
				background: $self.data("ripple"),
				width: dia,
				height: dia,
				left: x - (dia / 2),
				top: y - (dia / 2),
			},
			appendTo: $ripple,
			one: {
				animationend: function () {
					$ripple.remove();
				}
			}
		});
	}

	// 結束

	$("#search").on("keyup", function () {
		var id = $(this).val();
		$(".emoji-window .eBody .eContainer div").each(function () {
			if ($(this).attr("data-id").indexOf(id) == -1) {
				$(this).hide();
			}
			else {
				$(this).show();
			}
		});
	});

	$(".headerButton.list").on("click", function () {
		$(".lobby, #container, .channelHeader").addClass('hasLeft');
		$(".lobby, #container, .channelHeader").removeClass('hasRight');
		toggleSidebar($(".wrapper_settings"), true, 'left');
	});

	$(".headerButton.channel").on("click", function () {
		$(".lobby, #container, .channelHeader").addClass('hasRight');
		$(".lobby, #container, .channelHeader").removeClass('hasLeft');
		toggleSidebar($(".rightSide"), true, 'right');
	});

	$(".additional").on("click", function (e) {
		e.stopPropagation();
	});

	$(".additional div").on("click", function () {
		$(".additional").hide();
		$(".messageBox").removeClass("unhidden");
	});

	$("#add").on("click", function (e) {
		if ($(this).hasClass("right")) {
			$("body").trigger("click");
			$("#sender").focus();
		}
		else {
			$(".additional").toggle();
			$(".emoji-window").hide();
			if ($(".additional").css('display') == "block") {
				$(".messageBox").addClass("unhidden");
			}
			else {
				$(".messageBox").removeClass("unhidden");
			}
		}
		e.stopPropagation();
	});

	$("#privateChatCreate").on("click", function () {
		config.inviteList = [];
		const $element = $(this);

		let elements = "";
		for (let c in config.clientList) {
			if (c == config.tokenHashSelf) continue;

			elements += `<div><label class="container"><input name="inviteList" type="checkbox" value="${c}"><span class="checkmark"></span>${config.clientList[c]?.at(0).username}#${crc32(c)}</label></div>`;
		}

		if (elements.length > 0)
			elements = `<hr/>${elements}`;

		Dialog.option("建立房間", "要建立臨時私聊房間嗎？<br/>建立私聊後可以分享連結以向您的朋友一同進行隱密又安全的聊天！<div style='font-size:12px;margin-top: 15px;'>設有密碼之房間將受到端對端加密保護</div>", [{ name: "無密碼", value: "noPassword" }], "有密碼", function (evt, value) {
			const choosen = value;
			const senderWorker = async function (private_key) {
				let obj = {
					type: "create",
					session: config.sessionSelf
				};

				if (private_key !== "noPassword" && private_key.trim().length > 0) {
					obj.password = await hashString(private_key);
					config.roomPassword = private_key;

					let creatorKeyPair = await getSecretPublicKeyRaw();
					let keyPair = await getNewSecretPublicKeyRaw();

					obj.publicKeyBase64 = keyPair.publicKeyRawBase64;
					obj.creatorPrivateKeyBase64 = await encodePrivateKey(creatorKeyPair.privateKey);
				}

				WebSocketBinaryHandler(obj);
				if ($element.hasClass("additionalSetting"))
					toggleSidebar($(".wrapper_settings"), false, "left");
			};

			if (elements.length > 0) {
				setTimeout(() => {
					Dialog.confirm(`選擇要邀請到新建立的私人房間的對象，若都沒有勾選對象也可以在建立後發送房間ID給他們。${elements}`, function () {
						$('input[name="inviteList"]:checked').each(function () {
							config.inviteList.push($(this).val());
						});

						senderWorker(choosen);
					});
				}, 250);
			}
			else {
				senderWorker(choosen);
			}
		}, null, 2);
	});

	$("#privateChatJoin").on("click", function () {
		const $element = $(this);
		Dialog.prompt("加入房間", "請輸入房間ID或網址", config.MainDomain + "/private/########", function (e, value) {
			if (config.locate === value.split("/").at(-1)) {
				let toast = "您已經在這個房間了";
				if (isMobile())
					Dialog.toastMessage(toast, 'close', 'red');
				else
					Dialog.error(toast);
				return;
			}

			if (value.match(/^(https?:\/\/chat\.snkms\.com\/private)/ig) || value.match(/^([0-9A-Za-z\-_]{1,16})$/g)) {
				config.locate = value.replace(config.MainDomain + "/private/", "");

				WebSocketBinaryHandler({
					type: 'login',
					token: config.token,
					username: config.userName,
					location: config.locate
				});

				if ($element.hasClass("additionalSetting"))
					toggleSidebar($(".wrapper_settings"), false, "left");
			}
			else {
				let toast = "格式錯誤，無法加入房間";
				if (isMobile())
					Dialog.toastMessage(toast, 'close', 'red');
				else
					Dialog.error(toast);
			}
		});
	});

	$("#publicChat").on("click", function () {
		if (config.locate == "public") {
			let toast = "您已經在大廳了";
			if (isMobile())
				Dialog.toastMessage(toast, 'close', 'red');
			else
				Dialog.error(toast);
		}
		else {
			config.locate = "public";
			WebSocketBinaryHandler({
				type: 'login',
				token: config.token,
				username: config.userName,
				location: "public"
			});
		}

		if ($(this).hasClass("additionalSetting")) {
			toggleSidebar($(".wrapper_settings"), false, "left");
		}
	});

	$('.userWrapper').on('click', 'div[id] > #dropdown', function (e) {
		let $main = $(this).parent();

		$main.children('#sessionList').toggle();
		$(this).toggleClass('down');

		e.stopPropagation();
	});

	$('.userWrapper').on('touchstart', 'div[id] > #dropdown', function (e) {
		e.stopPropagation();
	});

	$(".userList").on("click", '.userWrapper > div[title][id]', function () {
		var targetSession = $(this).attr('id');
		privateChat(targetSession);
	});

	$(".lobby > .chat").on("click", 'div > author', function () {
		var targetSession = $(this).attr('data-user');
		privateChat(targetSession);
	});

	$("#moveUp").on("click", function () {
		$(".lobby").animate({ scrollTop: 0 }, 250);
	});

	$("#moveDown").on("click", function () {
		$(".lobby").animate({ scrollTop: $(".lobby > .chat").height() }, 250);
	});

	var downTarget;
	$("body").on("mousedown", function (e) {
		downTarget = e.target;
	});

	$("body").on("click", function (e) {
		if (e.target === downTarget) {
			if (isMobile() && $(".emoji-window").css('display') == 'block') {
				$('.openBackground').fadeOut(350, function () {
					$('.openBackground').css('opacity', '');
				});
				$(".emoji-window").addClass('close');
				setTimeout(() => {
					$(".emoji-window").removeClass('close');
					$(".emoji-window").hide();
					$(".messageBox").removeClass('fixed');
				}, 375);
			}
			else
				$(".emoji-window").hide();
		}


		$(".additional").hide();
		$("#upload").show();
		$(".textArea").removeClass("maximum");
		$("#add").removeClass("right");
		if ($("#add img").attr("src") != config.MainDomain + "/images/add.png") {
			$("#add img").attr("src", config.MainDomain + "/images/add.png");
		}
		$(".messageBox").removeClass("unhidden");
	});

	$(".emoji-window").on("click", function (e) {
		e.stopPropagation();
	});

	$("#eClose").on("click", function (e) {
		if (isMobile()) {
			$(".emoji-window").addClass('close');
			$('.openBackground').fadeOut(350, function () {
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
	$("#emojis").on("click", function (e) {
		$(".additional").hide();

		if (isMobile()) {
			$(".emoji-window #search").attr("placeholder", "尋找表情符號！");
			$(".emoji-window #search").attr("readonly", true);

			if ($(".emoji-window").css('display') == "block") {
				$(".messageBox").addClass("unhidden");
			}
			else {
				$(".messageBox").removeClass("unhidden");
			}


			$('.openBackground').css('opacity', 1);
			$('.openBackground').fadeIn(350);
			$(".messageBox").addClass('fixed');
			$(".emoji-window").show();
		}
		else {

			$(".emoji-window").toggle();
			$(".emoji-window #search").focus();
		}

		e.stopPropagation();
	});

	$(".emoji-window .eBody .eContainer").on("click", "div[data-id]", function (e) {
		var v = $('#sender').text();

		$('#sender').focus();

		let range = (lastRange === null) ? document.getSelection().getRangeAt(0) : lastRange;

		if (!$(document.getSelection().focusNode.parentElement).is('#sender') && $(document.getSelection().focusNode.parentElement).parents('#sender').length === 0) {
			range = document.getSelection().getRangeAt(0);
			let r = document.createRange();
			r.setStart(document.querySelector('#sender'), 0);
			r.setEnd(document.querySelector('#sender'), 0);
			range = r;
		}

		let text = `:${$(this).attr("data-id")}:`;

		var textBefore = v.substring(0, range.startOffset);
		var textAfter = v.substring(range.endOffset, v.length);

		if (textBefore.length > 0 && v.substr(range.startOffset - 1, 1) != " ")
			text = " " + text;
		if (textAfter.length > 0 && v.substr(range.endOffset, 1) != " ")
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

		if (!e.shiftKey) {
			$(".emoji-window").hide();
			$('.openBackground').css('opacity', '');
			$('.openBackground').css('z-index', '');
			$('.openBackground').hide();

			$(".messageBox").removeClass("unhidden");
		}

		if (e.ctrlKey && v.length === 0) {
			e = $.Event("keydown", { keyCode: 13 });
			$('#sender').trigger(e);
		}
	});

	$(".emoji-window .eHeader").on("click", "#search", function (e) {
		if (isMobile()) {
			var p = prompt("輸入要搜尋的表情符號...");

			e = $.Event("keyup");

			$("#search").val(p);
			$("#search").trigger(e);

			if ($(".textArea").hasClass("maximum"))
				$("#sender").focus();
		}
	});

	$(".channelName, .channelHeader .headerTitle").on("click", function () {
		var tempInput = document.createElement('input'),
			text = window.location.href;

		document.body.appendChild(tempInput);
		tempInput.value = text;
		tempInput.select();
		document.execCommand('copy');
		document.body.removeChild(tempInput);

		let toast = "已將房間位置複製到剪貼簿";
		if (isMobile())
			Dialog.toastMessage(toast, 'content_copy', 'green');
		else
			Dialog.success(toast);
	});

	$(".emoji-window .eBody .eContainer").on("mouseover", "div[data-id]", function () {
		var id = $(this).attr("data-id");
		$("#search").attr("placeholder", `:${id}:`);
	});

	$(".emoji-window .eBody .eContainer").on("mouseout", "div[data-id]", function () {
		$("#search").attr("placeholder", "");
	});


	$(".room").on("contextmenu", ".msgWrapper img.emojis", function () {
		return false;
	});
	$(".messageBox").on("contextmenu", "img", function () {
		return false;
	});
	$(".menu .speedMove").on("contextmenu", "img", function () {
		return false;
	});
	$("body").on("contextmenu", ".privateButton img", function () {
		return false;
	});

	$("body").on("dragstart", ".privateButton img, .msgWrapper img.emojis, .messageBox img, .menu .speedMove img", function () {
		return false;
	});

	initSetup();

	$('#userName').val(config.localStorage.getItem('username'));

	// let originalHeight = $(window).height();

	$(window).resize(function () {
		setTimeout(() => {
			onKeyEnter($('#sender'));
		}, 250);
	});

	$(window).on('popstate', function () {
		location.replace(location.href);
	});

	$(window).load(function () {
		onScroll(true);
	});

	$(window).resize(function () {
		initSettings();
	});

	$(document).ready(function () {
		initSettings()
	});

	$('#settings').on('click', function () {
		openSettings();
	});
	$('.wrapper_settings').on('click', '#onClose', function () {
		closeSettings();
	});

	$(document).on('keydown', function (e) {
		if (e.which == 27) {
			closeSettings();
		}
	});

	$(document).on("dragenter", function (e) {
		if (e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.types.indexOf("Files") !== -1) {
			if (!$(".dragHover").length) {
				$("body").append('<div class="dragHover"><div></div></div>');
				$(".dragHover").fadeIn(150);
				$(".dragHover").on("dragleave", function () {
					$(".dragHover").fadeOut(150, function () {
						$(this).remove();
					});
				});
			}

			e.preventDefault();
		}
	});
	$(document).on("dragleave", function (e) {
		if (e.target === document.querySelector('.dragHover') || e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.types.indexOf("Files") !== -1) {
			e.preventDefault();
		}
	});
	$(document).on("dragover", function (e) {
		if (e.target === document.querySelector('.dragHover') || e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.types.indexOf("Files") !== -1) {
			e.preventDefault();
		}
	});
	$(document).on("drop", function (e) {
		dropHandler(e);
		if (e.target === document.querySelector('.dragHover') || e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.types.indexOf("Files") !== -1) {
			e.preventDefault();
		}

		if ($(e.target).parents('#sender').length > 0) {
			droppedText = true;
		}
		else {
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
			if (record.type === 'childList' && record.addedNodes.length > 0) {
				record.addedNodes.forEach(node => {
					if (node.tagName != undefined && node.getAttribute('triggered') === null && node.tagName !== 'BR') {
						var target = $(node);

						target.replaceWith(function () {
							if ($(this).attr('data-paste')) {
								return '<span triggered="true" newElement="true"></span>';
							}
							else {
								let content = ($(this).attr('href') || $(this).text());
								if ($(this).hasClass('emojis') && $(this).attr('title')) {
									content = $(this).attr('title');
								}

								return '<span triggered="true" newElement="true">' + ((content?.length) ? content : '') + '</span><br/>';
							}
						});

						changed = true;
					}
				});
			}
		});

		if (changed) {
			// 防止拖曳進入的文字後方出現換行符號
			var content = $('#sender').html();
			$('#sender').html(content.replaceAll(/<br\/?>(\n)?/ig, ''));
			var elements = document.querySelectorAll('#sender span[newElement]');
			var i = 0;

			elements.forEach(e => {
				i++;
				e.removeAttribute('newElement');

				if (e.innerText.length > 0) {
					e.insertAdjacentText('beforebegin', e.innerText);
					e.innerText = '';
				}

				if (elements.length === i) {
					e.setAttribute('cursorPoint', true);
				}
				else {
					e.remove();
				}
			});

			// 移動游標位置到插入處末端
			var pointerNode = document.querySelector('#sender span[cursorPoint]');
			if (pointerNode != null) {
				setTimeout(() => {
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

					if (pointerNode.innerText.length > 0) {
						pointerNode.insertAdjacentText('beforebegin', pointerNode.innerText);
					}
					pointerNode.remove();
					onKeyEnter($('#sender'));
				}, 1);
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


	var dropHandler = function (e) {
		var fileList = e.originalEvent.dataTransfer.files;
		if (fileList.length == 0) { $(".dragHover").remove(); return; }

		uploadPrepare(fileList, false);
		$(".dragHover").fadeOut(150, function () {
			$(this).remove();
		});
	};

	$('.lobby').on('scroll', function () {
		let containerHeight = $(this).height();
		let scrollHeight = $(this).prop("scrollHeight");
		let scrollTop = $(this).scrollTop();

		let nowPost = scrollHeight - scrollTop;
		if (containerHeight > nowPost - 10) {
			config.scrollBottom = true;
		}
		else {
			config.scrollBottom = false;
		}

		if (containerHeight < nowPost - 200) {
			$("#moveDown").show();
		}
		else {
			$("#moveDown").hide();
		}

		if (nowPost + 200 < scrollHeight) {
			$("#moveUp").show();
		}
		else {
			$("#moveUp").hide();
		}
	});

	if (!isMobile() || window.innerWidth > 480) {
		$('.wrapper_settings').fadeIn(10, function () {
			$('.wrapper_settings').hide();
		});
	}

	function createDragElementsObject(target) {
		if (!dragElement[target])
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