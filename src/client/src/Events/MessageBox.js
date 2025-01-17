"use strict";
import $ from 'jquery';
import config from '../config.js';
import { isMobile } from '../Utils/Utils.js';
import Dialog from '../Functions/Dialog.js';
import {
	onKeyEnter,
	uploadFiles,
	sendMessageGeneral
} from '../Utils/ChatUtils.js';

import { base64ToBlob } from '../Utils/Utils.js';

export default function RegisterEvent() {
	var lastRange = null;

	$('#sendMessage').on('click', function (e) {
		if (config.wss.readyState == 1 && $('#sender').text().replace(/\n|\r/g, "").length > 0) {
			$(this).blur();

			let outResult = sendMessageGeneral(e, $('#sender'));

			if (outResult === true) {
				$('#sender').text('');

				if ($('.textArea').hasClass("maximum")) {
					$('#sender').focus();
				}
			}

			onKeyEnter($('#sender'));
			e.stopPropagation();
		}
	});
	$('#sender').on('keydown', function (e) {
		if (e.keyCode == 13 && config.wss.readyState == 1 && $(this).text().replace(/\n|\r/g, "").length > 0) {
			if (!e.shiftKey && !isMobile()) {
				let outResult = true;
				// 使用 Markdown 語法時不送出訊息
				if ($(this).text().startsWith("```") && !$(this).text().match(/```([a-zA-Z0-9]+)?\n*([^\n][^]*?)\n*```/g) ||
					$(this).text().match(/```/g) && $(this).text().match(/```/g).length % 2 == 1
				) {
					onKeyEnter($(this));
					return;
				}
				else {
					outResult = sendMessageGeneral(e, $(this));
				}

				if (outResult === true) {
					$(this).text('');
				}
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

	$('#sender').on('focus', function () {
		setTimeout(() => {
			// 防止拖曳文字進入輸入框內時，錯誤的重設游標停頓位置
			if (lastRange !== null && !config.droppedText) {
				document.getSelection().removeAllRanges();
				document.getSelection().addRange(lastRange);
			}

			config.droppedText = false;
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
}