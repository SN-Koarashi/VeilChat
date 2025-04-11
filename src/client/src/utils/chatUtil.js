"use strict";
//? 這裡是屬於有與前端互動或呼叫前端元素的公用程式

import $ from 'jquery';
import config from '../config.js';
import { crc32, isMobile, escapeHtml, checkImageURL, randomASCIICode, getPlainMessage, getFileCleanerTagFormat, copyTextToClipboard } from './util.js';
import Logger from '../functions/logger.js';
import Dialog from '../functions/dialog.js';
import { WebSocketBinaryHandler } from '../registers/websocket.js';
import { hashString } from '../functions/crypto.js';

export function emojify(text) {
	const emojiRegex = /\[emoji\]:([0-9A-Za-z_]+):\[\/emoji\]/ig;
	return text.replace(emojiRegex, function (match, id, index, string) {
		let pixel = (window.devicePixelRatio == 1) ? 48 : (devicePixelRatio == 2) ? 96 : 128;
		let size = "large";
		let checker = string.replace(emojiRegex, "").trim();
		if (checker.length > 0)
			size = "small";


		// return `<div title=":${id}:" data-id="${id}" class="emojis ${size}"><span style="--emoji-url: url(${window.emojis[id]}?size=${pixel})"></span></div>`;
		return `<div title=":${id}:" data-id="${id}" class="emojis ${size}"><img src="${window.emojis[id]}?size=${pixel}" crossorigin="anonymous" alt="emojis" loading="lazy" /></div>`;
	});
}

export function parseInviteLink(text) {
	const inviteRegex = /\[inviteURL=(.*?)\](.*?)\[\/inviteURL\]/g;
	return text.replace(inviteRegex, function (matched, word, inviteCode) {
		let notice = (config.locate == inviteCode) ? "已加入" : "加入";
		return '<a class="inviteLink" target="_self" href="' + word + inviteCode + '" data-room="' + inviteCode + '">邀請您加入 #房間 ' + inviteCode + '<span>' + notice + '</span></a>';
	});
}

export function parseInviteCode(text) {
	const inviteRegex = /\[invite\]([0-9A-Za-z\-_]+)\[\/invite\]/g;
	return text.replace(inviteRegex, function (matched, inviteCode) {
		let notice = (config.locate == inviteCode) ? "已加入" : "加入";
		let word = `${config.MainDomain}/p/${inviteCode}`;
		return '<a class="inviteLink" target="_self" href="' + word + '" data-room="' + inviteCode + '">邀請您加入 #房間 ' + inviteCode + '<span>' + notice + '</span></a>';
	});
}

export function urlify(text) {
	const mediaList = {
		mp4: "video/mp4",
		webm: "video/webm",
		ogg: "audio/ogg",
		mp3: "audio/mpeg",
		wav: "audio/wav"
	};

	const urlRegex = /\[url\](https?:\/\/[^\s]+)\[\/url\]/g;
	return text.replace(urlRegex, function (matched, matchSub) {

		// if (matchSub.startsWith(config.CDNRedirect)) {
		// 	let url = new URL(matchSub);
		// 	matchSub = config.CDNServer + '/' + url.pathname.split('/').slice(2).join('/');
		// }

		if (checkImageURL(matchSub)) {
			let nowID = crc32(new Date().getTime().toString() + matchSub);
			var tryTime = 0;
			var wait = setInterval(() => {
				try {
					var $jElement = $('img[data-id="' + nowID + '"]');
					var w = $jElement[0].naturalWidth,
						h = $jElement[0].naturalHeight;
					if ($jElement.length && w && h) {
						onScroll(config.scrollBottom);
						clearInterval(wait);
					}

					if (Math.abs($jElement.offset().top) > $(".lobby").height() - 150)
						clearInterval(wait);

					if (tryTime > 35 && !w && !h)
						clearInterval(wait);

					tryTime++;
				}
				catch (error) {
					Logger.show(Logger.Types.ERROR, error);
					clearInterval(wait);
				}
			}, 30);

			return '<div><a target="_blank" href="' + matchSub + '"><img loading="lazy" data-id="' + nowID + '" src="' + matchSub + '" /></a></div>';
		}
		else if (matchSub.startsWith(`https://${location.hostname}/p/`)) {
			return '[invite]' + matchSub.match(/([0-9a-zA-Z-]+)$/ig).join() + '[/invite]';
		}
		//else if(matchSub.startsWith(`${CDNServer}/files/`) && mediaList[matchSub.split(".").at(-1)]
		else if (matchSub.startsWith(`https://`) && mediaList[matchSub.split(".").at(-1)]) {
			return `<${mediaList[matchSub.split(".").at(-1)].split("/")[0]} onloadeddata="$(document).trigger('medialoaded');" controls><source src="${matchSub}" type="${mediaList[matchSub.split(".").at(-1)]}"></${mediaList[matchSub.split(".").at(-1)].split("/")[0]}>`;
		}
		else if (matchSub.startsWith(`${config.CDNServer}/files/`)) {
			let timeID = new Date().getTime();

			// 防止一次傳送太多請求，僅當下載框進入瀏覽器可見視窗內後才觸發載入(而且元素要待在可見視窗內至少650毫秒)
			const localObserver = new IntersectionObserver((entries) => {
				entries.forEach((entry) => {
					if (entry.isIntersecting) {
						config.globalObserverTimer[timeID] = setTimeout(() => {
							$.ajax({
								url: matchSub,
								cache: false,
								type: 'HEAD',
								error: function () {
									$(`.${crc32(matchSub)}[data-id="${timeID}"]`).parent().next().removeAttr("href");
									$(`.${crc32(matchSub)}[data-id="${timeID}"]`).css("color", "#ff6d6d");
									$(`.${crc32(matchSub)}[data-id="${timeID}"]`).text("ERROR");
								},
								success: function (response, status, xhr) {
									let fileSize = xhr.getResponseHeader("Content-Length");
									$(`.${crc32(matchSub)}[data-id="${timeID}"] > span`).text(SizeFormatter(fileSize));

									let format = getFileCleanerTagFormat(fileSize);
									let tips = `由於伺服器資源有限，該檔案為${format.priority}優先度，將在${format.date}後自動刪除。`;

									$(`.${crc32(matchSub)}[data-id="${timeID}"] > span`).prepend(`<span class="fileRecycleAlert ${format.color}"></span>`);
									$(`.${crc32(matchSub)}[data-id="${timeID}"]`).attr('title', tips);

									$('body').on('click', `.${crc32(matchSub)}[data-id="${timeID}"] .fileRecycleAlert`, function (e) {
										e.stopPropagation();
										Dialog.alert(tips);
									});
								}
							});
							localObserver.disconnect();
							delete config.globalObserverTimer[timeID];
						}, 650);
					}
					else {
						clearTimeout(config.globalObserverTimer[timeID]);
						delete config.globalObserverTimer[timeID];
					}
				});
			}, {
				root: document.querySelector(".lobby"),
				rootMargin: "0px",
				threshold: 1
			});

			let localTimer = setInterval(() => {
				if ($(`.${crc32(matchSub)}[data-id="${timeID}"]`).length > 0) {
					clearInterval(localTimer);
					localObserver.observe($(`.${crc32(matchSub)}[data-id="${timeID}"]`)[0]);
				}
			}, 250);

			let url = new URL(matchSub);

			// let CDNReplacement = config.CDNRedirect + url.pathname + url.search;

			let filename = matchSub.split("/").at(-1);
			if (url.search.length > 0 && url.searchParams.get('fileName')) {
				filename = url.searchParams.get('fileName');
			}

			return `<div class="file"><span><a class="linkName" href="${matchSub}" title="${filename}" class="filename">${filename}</a><br/><span data-id="${timeID}" class="${crc32(matchSub)}"><span>-</span></span></span><a target="_blank" href="${matchSub}&download=true" class="linkButton" title="下載 ${filename}"><img src="/assets/images/download.png" /></a></div>`;
		}
		else if (matchSub.match(/^https?:\/\/(www\.youtube\.com\/watch\?[^\s]+|youtu\.be\/[0-9a-zA-Z\-_]{11})/ig)) {
			let videoCode = "";
			if (matchSub.match(/^https?:\/\/(youtu\.be\/[0-9a-zA-Z\-_]{11})/ig)) {
				videoCode = matchSub.split("/").at(-1).split("?")[0];
			}
			else {
				videoCode = matchSub.match(/v=([0-9a-zA-Z\-_]+)/ig)[0].split("=").at(-1);
			}

			let time = (matchSub.match(/t=([0-9]+)/ig)) ? matchSub.match(/t=([0-9]+)/ig)[0].split("=").at(-1) : 0;
			let timestamp = (time > 0) ? '?start=' + time : "";

			return `<iframe class="youtube" src="https://www.youtube.com/embed/${videoCode}${timestamp}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
		}
		else {
			let windowAction = (matchSub.match(new RegExp(`^${process.env.APP_URL}`, 'gi'))) ? "_self" : "_blank";
			return '<a target="' + windowAction + '" href="' + matchSub + '">' + matchSub + '</a>';
		}
	})
}

export function parseCodeArea(text) {
	const codeRegex = /\[code(=[0-9a-z]+)?\]([^\n][^]*?)\[\/code\]/ig;
	return text.replace(codeRegex, function (matched, lang, code) {
		const preTag = `<pre spellcheck="false" autocorrect="off" autocapitalize="off" translate="no">`;
		if (lang) {
			lang = lang.substring(1);
			return `${preTag}<code class="language-${lang}">${code}</code></pre>`;
		}
		else
			return `${preTag}<code>${code}</code></pre>`;
	});
}

export function ParseBBCode(text) {
	const PrivateRoomURL = config.MainDomain + "/p/";
	const codeRegex = /```([a-z0-9]+)?\n\n*([^\n][^]*?)\n*```/ig;
	const emojiRegex = /:([0-9A-Za-z_]+):/ig;
	const urlRegex = /(https?:\/\/[^\s]+)/g;

	text = text.replace(emojiRegex, (m, w) => {
		return `[emoji]:${w.trim()}:[/emoji]`;
	});
	text = text.replace(urlRegex, (m, w) => {
		if (w.trim().startsWith(PrivateRoomURL)) {
			let inviteCode = w.trim().split("/").filter(r => r.length > 0).at(-1);
			return `[inviteURL=${PrivateRoomURL}]${inviteCode.trim()}[/inviteURL]`;
		}
		else {
			return `[url]${w.trim()}[/url]`;
		}
	});
	text = text.replace(codeRegex, (m, lang, w) => {
		w = w.trim().replace(/\[([a-z]+)\]([^\s]+)\[\/([a-z]+)\]/g, (sm, a, b, c) => {
			if (a === c) {
				return b;
			}
			else {
				return sm;
			}
		});
		w = w.trim().replace(/\[([a-z]+)(=)([^\s]+)\]([^\s]+)\[\/([a-z]+)\]/ig, (sm, a, b, c, d, e) => {
			if (a === e) {
				return `${c}${d}`;
			}
			else {
				return sm;
			}
		});

		const language = [
			"diff",
			"sql",
			"csharp",
			"cs",
			"c",
			"cpp",
			"cc",
			"css",
			"html",
			"xml",
			"xhtml",
			"rss",
			"atom",
			"svg",
			"json",
			"js",
			"javascript",
			"java",
			"dos",
			"bat",
			"cmd",
			"dart",
			"cmake",
			"basic",
			"bbcode",
			"bash",
			"sh",
			"zsh",
			"nginx",
			"php",
			"perl",
			"pl",
			"pm",
			"python",
			"py",
			"gyp",
			"ruby",
			"rb",
			"scss",
			"shell",
			"vbnet",
			"vb",
			"vba",
			"vbscript",
			"vbs",
			"go",
			"kotlin",
			"yaml"
		];

		if (lang && language.includes(lang) && w.trim().length > 0)
			return `[code=${lang}]${w.trim()}[/code]`;
		else if (lang)
			return `[code]${lang}${w.trim()}[/code]`;
		else
			return `[code]${w.trim()}[/code]`;
	});

	return text;
}

export function toggleSidebar($element, flag, openDirection, force) {
	if (window.innerWidth > 480 && force !== true) return;

	if (flag) {
		//$element.css(openDirection,"5px");
		$("#sender").trigger('blur');
		$element.attr("data-open", true);
		$element.css(openDirection, '');
		$element.addClass('hasAnime');

		$(".lobby, #container, .channelHeader").css(openDirection, '');
		$(".lobby > .menu").css('right', '');

		$('body').addClass("noOverflow");
		$(".channelHeader, #container, .lobby, .lobby > .menu").addClass("hasAnime");
		$(".lobby").addClass("inHidden");
		$(".messageBox #container").addClass("inHidden");
		$(".lobby").addClass(openDirection);
		$(".lobby > .menu").addClass(openDirection);
		$(".channelHeader").addClass(openDirection);
		$(".messageBox #container").addClass(openDirection);
		$(".openBackground").fadeIn(250, function () {
			$(this).addClass('hasAnime');
			$(this).css('opacity', 1);
		});
		//$(".menu").fadeOut(250);
	}
	else {
		//$element.css(openDirection,"-100vw");
		$element.removeAttr("data-open");
		$element.css(openDirection, '');

		$(".lobby, #container, .channelHeader").css(openDirection, '');
		$(".lobby > .menu").css('right', '');

		$('body').removeClass("noOverflow");
		$(".lobby").removeClass("inHidden");
		$(".messageBox #container").removeClass("inHidden");
		$(".lobby").removeClass(openDirection);
		$(".lobby > .menu").removeClass(openDirection);
		$(".channelHeader").removeClass(openDirection);
		$(".messageBox #container").removeClass(openDirection);
		$(".openBackground").fadeOut(250, function () {
			$(".channelHeader").removeClass("hasAnime");
			$(this).removeClass('hasAnime');
			$(this).css('opacity', 0);
		});

		//$(".menu").fadeIn(250);
	}
}

export function privateChat(targetSignature, message, previousLocate) {
	if (!config.clientList[targetSignature]) {
		let toast = "使用者不在這個房間";
		if (isMobile())
			Dialog.toastMessage(toast, 'close', 'red');
		else
			Dialog.error(toast);
		return;
	}

	if (targetSignature == config.tokenHashSelf) {
		let toast = "不要對自己說悄悄話";
		if (isMobile())
			Dialog.toastMessage(toast, 'close', 'red');
		else
			Dialog.error(toast);
		return;
	}

	if (message) {
		WebSocketBinaryHandler({
			type: 'privateMessage',
			signature: targetSignature,
			message: {
				original: message
			},
			location: previousLocate ?? config.locate // 有攜帶前一房間位置的話就使用前一房間位置 (通常發生於建立私人房間的同時透過UI邀請對象)
		});

		onMessage("privateMessageSource", "private", targetSignature, config.clientList[targetSignature]?.at(0).username, config.crypto.randomUUID(), message, new Date().getTime());
	}
	else {
		// 若成功啟動悄悄話模式，則關閉側邊欄
		if ($('.rightSide[data-open="true"]').length) {
			toggleSidebar($(".rightSide"), false, 'right');
		}

		config.privateChatTarget = targetSignature;
		$('.privateStatus').remove();
		$('.lobby').append('<div class="privateStatus"><div class="privateText">悄悄話 <span></span></div><div title="關閉悄悄話模式" class="privateButton"><img src="' + config.MainDomain + '/assets/images/close_black.png" /></div></div>');
		$('.lobby > .privateStatus > .privateText > span').text(`${config.clientList[targetSignature]?.at(0).username}#${crc32(targetSignature)}`);

		$('#sender').trigger('focus');
	}
}

export function compressImagePromise(file, flag) {
	return new Promise((resolve, reject) => {
		if (file.type.startsWith("image/")) {
			// 超過 512 KiB 時啟動壓縮
			if (file.size > 524288 || flag) {
				Logger.show(Logger.Types.LOG, "[CompressionHandlerPromise]", file.name, "Starting reader...");
				var reader = new FileReader();
				reader.onload = function (event) {
					let imageURL = event.target.result;
					let newImg = new Image();
					newImg.onload = function () {
						Logger.show(Logger.Types.LOG, "[CompressionHandlerPromise]", file.name, "Starting compressing...", "Quality:", 0.75);
						let cvs = document.createElement('canvas');
						let ctx = cvs.getContext('2d');
						cvs.width = newImg.naturalWidth;
						cvs.height = newImg.naturalHeight;
						ctx.drawImage(newImg, 0, 0, newImg.naturalWidth, newImg.naturalHeight, 0, 0, cvs.width, cvs.height);

						// const convertType = (file.type.toLowerCase().endsWith("gif")) ? 'image/jpeg' : file.type;
						cvs.toBlob(function (blob) {
							Logger.show(Logger.Types.LOG, "[CompressionHandlerPromise]", file.name, "Compressed.");
							const compressedFile = new File([blob], `${file.name.replaceAll(/(png|gif|jpg|jpeg|webp)$/ig, 'webp')}`, { type: 'image/webp' });
							resolve(compressedFile);
						}, 'image/webp', 0.75);
					};

					newImg.src = imageURL;
				};
				reader.onerror = function () {
					reject("[CompressionHandlerPromise] There was an issue reading the file. " + reader.error);
				};
				reader.readAsDataURL(file);
			}
			else {
				Logger.show(Logger.Types.LOG, "[CompressionHandlerPromise]", file.name, "has less than 6MB, skipping...");
				resolve(file);
			}
		}
		else {
			Logger.show(Logger.Types.LOG, "[CompressionHandlerPromise]", file.name, "is not a image.");
			resolve(file);
		}
	});
}

export async function prepareCompressImage(files) {
	$("#progress").css('background', 'red');
	$("#circle").addClass('red');
	$("#circle").show();

	let showCompressingMessage = false;
	let newFiles = new Array();
	let k = 0;
	for (let file of files) {
		if (file.type.startsWith("image/")) {
			if (!showCompressingMessage) {
				let toast = "正在執行本機壓縮處理程序...";
				if (isMobile())
					Dialog.toastMessage(toast, 'loop', 'green');
				else
					Dialog.success(toast);

				showCompressingMessage = true;
			}

			const compressedFile = await compressImagePromise(file, false);
			newFiles.push(compressedFile);
			k++;

			$("#progress").css('width', ((k / files.length) * 100) + "%");
		}
		else {
			newFiles.push(file);
			k++;
		}
	}

	$("#progress").removeAttr('style');
	$("#circle").removeClass('red');
	$("#circle").hide();

	let fileSizeTotal = 0;
	for (let file of newFiles) {
		// 只判斷圖片要不要壓縮
		if (file.type.startsWith("image/")) {
			fileSizeTotal += file.size;
		}
	}

	if (fileSizeTotal > 8388608) {
		Logger.show(Logger.Types.LOG, "[CompressionHandler]", newFiles.length, "file(s) too large, now restarting to force compression...");

		let toast = "壓縮後的大小總和過大，正在重新執行...";
		if (isMobile())
			Dialog.toastMessage(toast, 'close', 'red');
		else
			Dialog.error(toast);
		let newFilesInFor = new Array();

		for (let file of newFiles) {
			newFilesInFor.push(await compressImagePromise(file, true));
		}

		return newFilesInFor;
	}
	else {
		Logger.show(Logger.Types.LOG, "[CompressionHandler]", newFiles.length, "file(s) preparing to upload.");
		return Array.from(newFiles);
	}
}

export async function uploadPrepare(files) {
	var cancel = false;
	var totalSize = 0;
	for (let file of files) {
		totalSize += file.size;

		// 超過512MB要取消上傳事件
		if (file.size > 536870912) cancel = true;
	}

	// 舊版8MB
	// 新版5GB
	if (totalSize > 5368709120) {
		let toast = "上傳的檔案總和不得超過5GB";
		if (isMobile())
			Dialog.toastMessage(toast, 'close', 'red');
		else
			Dialog.error(toast);
	}
	else if (files.length > 10) {
		let toast = "單次上傳數量不得超過10個檔案";
		if (isMobile())
			Dialog.toastMessage(toast, 'close', 'red');
		else
			Dialog.error(toast);
	}
	else {
		// 執行圖片壓縮函數，判斷是否有圖片/是否需要壓縮
		const newFiles = await prepareCompressImage(files);

		if (!cancel && totalSize > 0 && files.length > 0)
			uploadFiles(newFiles);
		else {
			let toast = cancel ? "單一檔案上傳大小必須小於512MB" : "無法上傳檔案";
			if (isMobile())
				Dialog.toastMessage(toast, 'close', 'red');
			else
				Dialog.error(toast);
		}
	}

	$("#fileUpload").val('');
}

export function uploadFiles(files) {
	var fd = new FormData();
	for (let file of files) {
		fd.append('fileUpload[]', file);
	}
	fd.append('submit', true);

	$.ajax({
		url: config.CDNServer + '/files/upload',
		cache: false,
		processData: false,
		contentType: false,
		dataType: 'json',
		type: 'POST',
		data: fd,
		error: function (xhr) {
			Logger.show(Logger.Types.LOG, xhr.responseText);
			let toast = "上傳失敗: " + xhr?.responseJSON?.message;
			if (isMobile())
				Dialog.toastMessage(toast, 'close', 'red');
			else
				Dialog.error(toast);
			$('#fileUpload').val('');
		},
		xhr: function () {
			var xhr = new window.XMLHttpRequest();
			if (xhr.upload) {
				xhr.upload.addEventListener('progress', function (e) {
					if (e.lengthComputable) {
						var percent = Math.floor(e.loaded / e.total * 10000) / 100;

						if (percent <= 100) {
							$('#progress').css('width', percent + "%");
							$("#circle").show();
						}
						if (percent >= 100) {
							let toast = "正在處理...";
							if (isMobile())
								Dialog.toastMessage(toast, 'backup', 'green');
							else
								Dialog.success(toast);
							$("#circle").hide();
							$("#progress").addClass("done");
							setTimeout(function () {
								$("#progress").removeClass("done");
								$("#progress").removeAttr('style');
							}, 1000);
						}
					}
				}, false);
			}

			return xhr;
		},
		success: function (response) {

			$('#fileUpload').val('');

			if (typeof response === 'object' && response != null) {
				$("#progress").removeAttr('style');
				$("#circle").removeClass('red');
				$("#circle").hide();

				let toast = "上傳成功";
				if (isMobile())
					Dialog.toastMessage(toast, 'cloud_done', 'green');
				else
					Dialog.success(toast);

				let message = new Array();
				for (let o in response) {
					message.push(response[o].url);
				}

				// 若是悄悄話模式，以悄悄話傳送檔案網址
				if (config.privateChatTarget?.length > 0) {
					WebSocketBinaryHandler({
						type: 'privateMessage',
						signature: config.privateChatTarget,
						message: {
							original: message.join(' ')
						},
						location: config.locate
					});

					onMessage("privateMessageSource", "private", config.privateChatTarget, config.clientList[config.privateChatTarget]?.at(0).username, config.crypto.randomUUID(), message.join(' '), new Date().getTime());
				}
				else {
					WebSocketBinaryHandler({
						type: 'message',
						location: config.locate,
						message: {
							original: message.join(' ')
						}
					});
				}
			}
			else {
				let toast = "發生不明錯誤";
				if (isMobile())
					Dialog.toastMessage(toast, 'close', 'red');
				else
					Dialog.error(toast);
				Logger.show(Logger.Types.LOG, response);
			}
		}
	});
}

export function onKeyEnter(ele) {
	setTimeout(() => {
		$('.messageBox').css('height', $(ele).prop('scrollHeight') + 20 + "px");

		if (isMobile())
			$('.room').css('height', $(window).height() - $('.messageBox').height() - 20);
		else {
			$('.room').css('height', `calc(100vh - ${$('.messageBox').height() + 20}px)`);
			$('.emoji-window').css('bottom', `${$('.messageBox').height() + 15}px`);
		}

		if (config.privateChatTarget?.length > 0) {
			$('.lobby > .menu').css('bottom', `${$('.messageBox').height() + 70}px`);
		}
		else {
			$('.lobby > .menu').css('bottom', `${$('.messageBox').height() + 30}px`);
		}

		onScroll(false);
	}, 5);
}

export function openSettings() {
	if (isMobile() && window.innerWidth <= 480) {
		toggleSidebar($(".wrapper_settings"), true, "left");
	}
	else {
		$('.openBackground').fadeIn(25, function () {
			$(".wrapper_settings").show();
			$(".wrapper_settings").animate({
				opacity: 1,
				width: "105vw",
				height: "105vh"
			}, 150, function () {
				$(".wrapper_settings").animate({
					width: "100vw",
					height: (isMobile()) ? "75vh" : "100vh"
				}, 100, function () {// Animation complete.
				});
			});
		});
	}
}

// export function closeSettings() {
// 	if ($('.wrapper_settings').css('display') == 'none')
// 		return;

// 	$(".wrapper_settings").animate({
// 		width: "105vw",
// 		height: "105vh"
// 	}, 100, function () {
// 		$(".wrapper_settings").animate({
// 			opacity: 0,
// 			width: "0vw",
// 			height: "0vh"
// 		}, 150, function () {
// 			$('.openBackground').fadeOut(25);
// 			$(".wrapper_settings").hide();
// 		});
// 	});


// 	savingSettings();
// }

export function savingSettings() {
	if (config.localStorage.getItem('username') != $('#userName').val()) {
		config.userName = $('#userName').val();
		WebSocketBinaryHandler({
			type: "refresh",
			location: config.locate,
			username: config.userName,
			session: config.sessionSelf
		});
	}

	config.localStorage.setItem('username', $('#userName').val());
}

export async function onMessage(messageType, session, signature, username, message_id, messageObj, timestamp, obj) {
	var message = await getPlainMessage(messageObj);

	let date = new Date(timestamp);
	let year = date.getFullYear();
	let month = (date.getMonth() + 1 < 10) ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
	let day = (date.getDate() < 10) ? '0' + date.getDate() : date.getDate();
	let hour = (date.getHours() < 10) ? '0' + date.getHours() : date.getHours();
	let minute = (date.getMinutes() < 10) ? '0' + date.getMinutes() : date.getMinutes();
	let randomSeed = randomASCIICode(18);

	while ($('.lobby > .chat div[data-id="T' + randomSeed + '"]').length > 0) {
		randomSeed = randomASCIICode(18);
	}

	if (messageType.startsWith("privateMessage")) {
		let sourceText = "[悄悄話]";
		if (messageType.endsWith("Source"))
			sourceText = "[發送給]";

		$('.lobby > .chat').append(`<div data-id="T${randomSeed}" data-message-id="${message_id}" data-ripple><author data-id="${session}" data-user="${signature}" title="${username}#${crc32(signature)}" class="private">${sourceText} ${username}#${crc32(signature)}</author> <span class="tips" title="${year}/${month}/${day} ${hour}:${minute}">${DateFormatter(timestamp)}</span><div data-convert="true" class="msgWrapper"></div></div>`);
	}
	else {
		$('.lobby > .chat').append(`<div data-id="T${randomSeed}" data-message-id="${message_id}" data-ripple><author data-id="${session}" data-user="${signature}" data-self-id="${crc32(signature)}" class="${session}" title="${username}#${crc32(signature)}">${username}#${crc32(signature)}</author> <span class="tips" title="${year}/${month}/${day} ${hour}:${minute}">${DateFormatter(timestamp)}</span><div data-convert="true" class="msgWrapper"></div></div>`);
	}

	config.messageList[message_id] = {
		type: messageType,
		message,
		author: signature
	};

	// 將訊息內容放入
	$('.lobby > .chat div[data-id="T' + randomSeed + '"]').find('div.msgWrapper').text(message);
	if (obj != null && obj.is_edited && obj.edited_timestamp) {
		$('.lobby > .chat div[data-id="T' + randomSeed + '"] > .msgWrapper').before(`<span class="tips edited" title="${new Date(obj.edited_timestamp).toLocaleString()}">(已編輯)</span>`);
	}


	var messageArray = $('.lobby > .chat div.msgWrapper[data-convert="true"]').toArray();
	for (let msg of messageArray) {
		executeFormattedMessage(msg);
	}

	$('.lobby > .chat').find(`.${config.sessionSelf}`).addClass('me');

	if (config.clientList[config.tokenHashSelf] && !$('.lobby > .chat').find(`author[data-self-id="${crc32(config.tokenHashSelf)}"]`).hasClass('me'))
		$('.lobby > .chat').find(`author[data-self-id="${crc32(config.tokenHashSelf)}"]`).addClass('sameWorker');

	onScroll(messageType == "history");
}

export function executeFormattedMessage(element) {
	let content = $(element).text();
	let formatterContent = ContentFormatter(content);

	$(element).html(formatterContent);

	if ('hljs' in window) {
		$(element).find("pre code").each(function () {
			$(this).after('<img title="複製程式碼區塊內容" src="/assets/images/copy.png" />');
			$(this).next().on('click', function () {
				let element = this;

				$(element).attr('src', '/assets/images/check.png');

				copyTextToClipboard($(this).prev().text());

				setTimeout(() => {
					$(element).attr('src', '/assets/images/copy.png');
				}, 1500);
			});

			window.hljs.highlightElement(this);
		});
	}

	$(element).removeAttr('data-convert');
}

export function DateFormatter(timestamp) {
	let date = new Date(timestamp);
	let year = date.getFullYear();
	let month = (date.getMonth() + 1 < 10) ? '0' + (date.getMonth() + 1) : date.getMonth() + 1;
	let day = (date.getDate() < 10) ? '0' + date.getDate() : date.getDate();
	let hour = (date.getHours() < 10) ? '0' + date.getHours() : date.getHours();
	let minute = (date.getMinutes() < 10) ? '0' + date.getMinutes() : date.getMinutes();

	let dateLineTimestamp = new Date((Math.floor((new Date().getTime() - (new Date().getTimezoneOffset() / 60 * 3600000)) / 86400000) * 86400000) + (new Date().getTimezoneOffset() / 60 * 3600000));
	let diffTime = new Date(timestamp).getTime() / 1000 - new Date(dateLineTimestamp).getTime() / 1000;

	if (diffTime >= 0) {
		return `今天 ${hour}:${minute}`;
	}
	else if (diffTime < 0 && diffTime >= -86400) {
		return `昨天 ${hour}:${minute}`;
	}
	else if (diffTime < -86400 && diffTime >= -172800) {
		return `前天 ${hour}:${minute}`;
	}
	else {
		return `${year}/${month}/${day}`;
	}
}

export function ContentFormatter(text) {
	text = ParseBBCode(text); // 將表情及網址關鍵字轉換為BBCode
	text = escapeHtml(text); // 跳脫HTML字串
	text = urlify(text); // 將網址依規則作特定處理
	text = parseInviteLink(text); // 轉換邀請碼網址為樣式卡
	text = parseInviteCode(text); // 轉換邀請碼為樣式卡
	text = emojify(text); // 轉換表情符號
	text = parseCodeArea(text); // 程式碼區塊

	return text;
}

export function SizeFormatter(size) {
	if (size > 1048576)
		return (Math.round(size / 1024 / 1024 * 100) / 100) + " MB";
	else if (size > 1024)
		return (Math.round(size / 1024 * 100) / 100) + " KB";
	else
		return size + " Bytes";
}

export async function passwordVerify(location) {
	Dialog.prompt("密碼認證", `進入房間 #${location} 需要輸入密碼`, "", function (evt, value) {
		config.roomPassword = value;

		hashString(value).then(pwd => {
			WebSocketBinaryHandler({
				type: 'login',
				token: config.token,
				username: config.userName,
				location: location,
				password: pwd
			});
		});
	}, function () {
		config.roomPassword = undefined;
		WebSocketBinaryHandler({
			type: 'login',
			token: config.token,
			username: config.userName,
			location: "public"
		});

		let toast = "您已離開房間並回到大廳";
		if (isMobile())
			Dialog.toastMessage(toast, 'logout', 'red');
		else
			Dialog.error(toast);
	});
}

export function onScroll(force) {
	let scrollHeight = $('.lobby > .chat').prop("scrollHeight");
	let scrollTop = $('.lobby > .chat').scrollTop();

	let nowPost = scrollHeight - scrollTop;

	if (nowPost < 700 || force || config.scrollBottom) {
		$('.lobby').scrollTop(scrollHeight);
	}

	if ($('.lobby > .chat').height() > $('.lobby').height())
		$("#moveUp").show();
	else
		$("#moveUp").hide();
}

export function sendMessageGeneral(e, $element) {
	if ($('#sender').text().length > 8192) {
		var blobData = new Blob([$('#sender').text()], {
			type: 'text/plain'
		});
		var file = new File([blobData], "message.txt");

		uploadFiles([file]);
	}
	else if (config.privateChatTarget?.length > 0) {
		var targetSignature = config.privateChatTarget;
		var message = $element.text();

		if (!config.clientList[targetSignature]) {
			let toast = "該使用者工作階段不存在";
			if (isMobile())
				Dialog.toastMessage(toast, 'close', 'red');
			else
				Dialog.error(toast);

			// config.privateChatTarget = null;
			$('body .privateStatus .privateButton').trigger('click');

			e.preventDefault();
			return false;
		}
		else {
			if (message.trim().length == 0) {
				let toast = "請輸入訊息內容";
				if (isMobile())
					Dialog.toastMessage(toast, 'close', 'red');
				else
					Dialog.error(toast);
				e.preventDefault();
				return false;
			}

			WebSocketBinaryHandler({
				type: 'privateMessage',
				signature: targetSignature,
				message: {
					original: message
				},
				location: config.locate
			});

			onMessage("privateMessageSource", "private", targetSignature, config.clientList[targetSignature]?.at(0).username, config.crypto.randomUUID(), message, new Date().getTime());
		}
	}
	else if (config.editMessageTarget?.length > 0) {
		WebSocketBinaryHandler({
			type: 'editMessage',
			location: config.locate,
			message: {
				original: $('#sender').text()
			},
			message_id: config.editMessageTarget
		});

		cancelPrivateMode();
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

	return true;
}

export function cancelPrivateMode() {
	if (config.editMessageTarget != null) {
		$('#sender').text('');
		$('.lobby > .chat > div[data-id].focus').removeClass('focus');
		onKeyEnter($('#sender'));
	}

	config.privateChatTarget = null;
	config.editMessageTarget = null;
	$('.privateStatus').remove();
}