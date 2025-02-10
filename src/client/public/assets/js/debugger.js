window.Logger = {
	Types: {
		WARN: console.warn,
		ERROR: console.error,
		LOG: console.log
	},
	show: function(type,...raw){
		type(...raw);
	}
};