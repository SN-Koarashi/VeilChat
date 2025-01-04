"use strict";
import { initFirst } from './Events.js';

// Check that service workers are supported
if ('serviceWorker' in navigator) {
	// Use the window load event to keep the page load performant
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('/js/service-workers.js');
	});
}

window.addEventListener('DOMContentLoaded', () => {
	initFirst(window);

	delete window.localStorage;
	delete window.crypto;
});