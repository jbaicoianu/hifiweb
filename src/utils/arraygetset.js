/**
 * Sets value in a multilevel object element 
 *
 * @function arrayset
 * @param {object} obj
 * @param {string} element
*/
export function arrayset(obj, element, value) {
  var ptr = obj;
  var x = element.split(".");
  for (var i = 0; i < x.length - 1; i++) {
    if (ptr==null || (typeof ptr[x[i]] != 'array' && typeof ptr[x[i]] != 'object' && i != x.length-1)) {
      ptr[x[i]] = {};
    }
    ptr = ptr[x[i]];
  }
  if (typeof ptr == "object") {
    ptr[x[x.length-1]] = value;
  }
};
/**
 * Retrieves specified dot-separated value from a multilevel object element 
 *
 * @function arrayget
 * @param {object} obj
 * @param {string} name
 * @param {object|number|string} [defval] default value if none found
*/
export function arrayget(obj, name, defval) {
  var ptr = obj;
  var x = name.split(".");
  for (var i = 0; i < x.length; i++) {
    if (ptr==null || (!Array.isArray(ptr[x[i]]) && !(typeof ptr[x[i]] == 'object') && i != x.length-1)) {
      ptr = null;
      break;
    }
    ptr = ptr[x[i]];
  }
  if (typeof ptr == "undefined" || ptr === null) {
    return (typeof defval == "undefined" ? null : defval);
  }
  return ptr;
};

