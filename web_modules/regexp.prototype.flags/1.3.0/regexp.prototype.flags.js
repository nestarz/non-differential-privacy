import defineProperties from 'define-properties';
/* eslint no-invalid-this: 1 */

var ERROR_MESSAGE = 'Function.prototype.bind called on incompatible ';
var slice = Array.prototype.slice;
var toStr = Object.prototype.toString;
var funcType = '[object Function]';

var implementation = function bind(that) {
  var target = this;

  if (typeof target !== 'function' || toStr.call(target) !== funcType) {
    throw new TypeError(ERROR_MESSAGE + target);
  }

  var args = slice.call(arguments, 1);
  var bound;

  var binder = function binder() {
    if (this instanceof bound) {
      var result = target.apply(this, args.concat(slice.call(arguments)));

      if (Object(result) === result) {
        return result;
      }

      return this;
    } else {
      return target.apply(that, args.concat(slice.call(arguments)));
    }
  };

  var boundLength = Math.max(0, target.length - args.length);
  var boundArgs = [];

  for (var i = 0; i < boundLength; i++) {
    boundArgs.push('$' + i);
  }

  bound = Function('binder', 'return function (' + boundArgs.join(',') + '){ return binder.apply(this,arguments); }')(binder);

  if (target.prototype) {
    var Empty = function Empty() {};

    Empty.prototype = target.prototype;
    bound.prototype = new Empty();
    Empty.prototype = null;
  }

  return bound;
};

var functionBind = Function.prototype.bind || implementation;
var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
/* eslint complexity: [2, 18], max-statements: [2, 33] */

var shams = function hasSymbols() {
  if (typeof Symbol !== 'function' || typeof Object.getOwnPropertySymbols !== 'function') {
    return false;
  }

  if (typeof Symbol.iterator === 'symbol') {
    return true;
  }

  var obj = {};
  var sym = Symbol('test');
  var symObj = Object(sym);

  if (typeof sym === 'string') {
    return false;
  }

  if (Object.prototype.toString.call(sym) !== '[object Symbol]') {
    return false;
  }

  if (Object.prototype.toString.call(symObj) !== '[object Symbol]') {
    return false;
  } // temp disabled per https://github.com/ljharb/object.assign/issues/17
  // if (sym instanceof Symbol) { return false; }
  // temp disabled per https://github.com/WebReflection/get-own-property-symbols/issues/4
  // if (!(symObj instanceof Symbol)) { return false; }
  // if (typeof Symbol.prototype.toString !== 'function') { return false; }
  // if (String(sym) !== Symbol.prototype.toString.call(sym)) { return false; }


  var symVal = 42;
  obj[sym] = symVal;

  for (sym in obj) {
    return false;
  } // eslint-disable-line no-restricted-syntax


  if (typeof Object.keys === 'function' && Object.keys(obj).length !== 0) {
    return false;
  }

  if (typeof Object.getOwnPropertyNames === 'function' && Object.getOwnPropertyNames(obj).length !== 0) {
    return false;
  }

  var syms = Object.getOwnPropertySymbols(obj);

  if (syms.length !== 1 || syms[0] !== sym) {
    return false;
  }

  if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
    return false;
  }

  if (typeof Object.getOwnPropertyDescriptor === 'function') {
    var descriptor = Object.getOwnPropertyDescriptor(obj, sym);

    if (descriptor.value !== symVal || descriptor.enumerable !== true) {
      return false;
    }
  }

  return true;
};

var origSymbol = commonjsGlobal.Symbol;

var hasSymbols = function hasNativeSymbols() {
  if (typeof origSymbol !== 'function') {
    return false;
  }

  if (typeof Symbol !== 'function') {
    return false;
  }

  if (typeof origSymbol('foo') !== 'symbol') {
    return false;
  }

  if (typeof Symbol('bar') !== 'symbol') {
    return false;
  }

  return shams();
};
/* globals
	Atomics,
	SharedArrayBuffer,
*/


var undefined$1;
var $TypeError = TypeError;
var $gOPD = Object.getOwnPropertyDescriptor;

if ($gOPD) {
  try {
    $gOPD({}, '');
  } catch (e) {
    $gOPD = null; // this is IE 8, which has a broken gOPD
  }
}

var throwTypeError = function throwTypeError() {
  throw new $TypeError();
};

var ThrowTypeError = $gOPD ? function () {
  try {
    // eslint-disable-next-line no-unused-expressions, no-caller, no-restricted-properties
    arguments.callee; // IE 8 does not throw here

    return throwTypeError;
  } catch (calleeThrows) {
    try {
      // IE 8 throws on Object.getOwnPropertyDescriptor(arguments, '')
      return $gOPD(arguments, 'callee').get;
    } catch (gOPDthrows) {
      return throwTypeError;
    }
  }
}() : throwTypeError;
var hasSymbols$1 = hasSymbols();

var getProto = Object.getPrototypeOf || function (x) {
  return x.__proto__;
}; // eslint-disable-line no-proto


var generatorFunction = undefined$1;
var asyncFunction = undefined$1;
var asyncGenFunction = undefined$1;
var TypedArray = typeof Uint8Array === 'undefined' ? undefined$1 : getProto(Uint8Array);
var INTRINSICS = {
  '%Array%': Array,
  '%ArrayBuffer%': typeof ArrayBuffer === 'undefined' ? undefined$1 : ArrayBuffer,
  '%ArrayBufferPrototype%': typeof ArrayBuffer === 'undefined' ? undefined$1 : ArrayBuffer.prototype,
  '%ArrayIteratorPrototype%': hasSymbols$1 ? getProto([][Symbol.iterator]()) : undefined$1,
  '%ArrayPrototype%': Array.prototype,
  '%ArrayProto_entries%': Array.prototype.entries,
  '%ArrayProto_forEach%': Array.prototype.forEach,
  '%ArrayProto_keys%': Array.prototype.keys,
  '%ArrayProto_values%': Array.prototype.values,
  '%AsyncFromSyncIteratorPrototype%': undefined$1,
  '%AsyncFunction%': asyncFunction,
  '%AsyncFunctionPrototype%': undefined$1,
  '%AsyncGenerator%': undefined$1,
  '%AsyncGeneratorFunction%': asyncGenFunction,
  '%AsyncGeneratorPrototype%': undefined$1,
  '%AsyncIteratorPrototype%': undefined$1,
  '%Atomics%': typeof Atomics === 'undefined' ? undefined$1 : Atomics,
  '%Boolean%': Boolean,
  '%BooleanPrototype%': Boolean.prototype,
  '%DataView%': typeof DataView === 'undefined' ? undefined$1 : DataView,
  '%DataViewPrototype%': typeof DataView === 'undefined' ? undefined$1 : DataView.prototype,
  '%Date%': Date,
  '%DatePrototype%': Date.prototype,
  '%decodeURI%': decodeURI,
  '%decodeURIComponent%': decodeURIComponent,
  '%encodeURI%': encodeURI,
  '%encodeURIComponent%': encodeURIComponent,
  '%Error%': Error,
  '%ErrorPrototype%': Error.prototype,
  '%eval%': eval,
  // eslint-disable-line no-eval
  '%EvalError%': EvalError,
  '%EvalErrorPrototype%': EvalError.prototype,
  '%Float32Array%': typeof Float32Array === 'undefined' ? undefined$1 : Float32Array,
  '%Float32ArrayPrototype%': typeof Float32Array === 'undefined' ? undefined$1 : Float32Array.prototype,
  '%Float64Array%': typeof Float64Array === 'undefined' ? undefined$1 : Float64Array,
  '%Float64ArrayPrototype%': typeof Float64Array === 'undefined' ? undefined$1 : Float64Array.prototype,
  '%Function%': Function,
  '%FunctionPrototype%': Function.prototype,
  '%Generator%': undefined$1,
  '%GeneratorFunction%': generatorFunction,
  '%GeneratorPrototype%': undefined$1,
  '%Int8Array%': typeof Int8Array === 'undefined' ? undefined$1 : Int8Array,
  '%Int8ArrayPrototype%': typeof Int8Array === 'undefined' ? undefined$1 : Int8Array.prototype,
  '%Int16Array%': typeof Int16Array === 'undefined' ? undefined$1 : Int16Array,
  '%Int16ArrayPrototype%': typeof Int16Array === 'undefined' ? undefined$1 : Int8Array.prototype,
  '%Int32Array%': typeof Int32Array === 'undefined' ? undefined$1 : Int32Array,
  '%Int32ArrayPrototype%': typeof Int32Array === 'undefined' ? undefined$1 : Int32Array.prototype,
  '%isFinite%': isFinite,
  '%isNaN%': isNaN,
  '%IteratorPrototype%': hasSymbols$1 ? getProto(getProto([][Symbol.iterator]())) : undefined$1,
  '%JSON%': typeof JSON === 'object' ? JSON : undefined$1,
  '%JSONParse%': typeof JSON === 'object' ? JSON.parse : undefined$1,
  '%Map%': typeof Map === 'undefined' ? undefined$1 : Map,
  '%MapIteratorPrototype%': typeof Map === 'undefined' || !hasSymbols$1 ? undefined$1 : getProto(new Map()[Symbol.iterator]()),
  '%MapPrototype%': typeof Map === 'undefined' ? undefined$1 : Map.prototype,
  '%Math%': Math,
  '%Number%': Number,
  '%NumberPrototype%': Number.prototype,
  '%Object%': Object,
  '%ObjectPrototype%': Object.prototype,
  '%ObjProto_toString%': Object.prototype.toString,
  '%ObjProto_valueOf%': Object.prototype.valueOf,
  '%parseFloat%': parseFloat,
  '%parseInt%': parseInt,
  '%Promise%': typeof Promise === 'undefined' ? undefined$1 : Promise,
  '%PromisePrototype%': typeof Promise === 'undefined' ? undefined$1 : Promise.prototype,
  '%PromiseProto_then%': typeof Promise === 'undefined' ? undefined$1 : Promise.prototype.then,
  '%Promise_all%': typeof Promise === 'undefined' ? undefined$1 : Promise.all,
  '%Promise_reject%': typeof Promise === 'undefined' ? undefined$1 : Promise.reject,
  '%Promise_resolve%': typeof Promise === 'undefined' ? undefined$1 : Promise.resolve,
  '%Proxy%': typeof Proxy === 'undefined' ? undefined$1 : Proxy,
  '%RangeError%': RangeError,
  '%RangeErrorPrototype%': RangeError.prototype,
  '%ReferenceError%': ReferenceError,
  '%ReferenceErrorPrototype%': ReferenceError.prototype,
  '%Reflect%': typeof Reflect === 'undefined' ? undefined$1 : Reflect,
  '%RegExp%': RegExp,
  '%RegExpPrototype%': RegExp.prototype,
  '%Set%': typeof Set === 'undefined' ? undefined$1 : Set,
  '%SetIteratorPrototype%': typeof Set === 'undefined' || !hasSymbols$1 ? undefined$1 : getProto(new Set()[Symbol.iterator]()),
  '%SetPrototype%': typeof Set === 'undefined' ? undefined$1 : Set.prototype,
  '%SharedArrayBuffer%': typeof SharedArrayBuffer === 'undefined' ? undefined$1 : SharedArrayBuffer,
  '%SharedArrayBufferPrototype%': typeof SharedArrayBuffer === 'undefined' ? undefined$1 : SharedArrayBuffer.prototype,
  '%String%': String,
  '%StringIteratorPrototype%': hasSymbols$1 ? getProto(''[Symbol.iterator]()) : undefined$1,
  '%StringPrototype%': String.prototype,
  '%Symbol%': hasSymbols$1 ? Symbol : undefined$1,
  '%SymbolPrototype%': hasSymbols$1 ? Symbol.prototype : undefined$1,
  '%SyntaxError%': SyntaxError,
  '%SyntaxErrorPrototype%': SyntaxError.prototype,
  '%ThrowTypeError%': ThrowTypeError,
  '%TypedArray%': TypedArray,
  '%TypedArrayPrototype%': TypedArray ? TypedArray.prototype : undefined$1,
  '%TypeError%': $TypeError,
  '%TypeErrorPrototype%': $TypeError.prototype,
  '%Uint8Array%': typeof Uint8Array === 'undefined' ? undefined$1 : Uint8Array,
  '%Uint8ArrayPrototype%': typeof Uint8Array === 'undefined' ? undefined$1 : Uint8Array.prototype,
  '%Uint8ClampedArray%': typeof Uint8ClampedArray === 'undefined' ? undefined$1 : Uint8ClampedArray,
  '%Uint8ClampedArrayPrototype%': typeof Uint8ClampedArray === 'undefined' ? undefined$1 : Uint8ClampedArray.prototype,
  '%Uint16Array%': typeof Uint16Array === 'undefined' ? undefined$1 : Uint16Array,
  '%Uint16ArrayPrototype%': typeof Uint16Array === 'undefined' ? undefined$1 : Uint16Array.prototype,
  '%Uint32Array%': typeof Uint32Array === 'undefined' ? undefined$1 : Uint32Array,
  '%Uint32ArrayPrototype%': typeof Uint32Array === 'undefined' ? undefined$1 : Uint32Array.prototype,
  '%URIError%': URIError,
  '%URIErrorPrototype%': URIError.prototype,
  '%WeakMap%': typeof WeakMap === 'undefined' ? undefined$1 : WeakMap,
  '%WeakMapPrototype%': typeof WeakMap === 'undefined' ? undefined$1 : WeakMap.prototype,
  '%WeakSet%': typeof WeakSet === 'undefined' ? undefined$1 : WeakSet,
  '%WeakSetPrototype%': typeof WeakSet === 'undefined' ? undefined$1 : WeakSet.prototype
};
var $replace = functionBind.call(Function.call, String.prototype.replace);
/* adapted from https://github.com/lodash/lodash/blob/4.17.15/dist/lodash.js#L6735-L6744 */

var rePropName = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g;
var reEscapeChar = /\\(\\)?/g;
/** Used to match backslashes in property paths. */

var stringToPath = function stringToPath(string) {
  var result = [];
  $replace(string, rePropName, function (match, number, quote, subString) {
    result[result.length] = quote ? $replace(subString, reEscapeChar, '$1') : number || match;
  });
  return result;
};
/* end adaptation */


var getBaseIntrinsic = function getBaseIntrinsic(name, allowMissing) {
  if (!(name in INTRINSICS)) {
    throw new SyntaxError('intrinsic ' + name + ' does not exist!');
  } // istanbul ignore if // hopefully this is impossible to test :-)


  if (typeof INTRINSICS[name] === 'undefined' && !allowMissing) {
    throw new $TypeError('intrinsic ' + name + ' exists, but is not available. Please file an issue!');
  }

  return INTRINSICS[name];
};

var GetIntrinsic = function GetIntrinsic(name, allowMissing) {
  if (typeof name !== 'string' || name.length === 0) {
    throw new TypeError('intrinsic name must be a non-empty string');
  }

  if (arguments.length > 1 && typeof allowMissing !== 'boolean') {
    throw new TypeError('"allowMissing" argument must be a boolean');
  }

  var parts = stringToPath(name);
  var value = getBaseIntrinsic('%' + (parts.length > 0 ? parts[0] : '') + '%', allowMissing);

  for (var i = 1; i < parts.length; i += 1) {
    if (value != null) {
      if ($gOPD && i + 1 >= parts.length) {
        var desc = $gOPD(value, parts[i]);

        if (!allowMissing && !(parts[i] in value)) {
          throw new $TypeError('base intrinsic for ' + name + ' exists, but the property is not available.');
        }

        value = desc ? desc.get || desc.value : value[parts[i]];
      } else {
        value = value[parts[i]];
      }
    }
  }

  return value;
};

var $Function = GetIntrinsic('%Function%');
var $apply = $Function.apply;
var $call = $Function.call;

var callBind = function callBind() {
  return functionBind.apply($call, arguments);
};

var apply = function applyBind() {
  return functionBind.apply($apply, arguments);
};

callBind.apply = apply;
var $Object = Object;
var $TypeError$1 = TypeError;

var implementation$1 = function flags() {
  if (this != null && this !== $Object(this)) {
    throw new $TypeError$1('RegExp.prototype.flags getter called on non-object');
  }

  var result = '';

  if (this.global) {
    result += 'g';
  }

  if (this.ignoreCase) {
    result += 'i';
  }

  if (this.multiline) {
    result += 'm';
  }

  if (this.dotAll) {
    result += 's';
  }

  if (this.unicode) {
    result += 'u';
  }

  if (this.sticky) {
    result += 'y';
  }

  return result;
};

var supportsDescriptors = defineProperties.supportsDescriptors;
var $gOPD$1 = Object.getOwnPropertyDescriptor;
var $TypeError$2 = TypeError;

var polyfill = function getPolyfill() {
  if (!supportsDescriptors) {
    throw new $TypeError$2('RegExp.prototype.flags requires a true ES5 environment that supports property descriptors');
  }

  if (/a/mig.flags === 'gim') {
    var descriptor = $gOPD$1(RegExp.prototype, 'flags');

    if (descriptor && typeof descriptor.get === 'function' && typeof /a/.dotAll === 'boolean') {
      return descriptor.get;
    }
  }

  return implementation$1;
};

var supportsDescriptors$1 = defineProperties.supportsDescriptors;
var gOPD = Object.getOwnPropertyDescriptor;
var defineProperty = Object.defineProperty;
var TypeErr = TypeError;
var getProto$1 = Object.getPrototypeOf;
var regex = /a/;

var shim = function shimFlags() {
  if (!supportsDescriptors$1 || !getProto$1) {
    throw new TypeErr('RegExp.prototype.flags requires a true ES5 environment that supports property descriptors');
  }

  var polyfill$1 = polyfill();
  var proto = getProto$1(regex);
  var descriptor = gOPD(proto, 'flags');

  if (!descriptor || descriptor.get !== polyfill$1) {
    defineProperty(proto, 'flags', {
      configurable: true,
      enumerable: false,
      get: polyfill$1
    });
  }

  return polyfill$1;
};

var flagsBound = callBind(implementation$1);
defineProperties(flagsBound, {
  getPolyfill: polyfill,
  implementation: implementation$1,
  shim: shim
});
var regexp_prototype_flags = flagsBound;
export default regexp_prototype_flags;