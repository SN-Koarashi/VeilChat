"use strict";
import $ from 'jquery';
import config from '../config.js';
import { isMobile } from '../Utils/Utils.js';

export default function RegisterEvent() {
	var downTarget;

	$(".emoji-window .eBody .eContainer").on("mouseover", "div[data-id]", function () {
		var id = $(this).attr("data-id");
		$("#search").attr("placeholder", `:${id}:`);
	});

	$(".emoji-window .eBody .eContainer").on("mouseout", "div[data-id]", function () {
		$("#search").attr("placeholder", "");
	});

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
		$("body").removeClass('noOverflow');
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

		$("body").removeClass('noOverflow');
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
			$("body").addClass('noOverflow');
			$(".emoji-window").show();
		}
		else {

			$(".emoji-window").toggle();
			$(".emoji-window #search").focus();
		}

		e.stopPropagation();
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


	$(".emoji-window .eBody .eContainer").on("click", "div[data-id]", function (e) {
		var v = $('#sender').text();

		$('#sender').focus();

		let range = (config.lastRange === null) ? document.getSelection().getRangeAt(0) : config.lastRange;

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
			$("body").removeClass('noOverflow');
			$('.openBackground').css('opacity', '');
			$('.openBackground').css('z-index', '');
			$('.openBackground').hide();

			$(".messageBox").removeClass("unhidden");
		}

		if (e.ctrlKey && v.length === 0) {
			e = $.Event("keydown", { keyCode: 13, which: 13 });
			$('#sender').trigger(e);
		}
	});

	$("#search").on("keyup", function () {
		var id = $(this).val().toLocaleLowerCase();
		$(".emoji-window .eBody .eContainer div").each(function () {
			if ($(this).attr("data-id")?.toLocaleLowerCase().indexOf(id) === -1) {
				$(this).hide();
			}
			else {
				$(this).show();
			}
		});
	});
}