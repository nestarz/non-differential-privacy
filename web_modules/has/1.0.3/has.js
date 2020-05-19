import functionBind from 'function-bind';
var src = functionBind.call(Function.call, Object.prototype.hasOwnProperty);
export default src;