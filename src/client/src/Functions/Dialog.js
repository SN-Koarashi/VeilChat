"use strict";
import $ from 'jquery';
import { isMobile } from '../Utils/Utils';

var snkms = function ($) {
	// *** 內部變數區域 *** //

	var isOverflowing = false;

	// 點空白處可以關閉視窗的函數
	// @private
	function closeWindowHandler() {
		if (!isMobile() && window.innerWidth >= 480) {
			let $dom = $('.snkms-content .body-bottom #cancel');
			if ($dom.length > 0)
				$dom.click();
			else
				removeElements();
		}
	};

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
		$('.snkms-content .content-text #prompt-input').focus();

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

		if ($('body').hasClass('noOverflow')) {
			isOverflowing = true;
		}
		else {
			$('body').addClass('noOverflow');
		}

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

		$(document).on('click', closeWindowHandler);

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
		if (!isOverflowing) {
			$('body').removeClass('noOverflow');
		}

		$('.snkms-jsd-m .snkms-content').removeClass('noAnime');
		$('.snkms-jsd-m .snkms-content').addClass('close');

		// 刪除所有JSD事件
		$('body').off('click onReadValue', '.snkms-content .body-bottom #ok');
		$('body').off('click', '.snkms-content .body-bottom #cancel');
		$('body').off('click', '.snkms-content .snkms-title .close');

		$(document).off('mousemove', '.snkms-jsd-m');
		$(document).off('mouseup', '.snkms-jsd-m');
		$(document).off('mousedown', '.snkms-title');

		$(document).off('click', closeWindowHandler);
		$(window).off('keydown', keyboardEventHandler);

		// 淡出並移除元素
		$('.snkms-jsd-m').fadeOut(400, function () { $(this).remove(); });
	};

	// *** 外部變數區域 *** //
	return {
		isShownDialog: function (target) {
			const dialogElement = document.querySelector('.snkms-jsd-m');
			return $(target).parents(".snkms-jsd-m").length > 0 || target === dialogElement;
		},
		/**
		 * 手機版訊息置頂模式
		 * 
		 * @param {string} content - 對話框的內容
		 * @param {string} icon - Material 圖示
		 * @param {string} color - Material 圖示顏色
		 * @param {function} callback - 回呼函數
		 */
		topbarMessage: function (content, icon, color, callback) {
			icon = (typeof icon === 'string') ? icon : '';
			color = (typeof icon === 'string') ? ' ' + color : '';
			$('body').append('<div data-convert="false" class="toast topbar' + color + '"><i class="material-icons">' + icon + '</i><span>' + content + '</span></div>');

			$('body .toast[data-convert="false"].topbar').each(function () {
				$(this).attr('data-convert', "true");
				$(this).slideDown(200);
				$('.channelHeader').addClass('slideDown');
				$('.channelName').addClass('slideDown');
				$('.settings_title').addClass('slideDown');
				$('.userList').addClass('slideDown');
				$('.lobby>.chat').addClass('slideDown');

				setTimeout(() => {
					$(this).attr('data-readyRemove', true);

					if ($('body .toast[data-readyRemove="true"].topbar').length === $('body .toast.topbar').length) {
						$('.channelHeader').removeClass('slideDown');
						$('.channelName').removeClass('slideDown');
						$('.settings_title').removeClass('slideDown');
						$('.userList').removeClass('slideDown');
						$('.lobby>.chat').removeClass('slideDown');
					}

					$(this).slideUp(250, function () {
						$(this).remove();
						if (typeof callback === 'function') callback();
					});
				}, 3000);
			});
		},
		/**
		 * 手機版訊息浮動模式
		 * 
		 * @param {string} content - 對話框的內容
		 * @param {string} icon - Material 圖示
		 * @param {string} color - Material 圖示顏色
		 * @param {function} callback - 回呼函數
		 */
		toastMessage: function (content, icon, color, callback) {
			icon = (typeof icon === 'string') ? icon : '';
			color = (typeof icon === 'string') ? ' ' + color : '';
			$('body').append('<div data-convert="false" class="toast' + color + '"><i class="material-icons">' + icon + '</i><span>' + content + '</span></div>');

			$('body .toast[data-convert="false"]').each(function () {
				$(this).attr('data-convert', "true");
				$(this).fadeIn(200);

				setTimeout(() => {
					$(this).attr('data-readyRemove', true);

					$(this).fadeOut(250, function () {
						$(this).remove();
						if (typeof callback === 'function') callback();
					});
				}, 3000);
			});
		},
		/**
		 * popup 滑入成功提示
		 * 
		 * @param {string} content - 對話框的內容
		 * @param {function} callback - 回呼函數
		 * @param {number} [duration=3000] - 持續時間，預設為5000毫秒
		 */
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
		/**
		 * popup 滑入錯誤提示
		 * 
		 * @param {string} content - 對話框的內容
		 * @param {function} callback - 回呼函數
		 * @param {number} [duration=3000] - 持續時間，預設為5000毫秒
		 */
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
		/**
		 * 彈出視窗函數
		 * 
		 * @param {string} title - 對話框的標題
		 * @param {string} content - 對話框的內容
		 */
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
		/**
		 * 彈出確認視窗函數
		 * 
		 * @param {string} content - 對話框的內容
		 * @param {function} ok - 確認按鈕的回調函數
		 * @param {function} cancel - 取消按鈕的回調函數
		 */
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
		/**
		 * 彈出輸入視窗函數
		 * 
		 * @param {string} title - 對話框的標題
		 * @param {string} content - 對話框的內容
		 * @param {string} placeholder - 提示內容
		 * @param {function} ok - 確認按鈕的回調函數
		 * @param {function} cancel - 取消按鈕的回調函數
		 */
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
		/**
		 * 彈出下拉選單視窗函數
		 * 
		 * @param {string} title - 對話框的標題
		 * @param {string} content - 對話框的內容
		 * @param {Array<Object>} options - 額外的選項
		 * @param {string} options[].name - 選項的名稱
		 * @param {string} options[].value - 選項的值
		 * @param {boolean} hasOtherInput - 是否有其他輸入框
		 * @param {function} ok - 確認按鈕的回調函數
		 * @param {function} cancel - 取消按鈕的回調函數
		 * @param {Object} extObj - 擴展物件
		 * @param {number} extObj.defaultSelectedNumber - 預設選擇索引
		 * @param {boolean} extObj.allowDefaultSubmit - 是否允許預設值送出
		 * @param {Object} extObj.customDefault - 自訂預設顯示內容
		 * @param {string} extObj.customDefault.name - 自訂預設顯示內容名稱
		 * @param {string|null} extObj.customDefault.value - 自訂預設顯示內容值
		 */
		option: function (title, content, options, hasOtherInput, ok, cancel, extObj) {
			initializeElements(true);
			$('.snkms-title .content').text(title);
			$('.snkms-content .content-text').html(content + '<div><select id="option-input"></select></div>');
			$('.snkms-content .content-text #option-input').focus();

			const hasCustomDefault = extObj.customDefault && extObj.customDefault.name && extObj.customDefault.value !== undefined;

			if (hasCustomDefault) {
				$('.snkms-content .content-text #option-input').append(`<option value="${extObj.customDefault.value}">${extObj.customDefault.name}</option>`);
			}
			else {
				$('.snkms-content .content-text #option-input').append('<option value="DEFAULT">-</option>');
			}

			if (typeof options === 'object' && Array.isArray(options)) {
				for (let o of options) {
					if (o.value !== undefined && o.name)
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

			if (typeof hasOtherInput === 'boolean' && hasOtherInput === true || typeof hasOtherInput === 'string' && hasOtherInput.length > 0) {
				if (typeof hasOtherInput === 'string' && hasOtherInput.length > 0)
					$('.snkms-content .content-text #option-input').append('<option value="OTHER">' + hasOtherInput + '</option>');
				else
					$('.snkms-content .content-text #option-input').append('<option value="OTHER">其他</option>');

				$('.snkms-content .content-text #option-input').parent().append('<input style="display:none;" type="text" id="prompt-input" />');

				$('body').on('change', '.snkms-content .content-text #option-input', function () {
					var totalOptions = $('.snkms-content .content-text #option-input option').length;
					var selectedIndex = $('.snkms-content .content-text #option-input').prop('selectedIndex');

					if (totalOptions - 1 === selectedIndex) {
						$('.snkms-content .content-text #prompt-input').show();
						$('.snkms-content .content-text #prompt-input').focus();
					}
					else {
						$('.snkms-content .content-text #prompt-input').hide();
					}
				});
			}

			if (typeof extObj.defaultSelectedNumber === 'number') {
				let totalOptions = $('.snkms-content .content-text #option-input option').length;
				if (extObj.defaultSelectedNumber < totalOptions) {
					$('.snkms-content .content-text #option-input option').filter(function (idx) {
						return extObj.defaultSelectedNumber === idx;
					}).attr('selected', true).change();
				}
				else {
					removeElements();
					throw new Error(`The number selected by default must be less than the number of options. choose: ${extObj.defaultSelectedNumber}, maximum: ${totalOptions}`);
				}
			}


			$('body').on('click', '.snkms-content .body-bottom #ok', function () {
				var totalOptions = $('.snkms-content .content-text #option-input option').length;
				var selectedIndex = $('.snkms-content .content-text #option-input').prop('selectedIndex');

				var value = $('.snkms-content .content-text #option-input').val();
				if (!value && selectedIndex !== 0 || selectedIndex === 0 && !extObj.allowDefaultSubmit) {
					shakingWindow();
				}
				else {
					if (totalOptions - 1 === selectedIndex && $('.snkms-content .content-text #prompt-input').length > 0) {
						value = $('.snkms-content .content-text #prompt-input').val();
					}
					else if (selectedIndex === 0 && extObj.customDefault && extObj.customDefault.value === null) {
						value = null;
					}

					if (typeof value === 'string' && value.trim().length === 0) {
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