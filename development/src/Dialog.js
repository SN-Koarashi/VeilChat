"use strict";
import $ from 'jquery';
import { isMobile } from './Utils';

var snkms = function ($) {
	// *** 內部變數區域 *** //

	// 關閉動畫
	// @private
	function slideOut(selector, callback) {
		$(selector).animate({ right: "15px" }, 'fast', function () {
			$(this).animate({ right: "-260px" }, 'fast', function () {
				$(this).remove();

				if (typeof callback === 'function')
					callback();

				setTimeout(() => {
					if ($('.snkms-message').children().length === 0) {
						$('.snkms-message').remove();
					}
				}, 250);
			});
		});
	};

	// 搖動動畫(未輸入內容時的提示)
	// @private
	function shakingWindow(time) {
		$('.snkms-content').addClass('shake');
		$('.snkms-content .content-text #option-input').focus();
		$('.snkms-content').removeClass('noAnime');
		setTimeout(function () {
			$('.snkms-content').removeClass('shake');
			$('.snkms-content').addClass('noAnime');
		}, (time) ? time : 350);
	};

	// 鍵盤事件
	// @private
	function keyboardEventHandler(e) {
		if (e.keyCode == 27) {
			let $dom = $('.snkms-content .body-bottom #cancel');
			if ($dom.length > 0)
				$dom.click();
			else
				removeElements();
		}
		if (e.keyCode == 13) {
			$('.snkms-content .body-bottom #ok').click();
		}
	};

	// 全域建立DOM函數
	// @private
	function initializeElements(hasCancel) {
		if ($('.snkms-jsd-m').length === 1) {
			$('.snkms-jsd-m').remove();
		}
		var DragDOM = undefined;

		$('body').addClass('noOverflow');
		$('body').append('<div class="snkms-jsd-m">');
		$('.snkms-jsd-m').append(`<div class="snkms-content">`);
		$('.snkms-content').append('<div class="snkms-title">');
		$('.snkms-title').append('<div class="close"><i class="material-icons">close</i></div>');
		$('.snkms-title').append('<div class="content">');
		$('.snkms-content').append('<div class="content-text">');
		$('.snkms-content').append('<div class="body-bottom">');

		if (hasCancel)
			$('.snkms-content .body-bottom').append('<button id="cancel" data-ripple>取消</button>');

		$('.snkms-content .body-bottom').append('<button id="ok" data-ripple>好的</button>');

		$(window).on('keydown', keyboardEventHandler);
		$('body').on('click', '.snkms-content .snkms-title .close', function () {
			let $dom = $('.snkms-content .body-bottom #cancel');
			if ($dom.length > 0)
				$dom.click();
			else
				removeElements();
		});

		$('body').on('click', '.snkms-content', function (e) {
			e.stopPropagation();
		});

		$(document).on('click', function () {
			if (!isMobile()) {
				removeElements();
			}
		});

		var clicking = false;
		var downx = 0;
		var downy = 0;
		var g_left = 0;
		var g_top = 0;

		// 滑鼠按下
		$(document).on('mousedown', '.snkms-title', function (e) {
			DragDOM = ".snkms-content";
			clicking = true;
			//設定移動後的預設位置
			//獲取div的初始位置，要注意的是需要轉整型，因為獲取到值帶px
			var left = parseInt($(DragDOM).css("left"), 10);
			var top = parseInt($(DragDOM).css("top"), 10);
			//獲取滑鼠按下時的座標，區別於下面的es.pageX,es.pageY
			downx = e.pageX;
			downy = e.pageY;

			g_left = left;
			g_top = top;

			$('body').css('user-select', 'none');
		});

		// 滑鼠放開
		$(document).on('mouseup', '.snkms-jsd-m', function () {
			clicking = false;
			$('body').css('user-select', '');
		})

		// 滑鼠移動
		$(document).on('mousemove', '.snkms-jsd-m', function (es) {
			if (clicking == false) return;
			var endx = es.pageX - downx + g_left;
			var endy = es.pageY - downy + g_top;

			$(DragDOM).css("left", endx + "px").css("top", endy + "px")
		});
	};

	// 全域移除DOM函數
	function removeElements() {
		$('body').removeClass('noOverflow');
		$('.snkms-jsd-m .snkms-content').removeClass('noAnime');
		$('.snkms-jsd-m .snkms-content').addClass('close');

		// 刪除所有JSD事件
		$('body').off('click onReadValue', '.snkms-content .body-bottom #ok');
		$('body').off('click', '.snkms-content .body-bottom #cancel');
		$('body').off('click', '.snkms-content .snkms-title .close');

		$(document).off('mousemove', '.snkms-jsd-m');
		$(document).off('mouseup', '.snkms-jsd-m');
		$(document).off('mousedown', '.snkms-title');

		$(window).unbind('keydown', keyboardEventHandler);

		// 淡出並移除元素
		$('.snkms-jsd-m').fadeOut(400, function () { $(this).remove(); });
	};

	// *** 外部變數區域 *** //
	return {
		isShownDialog: function (target) {
			return $(target).parents(".snkms-jsd-m").length > 0;
		},
		// 手機版訊息
		toastMessage: function (content, icon, color, callback) {
			icon = (typeof icon === 'string') ? icon : '';
			color = (typeof icon === 'string') ? ' ' + color : '';
			$('body').append('<div data-convert="false" class="toast' + color + '"><i class="material-icons">' + icon + '</i><span>' + content + '</span></div>');

			$('body .toast[data-convert="false"]').each(function () {
				$(this).attr('data-convert', "true");
				$(this).slideDown(200);
				$('.channelHeader').addClass('slideDown');
				$('.channelName').addClass('slideDown');
				$('.settings_title').addClass('slideDown');
				$('.userList').addClass('slideDown');

				setTimeout(() => {
					$(this).attr('data-readyRemove', true);

					if ($('body .toast[data-readyRemove="true"]').length === $('body .toast').length) {
						$('.channelHeader').removeClass('slideDown');
						$('.channelName').removeClass('slideDown');
						$('.settings_title').removeClass('slideDown');
						$('.userList').removeClass('slideDown');
					}

					$(this).slideUp(250, function () {
						$(this).remove();
						if (typeof callback === 'function') callback();
					});
				}, 3000);
				/*
				var timerToastCount = setInterval(()=>{
					if($('body .toast').length === 0){
						$('.channelHeader').removeClass('slideDown');
						$('.channelName').removeClass('slideDown');
						$('.settings_title').removeClass('slideDown');
						$('.userList').removeClass('slideDown');
						clearInterval(timerToastCount);
					}
				},100);
				*/
			});
		},
		// success 函數
		success: function (content, callback, duration) {
			duration = (duration && typeof duration === 'number') ? duration : 3000;

			if (!$('.snkms-message').length) { $('body').append('<div class="snkms-message">'); }
			$('.snkms-message').append('<div data-registered="false" class="snkms-status snkms-success">' + content + '<span></span></div>');
			$('.snkms-success[data-registered="false"]').each(function () {
				var dom = this;
				var timeout = setTimeout(function () {
					slideOut(dom, callback);
				}, duration);

				$(this).on('click', function () {
					clearTimeout(timeout);
					slideOut(dom, callback);
				});

				if (duration !== 5000)
					$(this).children('span').attr('style', `animation-duration: ${duration}ms`);

				$(this).attr('data-registered', true);
			});
		},
		// error 函數
		error: function (content, callback, duration) {
			duration = (duration && typeof duration === 'number') ? duration : 3000;

			if (!$('.snkms-message').length) { $('body').append('<div class="snkms-message">'); }
			$('.snkms-message').append('<div data-registered="false" class="snkms-status snkms-error">' + content + '<span></span></div>');
			$('.snkms-error[data-registered="false"]').each(function () {
				var dom = this;
				var timeout = setTimeout(function () {
					slideOut(dom, callback);
				}, duration);

				$(this).on('click', function () {
					clearTimeout(timeout);
					slideOut(dom, callback);
				});

				if (duration !== 5000)
					$(this).children('span').attr('style', `animation-duration: ${duration}ms`);

				$(this).attr('data-registered', true);
			});
		},
		// alert 彈出視窗函數
		alert: function (title, content) {
			initializeElements(false);
			if (!content) {
				content = title;
				title = '系統訊息';
			}
			$('.snkms-title .content').text(title);
			$('.snkms-content .content-text').html(content);

			$('body').on('click', '.snkms-content .body-bottom #ok', function () {
				removeElements();
			});
		},
		// confirm 彈出確認視窗函數
		confirm: function (content, ok, cancel) {
			initializeElements(true);
			$('.snkms-title .content').text('系統訊息');
			$('.snkms-content .content-text').html(content);


			if (ok && typeof ok === 'function')
				$('body').on('click', '.snkms-content .body-bottom #ok', ok);

			$('body').on('click', '.snkms-content .body-bottom #ok', function () {
				removeElements();
			});

			if (cancel && typeof cancel === 'function') {
				// 將函數綁定到取消按鈕以及右上角的叉叉
				$('body').on('click', '.snkms-content .body-bottom #cancel', cancel);
				$('body').on('click', '.snkms-title .close', cancel);

				$('body').on('click', '.snkms-content .body-bottom #cancel', function () {
					removeElements();
				});
			}
			else {
				$('body').on('click', '.snkms-content .body-bottom #cancel', function () {
					removeElements();
				});
			}
		},
		// prompt 彈出輸入視窗函數
		prompt: function (title, content, placeholder, ok, cancel) {
			initializeElements(true);
			$('.snkms-title .content').text(title);
			$('.snkms-content .content-text').html(content + '<div><input type="text" placeholder="' + placeholder + '" id="prompt-input" /></div>');

			setTimeout(() => {
				$('.snkms-content .content-text #prompt-input').focus();
			}, 250);

			$('body').on('click', '.snkms-content .body-bottom #ok', function () {
				var value = $('.snkms-content .content-text #prompt-input').val();
				if (!value) {
					shakingWindow();
				}
				else {
					// 觸發自訂 onReadValue 事件並傳遞輸入框內容
					$("#ok").trigger("onReadValue", [value]);
				}
			});

			if (ok && typeof ok === 'function')
				$('body').on('onReadValue', '.snkms-content .body-bottom #ok', ok);

			$('body').on('onReadValue', '.snkms-content .body-bottom #ok', function () {
				removeElements();
			});

			if (cancel && typeof cancel === 'function') {
				$('body').on('click', '.snkms-content .body-bottom #cancel', cancel);
				$('body').on('click', '.snkms-content .body-bottom #cancel', function () {
					removeElements();
				});
			}
			else {
				$('body').on('click', '.snkms-content .body-bottom #cancel', function () {
					removeElements();
				});
			}

		},
		// option 彈出下拉選單視窗函數
		option: function (title, content, options, hasOtherInput, ok, cancel, defaultSelectedNumber) {
			initializeElements(true);
			$('.snkms-title .content').text(title);
			$('.snkms-content .content-text').html(content + '<div><select id="option-input"><option value="DEFAULT">-</option></select></div>');
			$('.snkms-content .content-text #option-input').focus();

			if (typeof options === 'object' && Array.isArray(options)) {
				for (let o of options) {
					if (o.value && o.name)
						$('.snkms-content .content-text #option-input').append('<option value="' + o.value + '">' + o.name + '</option>');
					else {
						removeElements();
						throw new Error(`The option parms error:\nname: ${o.name}, value: ${o.value}`);
					}
				}
			}
			else {
				removeElements();
				throw new Error(`The option type should be array.`);
			}

			var inputCount = 1 + options.length;

			if (typeof hasOtherInput === 'boolean' && hasOtherInput === true || typeof hasOtherInput === 'string' && hasOtherInput.length > 0) {
				if (typeof hasOtherInput === 'string' && hasOtherInput.length > 0)
					$('.snkms-content .content-text #option-input').append('<option value="OTHER">' + hasOtherInput + '</option>');
				else
					$('.snkms-content .content-text #option-input').append('<option value="OTHER">其他</option>');

				$('.snkms-content .content-text #option-input').parent().append('<input style="display:none;" type="text" id="prompt-input" />');

				$('body').on('change', '.snkms-content .content-text #option-input', function () {
					if ($(this).val() === 'OTHER') {
						$('.snkms-content .content-text #prompt-input').show();
						$('.snkms-content .content-text #prompt-input').focus();
					}
					else {
						$('.snkms-content .content-text #prompt-input').hide();
					}
				});

				inputCount++;
			}

			if (typeof defaultSelectedNumber === 'number') {
				if (defaultSelectedNumber < inputCount) {
					$('.snkms-content .content-text #option-input option').filter(function (idx) {
						return defaultSelectedNumber === idx;
					}).attr('selected', true).change();
				}
				else {
					removeElements();
					throw new Error(`The number selected by default must be less than the number of options. choose: ${defaultSelectedNumber}, maximum: ${inputCount}`);
				}
			}


			$('body').on('click', '.snkms-content .body-bottom #ok', function () {
				var value = $('.snkms-content .content-text #option-input').val();
				if (!value || value === 'DEFAULT') {
					shakingWindow();
				}
				else {
					if (value === 'OTHER' && $('.snkms-content .content-text #prompt-input').length > 0 && $('.snkms-content .content-text #prompt-input').val())
						value = $('.snkms-content .content-text #prompt-input').val();

					if (value === 'OTHER' || value.trim().length === 0) {
						shakingWindow();
					}
					else {
						// 觸發自訂 onReadValue 事件並傳遞輸入框內容
						$("#ok").trigger("onReadValue", [value]);
					}
				}
			});

			if (ok && typeof ok === 'function')
				$('body').on('onReadValue', '.snkms-content .body-bottom #ok', ok);

			$('body').on('onReadValue', '.snkms-content .body-bottom #ok', function () {
				removeElements();
			});

			if (cancel && typeof cancel === 'function') {
				$('body').on('click', '.snkms-content .body-bottom #cancel', cancel);
				$('body').on('click', '.snkms-content .body-bottom #cancel', function () {
					removeElements();
				});
			}
			else {
				$('body').on('click', '.snkms-content .body-bottom #cancel', function () {
					removeElements();
				});
			}

		}
	}
}($);

export default snkms;