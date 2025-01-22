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