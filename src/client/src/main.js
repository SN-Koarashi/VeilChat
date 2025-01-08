"use strict";
import { initFirst } from './Registers/Events.js';

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/js/service-workers.js');
	});
}

window.addEventListener('DOMContentLoaded', () => {
	initFirst(window);

	delete window.localStorage;
	delete window.crypto;
});