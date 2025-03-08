"use strict";
import $ from 'jquery';
import Dialog from '../Functions/Dialog.js';
import { toggleSidebar, savingSettings } from '../Utils/ChatUtils.js';

export default function RegisterEvent() {
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

	// 電腦版小螢幕模擬手機版介面(不實作手勢操作，但需要可以關閉側欄)
	$(".openBackground").on("click", function (e) {
		if (e.originalEvent.pointerType === "mouse" && window.innerWidth <= 480) {
			if (parseInt($('.lobby').css('left')) < 0) {
				toggleSidebar($(".rightSide"), false, "right");
			}
			else {
				toggleSidebar($(".wrapper_settings"), false, "left");
			}
		}
	});

	$("body").on("touchstart", function (e) {
		if (isPreventTrigger(e)) return;

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

		// $('.emoji-window').css('display') == 'block';

		if (Dialog.isShownDialog(e.target))
			createDragElementsObject($(e.target).parents(".popup-content").get(0));
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
		if (isPreventTrigger(e)) return;

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
		if (Dialog.isShownDialog(e.target) && dragElement[$(e.target).parents(".popup-content")?.get(0)]) {
			let movePosition = moveEndY - dragStartY + dragElement[$(e.target).parents(".popup-content").get(0)].y;

			// 判斷是否在合理範圍，讓使用者只能在螢幕範圍內拖曳
			if (movePosition >= 0)
				$(e.target).parents(".popup-content").css('top', movePosition + 'px');
			else
				$(e.target).parents(".popup-content").css('top', '0px');

			$(e.target).parents(".popup-content").removeClass('hasAnime');
		}
	});

	$("body").on("touchend", function (e) {
		if (isPreventTrigger(e)) return;

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
			$(this).removeClass("noSwipe");
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
					$("#userName").trigger('blur');
					savingSettings();
				}
			}
		}

		// 對話框手勢操作
		if (Math.abs(X) < 150 && Y > 35 && !touchStaying && Dialog.isShownDialog(e.target)) {
			$('.popup-content .popup-title .close').trigger('click');
		}
		else if (Dialog.isShownDialog(e.target) && dragElement[$(e.target).parents(".popup-content")?.get(0)]) {
			if (parseInt($(e.target).parents(".popup-content").css('top')) > $(document).height() / 2.5) {
				$('.popup-content .popup-title .close').trigger('click');
			}
			else {
				$(e.target).parents(".popup-content").css('top', '0px');
			}

			$(e.target).parents(".popup-content").addClass('hasAnime');
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

	function isPreventTrigger(e) {
		if (
			e.originalEvent.touches.length > 1 ||
			$(e.originalEvent.target).parents('.messageBox,.channelHeader').length > 0
		) return true;

		if (
			$(e.originalEvent.target).parents('.openBackground').length > 0 &&
			$(e.originalEvent.target).tagName() === 'span'
		) return true;

		return false;
	}
}