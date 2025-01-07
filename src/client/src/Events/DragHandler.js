"use strict";
import $ from 'jquery';
import config from '../config.js';
import {
	onKeyEnter,
	uploadPrepare
} from '../ChatUtils.js';

export default function RegisterEvent() {
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
			config.droppedText = true;
		}
		else {
			config.droppedText = false;
		}

		//e.preventDefault();
	});

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
}