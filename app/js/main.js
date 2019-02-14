'use strict';

// Check if it is iOS
var isiOS = (navigator.userAgent.match(/(iPad|iPhone|iPod)/g) ? true : false);

// JQuery start
$(function(){ // DOM loaded
	var viewportWidth = document.documentElement.clientWidth;
	var viewportHeight = document.documentElement.clientHeight;
}); // END - DOM loaded

// return index by key value
function findIndexByKeyValue(arraytosearch, key, valuetosearch) {
	for (var i = 0; i < arraytosearch.length; i++) {
		if (arraytosearch[i][key] == valuetosearch) {
			return i;
		}
	}
	return null;
}

// return only digits
function getDigits(info) {
	return info.replace(/\D+/g, '');
}

// Function to identify if Array contain an item
function contains(needle) {
    // Per spec, the way to identify NaN is that it is not equal to itself
    var findNaN = needle !== needle;
    var indexOf;
    if(!findNaN && typeof Array.prototype.indexOf === 'function') {
        indexOf = Array.prototype.indexOf;
    } else {
        indexOf = function(needle) {
            var i = -1, index = -1;
            for(i = 0; i < this.length; i++) {
                var item = this[i];

                if((findNaN && item !== item) || item === needle) {
                    index = i;
                    break;
                }
            }
            return index;
        };
    }
    return indexOf.call(this, needle) > -1;
};

// Make JSON-object from serialized form data
function toJSON(data) {
	var arr = {};
	data = data.split('&');
	for (var i = 0; i < data.length; i++) {
		var param = data[i].split('=');
		arr[param[0]] = param[1];
	}
	return arr;
}

// check if number
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

$('[data-slider]').slick({
  dots: true,
  speed: 500,
  arrows: false
});
