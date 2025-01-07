"use strict";
import config from './config.js';

var Logger = function (isDebugger) {
	if (window.Logger != undefined && typeof window.Logger === "object" && isDebugger) {
		return window.Logger;
	}
	else {
		if (isDebugger) {
			console.log('[Logger]', "debugger mode");
			return {
				Types: {
					WARN: console.warn,
					ERROR: console.error,
					LOG: console.log
				},
				show: function (type, ...raw) {
					type(...raw);
				}
			};
		}
		else {
			return {
				Types: {
					WARN: null,
					ERROR: null,
					LOG: null
				},
				show: function () {
					return null;
				}
			};
		}
	}
}(config.isDebugger);

export default Logger;