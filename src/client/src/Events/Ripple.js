"use strict";
import $ from 'jquery';

export default function RegisterEvent() {
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
}