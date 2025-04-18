"use strict";
import { initFirst } from './registers/event.js';

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/assets/js/service-workers.js');
	});
}

window.addEventListener('DOMContentLoaded', () => {
	initFirst(window);

	delete window.localStorage;
	delete window.crypto;
});