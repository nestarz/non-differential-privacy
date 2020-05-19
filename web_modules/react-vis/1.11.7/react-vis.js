import PropTypes from 'prop-types';
import { voronoi } from 'd3-voronoi';
import React, { PureComponent, Component } from 'react';
import { interpolate } from 'd3-interpolate';
import { spring, Motion, presets } from 'react-motion';
import { scaleLinear, scalePoint, scaleOrdinal, scaleLog, scaleTime, scaleUtc, scaleSqrt } from 'd3-scale';
import { extent, range } from 'd3-array';
import { set } from 'd3-collection';
import { hsl, rgb } from 'd3-color';
import * as d3Shape from 'd3-shape';
import { arc, area, line, pie } from 'd3-shape';
import { contourDensity } from 'd3-contour';
import { geoPath } from 'd3-geo';
import { format } from 'd3-format';
import { hexbin } from 'd3-hexbin';
import equal from 'deep-equal';
import { sankey, sankeyLinkHorizontal, sankeyJustify, sankeyCenter, sankeyLeft, sankeyRight } from 'd3-sankey';
import { partition, hierarchy, pack, treemap, treemapSquarify, treemapResquarify, treemapSlice, treemapDice, treemapSliceDice, treemapBinary } from 'd3-hierarchy';

var _createClass = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

function _objectWithoutProperties(obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
}

var ANIMATION_PROPTYPES = PropTypes.oneOfType([PropTypes.string, PropTypes.shape({
  stiffness: PropTypes.number,
  nonAnimatedProps: PropTypes.arrayOf(PropTypes.string),
  damping: PropTypes.number
}), PropTypes.bool]);
var propTypes = {
  animatedProps: PropTypes.arrayOf(PropTypes.string).isRequired,
  animation: ANIMATION_PROPTYPES,
  onStart: PropTypes.func,
  onEnd: PropTypes.func
};
/**
 * Format the animation style object
 * @param {Object|String} animationStyle - The animation style property, either the name of a
 * presets are one of noWobble, gentle, wobbly, stiff
 */

function getAnimationStyle() {
  var animationStyle = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : presets.noWobble;

  if (typeof animationStyle === 'string') {
    return presets[animationStyle] || presets.noWobble;
  }

  var damping = animationStyle.damping,
      stiffness = animationStyle.stiffness;
  return _extends({
    damping: damping || presets.noWobble.damping,
    stiffness: stiffness || presets.noWobble.stiffness
  }, animationStyle);
}
/**
 * Extract the animated props from the entire props object.
 * @param {Object} props Props.
 * @returns {Object} Object of animated props.
 */


function extractAnimatedPropValues(props) {
  var animatedProps = props.animatedProps,
      otherProps = _objectWithoutProperties(props, ['animatedProps']);

  return animatedProps.reduce(function (result, animatedPropName) {
    if (otherProps.hasOwnProperty(animatedPropName)) {
      result[animatedPropName] = otherProps[animatedPropName];
    }

    return result;
  }, {});
}

var Animation = function (_PureComponent) {
  _inherits(Animation, _PureComponent);

  function Animation(props) {
    _classCallCheck(this, Animation);

    var _this = _possibleConstructorReturn(this, (Animation.__proto__ || Object.getPrototypeOf(Animation)).call(this, props));

    _this._motionEndHandler = function () {
      if (_this.props.onEnd) {
        _this.props.onEnd();
      }
    };

    _this._renderChildren = function (_ref) {
      var i = _ref.i;
      var children = _this.props.children;
      var interpolator = _this._interpolator;
      var child = React.Children.only(children);
      var interpolatedProps = interpolator ? interpolator(i) : interpolator; // interpolator doesnt play nice with deeply nested objected
      // so we expose an additional prop for situations like these, soit _data,
      // which stores the full tree and can be recombined with the sanitized version
      // after interpolation

      var data = interpolatedProps && interpolatedProps.data || null;

      if (data && child.props._data) {
        data = data.map(function (row, index) {
          var correspondingCell = child.props._data[index];
          return _extends({}, row, {
            parent: correspondingCell.parent,
            children: correspondingCell.children
          });
        });
      }

      return React.cloneElement(child, _extends({}, child.props, interpolatedProps, {
        data: data || child.props.data || null,
        // enforce re-rendering
        _animation: Math.random()
      }));
    };

    _this._updateInterpolator(props);

    return _this;
  }

  _createClass(Animation, [{
    key: 'componentWillUpdate',
    value: function componentWillUpdate(props) {
      this._updateInterpolator(this.props, props);

      if (props.onStart) {
        props.onStart();
      }
    }
    /**
     * Render the child into the parent.
     * @param {Number} i Number generated by the spring.
     * @returns {React.Component} Rendered react element.
     * @private
     */

  }, {
    key: '_updateInterpolator',

    /**
     * Update the interpolator function and assign it to this._interpolator.
     * @param {Object} oldProps Old props.
     * @param {Object} newProps New props.
     * @private
     */
    value: function _updateInterpolator(oldProps, newProps) {
      this._interpolator = interpolate(extractAnimatedPropValues(oldProps), newProps ? extractAnimatedPropValues(newProps) : null);
    }
  }, {
    key: 'render',
    value: function render() {
      var animationStyle = getAnimationStyle(this.props.animation);
      var defaultStyle = {
        i: 0
      };
      var style = {
        i: spring(1, animationStyle)
      }; // In order to make Motion re-run animations each time, the random key is
      // always passed.
      // TODO: find a better solution for the spring.

      var key = Math.random();
      return React.createElement(Motion, _extends({
        defaultStyle: defaultStyle,
        style: style,
        key: key
      }, {
        onRest: this._motionEndHandler
      }), this._renderChildren);
    }
  }]);

  return Animation;
}(PureComponent);

Animation.propTypes = propTypes;
Animation.displayName = 'Animation';
var AnimationPropType = ANIMATION_PROPTYPES;

var _slicedToArray = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _React$version$split = React.version.split('.'),
    _React$version$split2 = _slicedToArray(_React$version$split, 2),
    major = _React$version$split2[0],
    minor = _React$version$split2[1];

var versionHigherThanThirteen = Number(minor) > 13 || Number(major) > 13;

var isReactDOMSupported = function isReactDOMSupported() {
  return versionHigherThanThirteen;
};
/**
 * Support React 0.13 and greater where refs are React components, not DOM
 * nodes.
 * @param {*} ref React's ref.
 * @returns {Element} DOM element.
 */


var getDOMNode = function getDOMNode(ref) {
  if (!isReactDOMSupported()) {
    return ref && ref.getDOMNode();
  }

  return ref;
};

var USED_MESSAGES = {};
var HIDDEN_PROCESSES = {
  test: true,
  production: true
};
/**
 * Warn the user about something
 * @param {String} message - the message to be shown
 * @param {Boolean} onlyShowMessageOnce - whether or not we allow the
 - message to be show multiple times
 */

function warning(message) {
  var onlyShowMessageOnce = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : false;
  /* eslint-disable no-undef, no-process-env */

  if (global.process && HIDDEN_PROCESSES["production"]) {
    return;
  }
  /* eslint-enable no-undef, no-process-env */


  if (!onlyShowMessageOnce || !USED_MESSAGES[message]) {
    /* eslint-disable no-console */
    console.warn(message);
    /* eslint-enable no-console */

    USED_MESSAGES[message] = true;
  }
} // Copyright (c) 2016 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

/**
 * Get unique property values from an array.
 * @param {Array} arr Array of data.
 * @param {string} propertyName Prop name.
 * @returns {Array} Array of unique values.
 */


function getUniquePropertyValues(arr, accessor) {
  var setOfValues = new Set(arr.map(accessor));
  return Array.from(setOfValues);
}
/**
 * Add zero to the domain.
 * @param {Array} arr Add zero to the domain.
 * @param {Number} value Add zero to domain.
 * @returns {Array} Adjusted domain.
 */


function addValueToArray(arr, value) {
  var result = [].concat(arr);

  if (result[0] > value) {
    result[0] = value;
  }

  if (result[result.length - 1] < value) {
    result[result.length - 1] = value;
  }

  return result;
}
/**
 * Transforms a value ( number or date ) to a string.
 * @param {Date | number} value The value as date or number.
 * @returns {string | number} The value as string.
 */


function transformValueToString(value) {
  return Object.prototype.toString.call(value) === '[object Date]' ? value.toDateString() : value;
}

var _extends$1 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _slicedToArray$1 = function () {
  function sliceIterator(arr, i) {
    var _arr = [];
    var _n = true;
    var _d = false;
    var _e = undefined;

    try {
      for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) {
        _arr.push(_s.value);

        if (i && _arr.length === i) break;
      }
    } catch (err) {
      _d = true;
      _e = err;
    } finally {
      try {
        if (!_n && _i["return"]) _i["return"]();
      } finally {
        if (_d) throw _e;
      }
    }

    return _arr;
  }

  return function (arr, i) {
    if (Array.isArray(arr)) {
      return arr;
    } else if (Symbol.iterator in Object(arr)) {
      return sliceIterator(arr, i);
    } else {
      throw new TypeError("Invalid attempt to destructure non-iterable instance");
    }
  };
}();

var _SCALE_FUNCTIONS;

function _toConsumableArray(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  } else {
    return Array.from(arr);
  }
}

function _defineProperty(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}
/**
 * Linear scale name.
 * @type {string}
 * @const
 */


var LINEAR_SCALE_TYPE = 'linear';
/**
 * Ordinal scale name.
 * @type {string}
 * @const
 */

var ORDINAL_SCALE_TYPE = 'ordinal';
/**
 * Category scale.
 * @type {string}
 * @const
 */

var CATEGORY_SCALE_TYPE = 'category';
/**
 * Literal scale.
 * Differs slightly from d3's identity scale in that it does not coerce value
 * into numbers, it simply returns exactly what you give it
 * @type {string}
 * @const
 */

var LITERAL_SCALE_TYPE = 'literal';
/**
 * Log scale name.
 * @type {string}
 * @const
 */

var LOG_SCALE_TYPE = 'log';
/**
 * Time scale name.
 * @type {string}
 * @const
 */

var TIME_SCALE_TYPE = 'time';
/**
 * Time UTC scale name.
 * @type {string}
 * @const
 */

var TIME_UTC_SCALE_TYPE = 'time-utc';
/**
 * Scale functions that are supported in the library.
 * @type {Object}
 * @const
 */

var SCALE_FUNCTIONS = (_SCALE_FUNCTIONS = {}, _defineProperty(_SCALE_FUNCTIONS, LINEAR_SCALE_TYPE, scaleLinear), _defineProperty(_SCALE_FUNCTIONS, ORDINAL_SCALE_TYPE, scalePoint), _defineProperty(_SCALE_FUNCTIONS, CATEGORY_SCALE_TYPE, scaleOrdinal), _defineProperty(_SCALE_FUNCTIONS, LITERAL_SCALE_TYPE, literalScale), _defineProperty(_SCALE_FUNCTIONS, LOG_SCALE_TYPE, scaleLog), _defineProperty(_SCALE_FUNCTIONS, TIME_SCALE_TYPE, scaleTime), _defineProperty(_SCALE_FUNCTIONS, TIME_UTC_SCALE_TYPE, scaleUtc), _SCALE_FUNCTIONS);
/**
 * Attrs for which a scale can be set up at XYPlot level
 * @type {Array}
 * @const
 */

var XYPLOT_ATTR = ['color', 'fill', 'opacity', 'stroke'];
/**
 * Title case a given string
 * @param {String} str Array of values.
 * @returns {String} titlecased string
 */

function toTitleCase(str) {
  return '' + str[0].toUpperCase() + str.slice(1);
}
/**
 * Find the smallest distance between the values on a given scale and return
 * the index of the element, where the smallest distance was found.
 * It returns the first occurrence of i where
 * `scale(value[i]) - scale(value[i - 1])` is minimal
 * @param {Array} values Array of values.
 * @param {Object} scaleObject Scale object.
 * @returns {number} Index of an element where the smallest distance was found.
 * @private
 */


function _getSmallestDistanceIndex(values, scaleObject) {
  var scaleFn = getScaleFnFromScaleObject(scaleObject);
  var result = 0;

  if (scaleFn) {
    var nextValue = void 0;
    var currentValue = scaleFn(values[0]);
    var distance = Infinity;
    var nextDistance = void 0;

    for (var i = 1; i < values.length; i++) {
      nextValue = scaleFn(values[i]);
      nextDistance = Math.abs(nextValue - currentValue);

      if (nextDistance < distance) {
        distance = nextDistance;
        result = i;
      }

      currentValue = nextValue;
    }
  }

  return result;
}
/**
 * This is a workaround for issue that ordinal scale
 * does not have invert method implemented in d3-scale.
 * @param {Object} Ordinal d3-scale object.
 * @returns {void}
 * @private
 */


function addInvertFunctionToOrdinalScaleObject(scale) {
  if (scale.invert) {
    return;
  }

  scale.invert = function invert(value) {
    var _scale$range = scale.range(),
        _scale$range2 = _slicedToArray$1(_scale$range, 2),
        lower = _scale$range2[0],
        upper = _scale$range2[1];

    var start = Math.min(lower, upper);
    var stop = Math.max(lower, upper);

    if (value < start + scale.padding() * scale.step()) {
      return scale.domain()[0];
    }

    if (value > stop - scale.padding() * scale.step()) {
      return scale.domain()[scale.domain().length - 1];
    }

    var index = Math.floor((value - start - scale.padding() * scale.step()) / scale.step());
    return scale.domain()[index];
  };
}
/**
 * Crate a scale function from the scale object.
 * @param {Object} scaleObject Scale object.
 - scaleObject.domain {Array}
 - scaleObject.range {Array}
 - scaleObject.type {string}
 - scaleObject.attr {string}
 * @returns {*} Scale function.
 * @private
 */


function getScaleFnFromScaleObject(scaleObject) {
  if (!scaleObject) {
    return null;
  }

  var type = scaleObject.type,
      domain = scaleObject.domain,
      range = scaleObject.range;
  var modDomain = domain[0] === domain[1] ? domain[0] === 0 ? [-1, 0] : [-domain[0], domain[0]] : domain;

  if (type === LITERAL_SCALE_TYPE) {
    return literalScale(range[0]);
  }

  var scale = SCALE_FUNCTIONS[type]().domain(modDomain).range(range);

  if (type === ORDINAL_SCALE_TYPE) {
    scale.padding(0.5);
    addInvertFunctionToOrdinalScaleObject(scale);
  }

  return scale;
}
/**
 * Get the domain from the array of data.
 * @param {Array} allData All data.
 * @param {function} accessor - accessor for main value.
 * @param {function} accessor0 - accessor for the naught value.
 * @param {string} type Scale type.
 * @returns {Array} Domain.
 * @private
 */


function getDomainByAccessor(allData, accessor, accessor0, type) {
  var domain = void 0; // Collect both attr and available attr0 values from the array of data.

  var values = allData.reduce(function (data, d) {
    var value = accessor(d);
    var value0 = accessor0(d);

    if (_isDefined(value)) {
      data.push(value);
    }

    if (_isDefined(value0)) {
      data.push(value0);
    }

    return data;
  }, []);

  if (!values.length) {
    return [];
  } // Create proper domain depending on the type of the scale.


  if (type !== ORDINAL_SCALE_TYPE && type !== CATEGORY_SCALE_TYPE) {
    domain = extent(values);
  } else {
    domain = set(values).values();
  }

  return domain;
}
/**
 * Create custom scale object from the value. When the scale is created from
 * this object, it should return the same value all time.
 * @param {string} attr Attribute.
 * @param {*} value Value.
 * @param {string} type - the type of scale being used
 * @param {function} accessor - the accessor function
 * @param {function} accessor0 - the accessor function for the potential naught value
 * @returns {Object} Custom scale object.
 * @private
 */


function _createScaleObjectForValue(attr, value, type, accessor, accessor0) {
  if (type === LITERAL_SCALE_TYPE) {
    return {
      type: LITERAL_SCALE_TYPE,
      domain: [],
      range: [value],
      distance: 0,
      attr: attr,
      baseValue: undefined,
      isValue: true,
      accessor: accessor,
      accessor0: accessor0
    };
  }

  if (typeof value === 'undefined') {
    return null;
  }

  return {
    type: CATEGORY_SCALE_TYPE,
    range: [value],
    domain: [],
    distance: 0,
    attr: attr,
    baseValue: undefined,
    isValue: true,
    accessor: accessor,
    accessor0: accessor0
  };
}
/**
 * Create a regular scale object for a further use from the existing parameters.
 * @param {Array} domain - Domain.
 * @param {Array} range - Range.
 * @param {string} type - Type.
 * @param {number} distance - Distance.
 * @param {string} attr - Attribute.
 * @param {number} baseValue - Base value.
 * @param {function} accessor - Attribute accesor
 * @param {function} accessor0 - Attribute accesor for potential naught value
 * @returns {Object} Scale object.
 * @private
 */


function _createScaleObjectForFunction(_ref) {
  var domain = _ref.domain,
      range = _ref.range,
      type = _ref.type,
      distance = _ref.distance,
      attr = _ref.attr,
      baseValue = _ref.baseValue,
      accessor = _ref.accessor,
      accessor0 = _ref.accessor0;
  return {
    domain: domain,
    range: range,
    type: type,
    distance: distance,
    attr: attr,
    baseValue: baseValue,
    isValue: false,
    accessor: accessor,
    accessor0: accessor0
  };
}
/**
 * Get scale object from props. E. g. object like {xRange, xDomain, xDistance,
 * xType} is transformed into {range, domain, distance, type}.
 * @param {Object} props Props.
 * @param {string} attr Attribute.
 * @returns {*} Null or an object with the scale.
 * @private
 */


function _collectScaleObjectFromProps(props, attr) {
  var value = props[attr],
      fallbackValue = props['_' + attr + 'Value'],
      range = props[attr + 'Range'],
      _props$ = props[attr + 'Distance'],
      distance = _props$ === undefined ? 0 : _props$,
      baseValue = props[attr + 'BaseValue'],
      _props$2 = props[attr + 'Type'],
      type = _props$2 === undefined ? LINEAR_SCALE_TYPE : _props$2,
      noFallBack = props[attr + 'NoFallBack'],
      _props$3 = props['get' + toTitleCase(attr)],
      accessor = _props$3 === undefined ? function (d) {
    return d[attr];
  } : _props$3,
      _props$4 = props['get' + toTitleCase(attr) + '0'],
      accessor0 = _props$4 === undefined ? function (d) {
    return d[attr + '0'];
  } : _props$4;
  var domain = props[attr + 'Domain']; // Return value-based scale if the value is assigned.

  if (!noFallBack && typeof value !== 'undefined') {
    return _createScaleObjectForValue(attr, value, props[attr + 'Type'], accessor, accessor0);
  } // Pick up the domain from the properties and create a new one if it's not
  // available.


  if (typeof baseValue !== 'undefined') {
    domain = addValueToArray(domain, baseValue);
  } // Make sure that the minimum necessary properties exist.


  if (!range || !domain || !domain.length) {
    // Try to use the fallback value if it is available.
    return _createScaleObjectForValue(attr, fallbackValue, props[attr + 'Type'], accessor, accessor0);
  }

  return _createScaleObjectForFunction({
    domain: domain,
    range: range,
    type: type,
    distance: distance,
    attr: attr,
    baseValue: baseValue,
    accessor: accessor,
    accessor0: accessor0
  });
}
/**
 * Compute left domain adjustment for the given values.
 * @param {Array} values Array of values.
 * @returns {number} Domain adjustment.
 * @private
 */


function _computeLeftDomainAdjustment(values) {
  if (values.length > 1) {
    return (values[1] - values[0]) / 2;
  }

  if (values.length === 1) {
    return values[0] - 0.5;
  }

  return 0;
}
/**
 * Compute right domain adjustment for the given values.
 * @param {Array} values Array of values.
 * @returns {number} Domain adjustment.
 * @private
 */


function _computeRightDomainAdjustment(values) {
  if (values.length > 1) {
    return (values[values.length - 1] - values[values.length - 2]) / 2;
  }

  if (values.length === 1) {
    return values[0] - 0.5;
  }

  return 0;
}
/**
 * Compute distance for the given values.
 * @param {Array} values Array of values.
 * @param {Array} domain Domain.
 * @param {number} bestDistIndex Index of a best distance found.
 * @param {function} scaleFn Scale function.
 * @returns {number} Domain adjustment.
 * @private
 */


function _computeScaleDistance(values, domain, bestDistIndex, scaleFn) {
  if (values.length > 1) {
    // Avoid zero indexes.
    var i = Math.max(bestDistIndex, 1);
    return Math.abs(scaleFn(values[i]) - scaleFn(values[i - 1]));
  }

  if (values.length === 1) {
    return Math.abs(scaleFn(domain[1]) - scaleFn(domain[0]));
  }

  return 0;
}
/**
 * Normilize array of values with a single value.
 * @param {Array} arr Array of data.
 * @param {Array} values Array of values.
 * @param {string} attr Attribute.
 * @param {string} type Type.
 * @private
 */


function _normalizeValues(data, values, accessor0, type) {
  if (type === TIME_SCALE_TYPE && values.length === 1) {
    var attr0 = accessor0(data[0]);
    return [attr0].concat(_toConsumableArray(values));
  }

  return values;
}
/**
 * Get the distance, the smallest and the largest value of the domain.
 * @param {Array} data Array of data for the single series.
 * @param {Object} scaleObject Scale object.
 * @returns {{domain0: number, domainN: number, distance: number}} Result.
 * @private
 */


function _getScaleDistanceAndAdjustedDomain(data, scaleObject) {
  var domain = scaleObject.domain,
      type = scaleObject.type,
      accessor = scaleObject.accessor,
      accessor0 = scaleObject.accessor0;
  var uniqueValues = getUniquePropertyValues(data, accessor); // Fix time scale if a data has only one value.

  var values = _normalizeValues(data, uniqueValues, accessor0, type);

  var index = _getSmallestDistanceIndex(values, scaleObject);

  var adjustedDomain = [].concat(domain);
  adjustedDomain[0] -= _computeLeftDomainAdjustment(values);
  adjustedDomain[domain.length - 1] += _computeRightDomainAdjustment(values); // Fix log scale if it's too small.

  if (type === LOG_SCALE_TYPE && domain[0] <= 0) {
    adjustedDomain[0] = Math.min(domain[1] / 10, 1);
  }

  var adjustedScaleFn = getScaleFnFromScaleObject(_extends$1({}, scaleObject, {
    domain: adjustedDomain
  }));

  var distance = _computeScaleDistance(values, adjustedDomain, index, adjustedScaleFn);

  return {
    domain0: adjustedDomain[0],
    domainN: adjustedDomain[adjustedDomain.length - 1],
    distance: distance
  };
}
/**
 * Returns true if scale adjustments are possible for a given scale.
 * @param {Object} props Props.
 * @param {Object} scaleObject Scale object.
 * @returns {boolean} True if scale adjustments possible.
 * @private
 */


function _isScaleAdjustmentPossible(props, scaleObject) {
  var attr = scaleObject.attr;
  var _props$_adjustBy = props._adjustBy,
      adjustBy = _props$_adjustBy === undefined ? [] : _props$_adjustBy,
      _props$_adjustWhat = props._adjustWhat,
      adjustWhat = _props$_adjustWhat === undefined ? [] : _props$_adjustWhat; // The scale cannot be adjusted if there's no attributes to adjust, no
  // suitable values

  return adjustWhat.length && adjustBy.length && adjustBy.indexOf(attr) !== -1;
}
/**
 * Adjust continuous scales (e.g. 'linear', 'log' and 'time') by adding the
 * space from the left and right of them and by computing the best distance.
 * @param {Object} props Props.
 * @param {Object} scaleObject Scale object.
 * @returns {*} Scale object with adjustments.
 * @private
 */


function _adjustContinuousScale(props, scaleObject) {
  var allSeriesData = props._allData,
      _props$_adjustWhat2 = props._adjustWhat,
      adjustWhat = _props$_adjustWhat2 === undefined ? [] : _props$_adjustWhat2; // Assign the initial values.

  var domainLength = scaleObject.domain.length;
  var domain = scaleObject.domain;
  var scaleDomain0 = domain[0];
  var scaleDomainN = domain[domainLength - 1];
  var scaleDistance = scaleObject.distance; // Find the smallest left position of the domain, the largest right position
  // of the domain and the best distance for them.

  allSeriesData.forEach(function (data, index) {
    if (adjustWhat.indexOf(index) === -1) {
      return;
    }

    if (data && data.length) {
      var _getScaleDistanceAndA = _getScaleDistanceAndAdjustedDomain(data, scaleObject),
          domain0 = _getScaleDistanceAndA.domain0,
          domainN = _getScaleDistanceAndA.domainN,
          distance = _getScaleDistanceAndA.distance;

      scaleDomain0 = Math.min(scaleDomain0, domain0);
      scaleDomainN = Math.max(scaleDomainN, domainN);
      scaleDistance = Math.max(scaleDistance, distance);
    }
  });
  scaleObject.domain = [scaleDomain0].concat(_toConsumableArray(domain.slice(1, -1)), [scaleDomainN]);
  scaleObject.distance = scaleDistance;
  return scaleObject;
}
/**
 * Get an adjusted scale. Suitable for 'category' and 'ordinal' scales.
 * @param {Object} scaleObject Scale object.
 * @returns {*} Scale object with adjustments.
 * @private
 */


function _adjustCategoricalScale(scaleObject) {
  var scaleFn = getScaleFnFromScaleObject(scaleObject);
  var domain = scaleObject.domain,
      range = scaleObject.range;

  if (domain.length > 1) {
    scaleObject.distance = Math.abs(scaleFn(domain[1]) - scaleFn(domain[0]));
  } else {
    scaleObject.distance = Math.abs(range[1] - range[0]);
  }

  return scaleObject;
}
/**
 * Retrieve a scale object or a value from the properties passed.
 * @param {Object} props Object of props.
 * @param {string} attr Attribute.
 * @returns {*} Scale object, value or null.
 */


function getScaleObjectFromProps(props, attr) {
  // Create the initial scale object.
  var scaleObject = _collectScaleObjectFromProps(props, attr);

  if (!scaleObject) {
    return null;
  } // Make sure if it's possible to add space to the scale object. If not,
  // return the object immediately.


  if (!_isScaleAdjustmentPossible(props, scaleObject)) {
    return scaleObject;
  }

  var type = scaleObject.type; // Depending on what type the scale is, apply different adjustments. Distances
  // for the ordinal and category scales are even, equal domains cannot be
  // adjusted.

  if (type === ORDINAL_SCALE_TYPE || type === CATEGORY_SCALE_TYPE) {
    return _adjustCategoricalScale(scaleObject);
  }

  return _adjustContinuousScale(props, scaleObject);
}
/**
 * Get d3 scale for a given prop.
 * @param {Object} props Props.
 * @param {string} attr Attribute.
 * @returns {function} d3 scale function.
 */


function getAttributeScale(props, attr) {
  var scaleObject = getScaleObjectFromProps(props, attr);
  return getScaleFnFromScaleObject(scaleObject);
}
/**
 * Get the value of `attr` from the object.
 * @param {Object} d - data Object.
 * @param {Function} accessor - accessor function.
 * @returns {*} Value of the point.
 * @private
 */


function _getAttrValue(d, accessor) {
  return accessor(d.data ? d.data : d);
}

function _isDefined(value) {
  return typeof value !== 'undefined';
}
/*
 * Adds a percentage of padding to a given domain
 * @param {Array} domain X or Y domain to pad.
 * @param {Number} padding Percentage of padding to add to domain
 * @returns {Array} Padded Domain
 */


function _padDomain(domain, padding) {
  if (!domain) {
    return domain;
  }

  if (isNaN(parseFloat(domain[0])) || isNaN(parseFloat(domain[1]))) {
    return domain;
  }

  var _domain = _slicedToArray$1(domain, 2),
      min = _domain[0],
      max = _domain[1];

  var domainPadding = (max - min) * (padding * 0.01);
  return [min - domainPadding, max + domainPadding];
}
/**
 * Get prop functor (either a value or a function) for a given attribute.
 * @param {Object} props Series props.
 * @param {Function} accessor - Property accessor.
 * @returns {*} Function or value.
 */


function getAttributeFunctor(props, attr) {
  var scaleObject = getScaleObjectFromProps(props, attr);

  if (scaleObject) {
    var scaleFn = getScaleFnFromScaleObject(scaleObject);
    return function (d) {
      return scaleFn(_getAttrValue(d, scaleObject.accessor));
    };
  }

  return null;
}
/**
 * Get the functor which extracts value form [attr]0 property. Use baseValue if
 * no attr0 property for a given object is defined. Fall back to domain[0] if no
 * base value is available.
 * @param {Object} props Object of props.
 * @param {string} attr Attribute name.
 * @returns {*} Function which returns value or null if no values available.
 */


function getAttr0Functor(props, attr) {
  var scaleObject = getScaleObjectFromProps(props, attr);

  if (scaleObject) {
    var domain = scaleObject.domain;
    var _scaleObject$baseValu = scaleObject.baseValue,
        baseValue = _scaleObject$baseValu === undefined ? domain[0] : _scaleObject$baseValu;
    var scaleFn = getScaleFnFromScaleObject(scaleObject);
    return function (d) {
      var value = _getAttrValue(d, scaleObject.accessor0);

      return scaleFn(_isDefined(value) ? value : baseValue);
    };
  }

  return null;
}
/**
 * Tries to get the string|number value of the attr and falls back to
 * a fallback property in case if the value is a scale.
 * @param {Object} props Series props.
 * @param {string} attr Property name.
 * @returns {*} Function or value.
 */


function getAttributeValue(props, attr) {
  var scaleObject = getScaleObjectFromProps(props, attr);

  if (scaleObject) {
    if (!scaleObject.isValue && props['_' + attr + 'Value'] === undefined) {
      warning('[React-vis] Cannot use data defined ' + attr + ' for this ' + 'series type. Using fallback value instead.');
    }

    return props['_' + attr + 'Value'] || scaleObject.range[0];
  }

  return null;
}
/**
 * Get prop types by the attribute.
 * @param {string} attr Attribute.
 * @returns {Object} Object of xDomain, xRange, xType, xDistance and _xValue,
 * where x is an attribute passed to the function.
 */


function getScalePropTypesByAttribute(attr) {
  var _ref2;

  return _ref2 = {}, _defineProperty(_ref2, '_' + attr + 'Value', PropTypes.any), _defineProperty(_ref2, attr + 'Domain', PropTypes.array), _defineProperty(_ref2, 'get' + toTitleCase(attr), PropTypes.func), _defineProperty(_ref2, 'get' + toTitleCase(attr) + '0', PropTypes.func), _defineProperty(_ref2, attr + 'Range', PropTypes.array), _defineProperty(_ref2, attr + 'Type', PropTypes.oneOf(Object.keys(SCALE_FUNCTIONS))), _defineProperty(_ref2, attr + 'Distance', PropTypes.number), _defineProperty(_ref2, attr + 'BaseValue', PropTypes.any), _ref2;
}
/**
 * Extract the list of scale properties from the entire props object.
 * @param {Object} props Props.
 * @param {Array<String>} attributes Array of attributes for the given
 * components (for instance, `['x', 'y', 'color']`).
 * @returns {Object} Collected props.
 */


function extractScalePropsFromProps(props, attributes) {
  var result = {};
  Object.keys(props).forEach(function (key) {
    // this filtering is critical for extracting the correct accessors!
    var attr = attributes.find(function (a) {
      // width
      var isPlainSet = key.indexOf(a) === 0; // Ex: _data

      var isUnderscoreSet = key.indexOf('_' + a) === 0; // EX: getX

      var usesGet = key.indexOf('get' + toTitleCase(a)) === 0;
      return isPlainSet || isUnderscoreSet || usesGet;
    });

    if (!attr) {
      return;
    }

    result[key] = props[key];
  });
  return result;
}
/**
 * Extract the missing scale props from the given data and return them as
 * an object.
 * @param {Object} props Props.
 * @param {Array} data Array of all data.
 * @param {Array<String>} attributes Array of attributes for the given
 * components (for instance, `['x', 'y', 'color']`).
 * @returns {Object} Collected props.
 */


function getMissingScaleProps(props, data, attributes) {
  var result = {}; // Make sure that the domain is set pad it if specified

  attributes.forEach(function (attr) {
    if (!props['get' + toTitleCase(attr)]) {
      result['get' + toTitleCase(attr)] = function (d) {
        return d[attr];
      };
    }

    if (!props['get' + toTitleCase(attr) + '0']) {
      result['get' + toTitleCase(attr) + '0'] = function (d) {
        return d[attr + '0'];
      };
    }

    if (!props[attr + 'Domain']) {
      result[attr + 'Domain'] = getDomainByAccessor(data, props['get' + toTitleCase(attr)] || result['get' + toTitleCase(attr)], props['get' + toTitleCase(attr) + '0'] || result['get' + toTitleCase(attr) + '0'], props[attr + 'Type']);

      if (props[attr + 'Padding']) {
        result[attr + 'Domain'] = _padDomain(result[attr + 'Domain'], props[attr + 'Padding']);
      }
    }
  });
  return result;
}
/**
 * Return a d3 scale that returns the literal value that was given to it
 * @returns {function} literal scale.
 */


function literalScale(defaultValue) {
  function scale(d) {
    if (d === undefined) {
      return defaultValue;
    }

    return d;
  }

  function response() {
    return scale;
  }

  scale.domain = response;
  scale.range = response;
  scale.unknown = response;
  scale.copy = response;
  return scale;
}

function getFontColorFromBackground(background) {
  if (background) {
    return hsl(background).l > 0.57 ? '#222' : '#fff';
  }

  return null;
}
/**
 * Creates fallback values for series from scales defined at XYPlot level.
 * @param {Object} props Props of the XYPlot object.
 * @param {Array<Object>} children Array of components, children of XYPlot
 * @returns {Array<Object>} Collected props.
 */


function getXYPlotValues(props, children) {
  var XYPlotScales = XYPLOT_ATTR.reduce(function (prev, attr) {
    var domain = props[attr + 'Domain'],
        range = props[attr + 'Range'],
        type = props[attr + 'Type'];

    if (domain && range && type) {
      return _extends$1({}, prev, _defineProperty({}, attr, SCALE_FUNCTIONS[type]().domain(domain).range(range)));
    }

    return prev;
  }, {});
  return children.map(function (child) {
    return XYPLOT_ATTR.reduce(function (prev, attr) {
      if (child.props && child.props[attr] !== undefined) {
        var scaleInput = child.props[attr];
        var scale = XYPlotScales[attr];
        var fallbackValue = scale ? scale(scaleInput) : scaleInput;
        return _extends$1({}, prev, _defineProperty({}, '_' + attr + 'Value', fallbackValue));
      }

      return prev;
    }, {});
  });
}

var OPTIONAL_SCALE_PROPS = ['Padding'];
var OPTIONAL_SCALE_PROPS_REGS = OPTIONAL_SCALE_PROPS.map(function (str) {
  return new RegExp(str + '$', 'i');
});
/**
 * Get the list of optional scale-related settings for XYPlot
 * mostly just used to find padding properties
 * @param {Object} props Object of props.
 * @returns {Object} Optional Props.
 * @private
 */

function getOptionalScaleProps(props) {
  return Object.keys(props).reduce(function (acc, prop) {
    var propIsNotOptional = OPTIONAL_SCALE_PROPS_REGS.every(function (reg) {
      return !prop.match(reg);
    });

    if (propIsNotOptional) {
      return acc;
    }

    acc[prop] = props[prop];
    return acc;
  }, {});
}

var scalesUtils = {
  extractScalePropsFromProps: extractScalePropsFromProps,
  getAttributeScale: getAttributeScale,
  getAttributeFunctor: getAttributeFunctor,
  getAttr0Functor: getAttr0Functor,
  getAttributeValue: getAttributeValue,
  getDomainByAccessor: getDomainByAccessor,
  getFontColorFromBackground: getFontColorFromBackground,
  getMissingScaleProps: getMissingScaleProps,
  getOptionalScaleProps: getOptionalScaleProps,
  getScaleObjectFromProps: getScaleObjectFromProps,
  getScalePropTypesByAttribute: getScalePropTypesByAttribute,
  getXYPlotValues: getXYPlotValues,
  literalScale: literalScale
};

var _createClass$1 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$2 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _classCallCheck$1(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$1(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$1(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var propTypes$1 = _extends$2({}, getScalePropTypesByAttribute('x'), getScalePropTypesByAttribute('y'), getScalePropTypesByAttribute('size'), getScalePropTypesByAttribute('opacity'), getScalePropTypesByAttribute('color'), {
  width: PropTypes.number,
  height: PropTypes.number,
  data: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.object, PropTypes.array])),
  onValueMouseOver: PropTypes.func,
  onValueMouseOut: PropTypes.func,
  onValueClick: PropTypes.func,
  onValueRightClick: PropTypes.func,
  onSeriesMouseOver: PropTypes.func,
  onSeriesMouseOut: PropTypes.func,
  onSeriesClick: PropTypes.func,
  onSeriesRightClick: PropTypes.func,
  onNearestX: PropTypes.func,
  onNearestXY: PropTypes.func,
  style: PropTypes.object,
  animation: AnimationPropType,
  stack: PropTypes.bool
});

var defaultProps = {
  className: '',
  stack: false,
  style: {}
};

var AbstractSeries = function (_PureComponent) {
  _inherits$1(AbstractSeries, _PureComponent);

  function AbstractSeries() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck$1(this, AbstractSeries);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn$1(this, (_ref = AbstractSeries.__proto__ || Object.getPrototypeOf(AbstractSeries)).call.apply(_ref, [this].concat(args))), _this), _this._seriesClickHandler = function (event) {
      var onSeriesClick = _this.props.onSeriesClick;

      if (onSeriesClick) {
        onSeriesClick({
          event: event
        });
      }
    }, _this._seriesMouseOutHandler = function (event) {
      var onSeriesMouseOut = _this.props.onSeriesMouseOut;

      if (onSeriesMouseOut) {
        onSeriesMouseOut({
          event: event
        });
      }
    }, _this._seriesMouseOverHandler = function (event) {
      var onSeriesMouseOver = _this.props.onSeriesMouseOver;

      if (onSeriesMouseOver) {
        onSeriesMouseOver({
          event: event
        });
      }
    }, _this._seriesRightClickHandler = function (event) {
      var onSeriesRightClick = _this.props.onSeriesRightClick;

      if (onSeriesRightClick) {
        onSeriesRightClick({
          event: event
        });
      }
    }, _this._valueClickHandler = function (d, event) {
      var _this$props = _this.props,
          onValueClick = _this$props.onValueClick,
          onSeriesClick = _this$props.onSeriesClick;

      if (onValueClick) {
        onValueClick(d, {
          event: event
        });
      }

      if (onSeriesClick) {
        onSeriesClick({
          event: event
        });
      }
    }, _this._valueMouseOutHandler = function (d, event) {
      var _this$props2 = _this.props,
          onValueMouseOut = _this$props2.onValueMouseOut,
          onSeriesMouseOut = _this$props2.onSeriesMouseOut;

      if (onValueMouseOut) {
        onValueMouseOut(d, {
          event: event
        });
      }

      if (onSeriesMouseOut) {
        onSeriesMouseOut({
          event: event
        });
      }
    }, _this._valueMouseOverHandler = function (d, event) {
      var _this$props3 = _this.props,
          onValueMouseOver = _this$props3.onValueMouseOver,
          onSeriesMouseOver = _this$props3.onSeriesMouseOver;

      if (onValueMouseOver) {
        onValueMouseOver(d, {
          event: event
        });
      }

      if (onSeriesMouseOver) {
        onSeriesMouseOver({
          event: event
        });
      }
    }, _this._valueRightClickHandler = function (d, event) {
      var _this$props4 = _this.props,
          onValueRightClick = _this$props4.onValueRightClick,
          onSeriesRightClick = _this$props4.onSeriesRightClick;

      if (onValueRightClick) {
        onValueRightClick(d, {
          event: event
        });
      }

      if (onSeriesRightClick) {
        onSeriesRightClick({
          event: event
        });
      }
    }, _temp), _possibleConstructorReturn$1(_this, _ret);
  }

  _createClass$1(AbstractSeries, [{
    key: 'onParentMouseMove',
    value: function onParentMouseMove(event) {
      var _props = this.props,
          onNearestX = _props.onNearestX,
          onNearestXY = _props.onNearestXY,
          data = _props.data;

      if (!onNearestX && !onNearestXY || !data) {
        return;
      }

      if (onNearestXY) {
        this._handleNearestXY(event);
      } else {
        this._handleNearestX(event);
      }
    }
  }, {
    key: 'onParentTouchMove',
    value: function onParentTouchMove(e) {
      e.preventDefault();
      this.onParentMouseMove(e);
    }
  }, {
    key: 'onParentTouchStart',
    value: function onParentTouchStart(e) {
      // prevent mouse event emulation
      e.preventDefault();
    }
    /**
     * Get the attr0 functor.
     * @param {string} attr Attribute name.
     * @returns {*} Functor.
     * @private
     */

  }, {
    key: '_getAttr0Functor',
    value: function _getAttr0Functor(attr) {
      return getAttr0Functor(this.props, attr);
    }
    /**
     * Get attribute functor.
     * @param {string} attr Attribute name
     * @returns {*} Functor.
     * @protected
     */

  }, {
    key: '_getAttributeFunctor',
    value: function _getAttributeFunctor(attr) {
      return getAttributeFunctor(this.props, attr);
    }
    /**
     * Get the attribute value if it is available.
     * @param {string} attr Attribute name.
     * @returns {*} Attribute value if available, fallback value or undefined
     * otherwise.
     * @protected
     */

  }, {
    key: '_getAttributeValue',
    value: function _getAttributeValue(attr) {
      return getAttributeValue(this.props, attr);
    }
    /**
     * Get the scale object distance by the attribute from the list of properties.
     * @param {string} attr Attribute name.
     * @returns {number} Scale distance.
     * @protected
     */

  }, {
    key: '_getScaleDistance',
    value: function _getScaleDistance(attr) {
      var scaleObject = getScaleObjectFromProps(this.props, attr);
      return scaleObject ? scaleObject.distance : 0;
    }
  }, {
    key: '_getXYCoordinateInContainer',
    value: function _getXYCoordinateInContainer(event) {
      var _props2 = this.props,
          _props2$marginTop = _props2.marginTop,
          marginTop = _props2$marginTop === undefined ? 0 : _props2$marginTop,
          _props2$marginLeft = _props2.marginLeft,
          marginLeft = _props2$marginLeft === undefined ? 0 : _props2$marginLeft;
      var evt = event.nativeEvent,
          currentTarget = event.currentTarget;
      var rect = currentTarget.getBoundingClientRect();
      var x = evt.clientX;
      var y = evt.clientY;

      if (evt.type === 'touchmove') {
        x = evt.touches[0].pageX;
        y = evt.touches[0].pageY;
      }

      return {
        x: x - rect.left - currentTarget.clientLeft - marginLeft,
        y: y - rect.top - currentTarget.clientTop - marginTop
      };
    }
  }, {
    key: '_handleNearestX',
    value: function _handleNearestX(event) {
      var _props3 = this.props,
          onNearestX = _props3.onNearestX,
          data = _props3.data;
      var minDistance = Number.POSITIVE_INFINITY;
      var value = null;
      var valueIndex = null;

      var coordinate = this._getXYCoordinateInContainer(event);

      var xScaleFn = this._getAttributeFunctor('x');

      data.forEach(function (item, i) {
        var currentCoordinate = xScaleFn(item);
        var newDistance = Math.abs(coordinate.x - currentCoordinate);

        if (newDistance < minDistance) {
          minDistance = newDistance;
          value = item;
          valueIndex = i;
        }
      });

      if (!value) {
        return;
      }

      onNearestX(value, {
        innerX: xScaleFn(value),
        index: valueIndex,
        event: event.nativeEvent
      });
    }
  }, {
    key: '_handleNearestXY',
    value: function _handleNearestXY(event) {
      var _props4 = this.props,
          onNearestXY = _props4.onNearestXY,
          data = _props4.data;

      var coordinate = this._getXYCoordinateInContainer(event);

      var xScaleFn = this._getAttributeFunctor('x');

      var yScaleFn = this._getAttributeFunctor('y'); // Create a voronoi with each node center points


      var voronoiInstance = voronoi().x(xScaleFn).y(yScaleFn);
      var foundPoint = voronoiInstance(data).find(coordinate.x, coordinate.y);
      var value = foundPoint.data;

      if (!value) {
        return;
      }

      onNearestXY(value, {
        innerX: foundPoint[0],
        innerY: foundPoint[1],
        index: foundPoint.index,
        event: event.nativeEvent
      });
    }
    /**
     * Click handler for the entire series.
     * @param {Object} event Event.
     * @protected
     */

    /**
     * Mouse out handler for the entire series.
     * @param {Object} event Event.
     * @protected
     */

    /**
     * Mouse over handler for the entire series.
     * @param {Object} event Event.
     * @protected
     */

    /**
     * Right Click handler for the entire series.
     * @param {Object} event Event.
     * @protected
     */

    /**
     * Click handler for the specific series' value.
     * @param {Object} d Value object
     * @param {Object} event Event.
     * @protected
     */

    /**
     * Mouse out handler for the specific series' value.
     * @param {Object} d Value object
     * @param {Object} event Event.
     * @protected
     */

    /**
     * Mouse over handler for the specific series' value.
     * @param {Object} d Value object
     * @param {Object} event Event.
     * @protected
     */

    /**
     * Right Click handler for the specific series' value.
     * @param {Object} d Value object
     * @param {Object} event Event.
     * @protected
     */

  }], [{
    key: 'getParentConfig',

    /**
     * Get a default config for the parent.
     * @returns {Object} Empty config.
     */
    value: function getParentConfig() {
      return {};
    }
    /**
     * Tells the rest of the world that it requires SVG to work.
     * @returns {boolean} Result.
     */

  }, {
    key: 'requiresSVG',
    get: function get() {
      return true;
    }
  }]);

  return AbstractSeries;
}(PureComponent);

AbstractSeries.displayName = 'AbstractSeries';
AbstractSeries.propTypes = propTypes$1;
AbstractSeries.defaultProps = defaultProps; // Copyright (c) 2016 - 2017 Uber Technologies, Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
// THE SOFTWARE.

var DISCRETE_COLOR_RANGE = ['#12939A', '#79C7E3', '#1A3177', '#FF9833', '#EF5D28'];
var EXTENDED_DISCRETE_COLOR_RANGE = ['#19CDD7', '#DDB27C', '#88572C', '#FF991F', '#F15C17', '#223F9A', '#DA70BF', '#125C77', '#4DC19C', '#776E57', '#12939A', '#17B8BE', '#F6D18A', '#B7885E', '#FFCB99', '#F89570', '#829AE3', '#E79FD5', '#1E96BE', '#89DAC1', '#B3AD9E'];
var CONTINUOUS_COLOR_RANGE = ['#EF5D28', '#FF9833'];
var SIZE_RANGE = [1, 10];
var OPACITY_TYPE = 'literal';
var DEFAULT_OPACITY = 1;
var DEFAULT_SIZE = 5;
var DEFAULT_COLOR = DISCRETE_COLOR_RANGE[0];

var _extends$3 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _defineProperty$1(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}
/**
 * Check if the component is series or not.
 * @param {React.Component} child Component.
 * @returns {boolean} True if the child is series, false otherwise.
 */


function isSeriesChild(child) {
  var prototype = child.type.prototype;
  return prototype instanceof AbstractSeries;
}
/**
 * Get all series from the 'children' object of the component.
 * @param {Object} children Children.
 * @returns {Array} Array of children.
 */


function getSeriesChildren(children) {
  return React.Children.toArray(children).filter(function (child) {
    return child && isSeriesChild(child);
  });
}
/**
 * Collect the map of repetitions of the series type for all children.
 * @param {Array} children Array of children.
 * @returns {{}} Map of repetitions where sameTypeTotal is the total amount and
 * sameTypeIndex is always 0.
 */


function collectSeriesTypesInfo(children) {
  var result = {};
  children.filter(isSeriesChild).forEach(function (child) {
    var displayName = child.type.displayName;
    var cluster = child.props.cluster;

    if (!result[displayName]) {
      result[displayName] = {
        sameTypeTotal: 0,
        sameTypeIndex: 0,
        clusters: new Set()
      };
    }

    result[displayName].clusters.add(cluster);
    result[displayName].sameTypeTotal++;
  });
  return result;
}
/**
 * Check series to see if it has angular data that needs to be converted
 * @param {Array} data - an array of objects to check
 * @returns {Boolean} whether or not this series contains polar configuration
 */


function seriesHasAngleRadius() {
  var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : [];

  if (!data) {
    return false;
  }

  return data.some(function (row) {
    return row.radius && row.angle;
  });
}
/**
 * Possibly convert polar coordinates to x/y for computing domain
 * @param {Array} data - an array of objects to check
 * @param {String} attr - the property being checked
 * @returns {Boolean} whether or not this series contains polar configuration
 */


function prepareData(data) {
  if (!seriesHasAngleRadius(data)) {
    return data;
  }

  return data.map(function (row) {
    return _extends$3({}, row, {
      x: row.radius * Math.cos(row.angle),
      y: row.radius * Math.sin(row.angle)
    });
  });
}
/**
 * Collect the stacked data for all children in use. If the children don't have
 * the data (e.g. the child is invalid series or something else), then the child
 * is skipped.
 * Each next value of attr is equal to the previous value plus the difference
 * between attr0 and attr.
 * @param {Array} children Array of children.
 * @param {string} attr Attribute to stack by.
 * @returns {Array} New array of children for the series.
 */


function getStackedData(children, attr) {
  var areSomeSeriesStacked = children.some(function (series) {
    return series && series.props.stack;
  }); // It stores the last segment position added to each bar, separated by cluster.

  var latestAttrPositions = {};
  return children.reduce(function (accumulator, series, seriesIndex) {
    // Skip the children that are not series (e.g. don't have any data).
    if (!series) {
      accumulator.push(null);
      return accumulator;
    }

    var seriesType = series.type.displayName;
    var _series$props = series.props,
        data = _series$props.data,
        _series$props$cluster = _series$props.cluster,
        cluster = _series$props$cluster === undefined ? 'default' : _series$props$cluster,
        stack = _series$props.stack;
    var preppedData = prepareData(data);

    if (!attr || !preppedData || !preppedData.length || areSomeSeriesStacked && !stack) {
      accumulator.push(preppedData);
      return accumulator;
    }

    var attr0 = attr + '0';
    var baseAttr = attr === 'y' ? 'x' : 'y';
    accumulator.push(preppedData.map(function (d, dIndex) {
      var _extends2, _latestAttrPositions$2;

      if (!latestAttrPositions[cluster]) {
        latestAttrPositions[cluster] = {};
      }

      if (!latestAttrPositions[cluster][seriesType]) {
        latestAttrPositions[cluster][seriesType] = {};
      }

      var prevD = latestAttrPositions[cluster][seriesType][d[baseAttr]]; // It is the first segment of a bar.

      if (!prevD) {
        var _latestAttrPositions$;

        latestAttrPositions[cluster][seriesType][d[baseAttr]] = (_latestAttrPositions$ = {}, _defineProperty$1(_latestAttrPositions$, attr0, d[attr0]), _defineProperty$1(_latestAttrPositions$, attr, d[attr]), _latestAttrPositions$);
        return _extends$3({}, d);
      } // Calculate the position of the next segment in a bar.


      var nextD = _extends$3({}, d, (_extends2 = {}, _defineProperty$1(_extends2, attr0, prevD[attr]), _defineProperty$1(_extends2, attr, prevD[attr] + d[attr] - (d[attr0] || 0)), _extends2));

      latestAttrPositions[cluster][seriesType][d[baseAttr]] = (_latestAttrPositions$2 = {}, _defineProperty$1(_latestAttrPositions$2, attr0, nextD[attr0]), _defineProperty$1(_latestAttrPositions$2, attr, nextD[attr]), _latestAttrPositions$2);
      return nextD;
    }));
    return accumulator;
  }, []);
}
/**
 * Get the list of series props for a child.
 * @param {Array} children Array of all children.
 * @returns {Array} Array of series props for each child. If a child is not a
 * series, than it's undefined.
 */


function getSeriesPropsFromChildren(children) {
  var result = [];
  var seriesTypesInfo = collectSeriesTypesInfo(children);
  var seriesIndex = 0;
  var _opacityValue = DEFAULT_OPACITY;
  children.forEach(function (child) {
    var props = void 0;

    if (isSeriesChild(child)) {
      var seriesTypeInfo = seriesTypesInfo[child.type.displayName];
      var _colorValue = DISCRETE_COLOR_RANGE[seriesIndex % DISCRETE_COLOR_RANGE.length];
      props = _extends$3({}, seriesTypeInfo, {
        seriesIndex: seriesIndex,
        _colorValue: _colorValue,
        _opacityValue: _opacityValue
      });
      seriesTypeInfo.sameTypeIndex++;
      seriesIndex++;

      if (child.props.cluster) {
        props.cluster = child.props.cluster; // Using Array.from() so we can use .indexOf

        props.clusters = Array.from(seriesTypeInfo.clusters);
        props.sameTypeTotal = props.clusters.length;
        props.sameTypeIndex = props.clusters.indexOf(child.props.cluster);
      }
    }

    result.push(props);
  });
  return result;
}
/**
 * Find the max radius value from the nodes to be rendered after they have been
 * transformed into an array
 * @param {Array} data - the tree data after it has been broken into a iterable
 * it is an array of objects!
 * @returns {number} the maximum value in coordinates for the radial variable
 */


function getRadialDomain(data) {
  return data.reduce(function (res, row) {
    return Math.max(row.radius, res);
  }, 0);
}

var ANIMATED_SERIES_PROPS = ['xRange', 'xDomain', 'x', 'yRange', 'yDomain', 'y', 'colorRange', 'colorDomain', 'color', 'opacityRange', 'opacityDomain', 'opacity', 'strokeRange', 'strokeDomain', 'stroke', 'fillRange', 'fillDomain', 'fill', 'width', 'height', 'marginLeft', 'marginTop', 'marginRight', 'marginBottom', 'data', 'angleDomain', 'angleRange', 'angle', 'radiusDomain', 'radiusRange', 'radius', 'innerRadiusDomain', 'innerRadiusRange', 'innerRadius'];

function getStackParams(props) {
  var _stackBy = props._stackBy,
      valuePosAttr = props.valuePosAttr,
      cluster = props.cluster;
  var _props$sameTypeTotal = props.sameTypeTotal,
      sameTypeTotal = _props$sameTypeTotal === undefined ? 1 : _props$sameTypeTotal,
      _props$sameTypeIndex = props.sameTypeIndex,
      sameTypeIndex = _props$sameTypeIndex === undefined ? 0 : _props$sameTypeIndex; // If bars are stacked, but not clustering, override `sameTypeTotal` and
  // `sameTypeIndex` such that bars are stacked and not staggered.

  if (_stackBy === valuePosAttr && !cluster) {
    sameTypeTotal = 1;
    sameTypeIndex = 0;
  }

  return {
    sameTypeTotal: sameTypeTotal,
    sameTypeIndex: sameTypeIndex
  };
}

var _createClass$2 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$4 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _classCallCheck$2(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$2(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$2(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName = 'rv-xy-plot__series rv-xy-plot__series--arc';
var ATTRIBUTES = ['radius', 'angle'];

var defaultProps$1 = _extends$4({}, AbstractSeries.defaultProps, {
  center: {
    x: 0,
    y: 0
  },
  arcClassName: '',
  className: '',
  style: {},
  padAngle: 0
});
/**
 * Prepare the internal representation of row for real use.
 * This is necessary because d3 insists on starting at 12 oclock and moving
 * clockwise, rather than starting at 3 oclock and moving counter clockwise
 * as one might expect from polar
 * @param {Object} row - coordinate object to be modifed
 * @return {Object} angle corrected object
 */


function modifyRow(row) {
  var radius = row.radius,
      angle = row.angle,
      angle0 = row.angle0;
  var truedAngle = -1 * angle + Math.PI / 2;
  var truedAngle0 = -1 * angle0 + Math.PI / 2;
  return _extends$4({}, row, {
    x: radius * Math.cos(truedAngle),
    y: radius * Math.sin(truedAngle),
    angle: truedAngle,
    angle0: truedAngle0
  });
}

var ArcSeries = function (_AbstractSeries) {
  _inherits$2(ArcSeries, _AbstractSeries);

  function ArcSeries(props) {
    _classCallCheck$2(this, ArcSeries);

    var _this = _possibleConstructorReturn$2(this, (ArcSeries.__proto__ || Object.getPrototypeOf(ArcSeries)).call(this, props));

    var scaleProps = _this._getAllScaleProps(props);

    _this.state = {
      scaleProps: scaleProps
    };
    return _this;
  }

  _createClass$2(ArcSeries, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      this.setState({
        scaleProps: this._getAllScaleProps(nextProps)
      });
    }
    /**
     * Get the map of scales from the props.
     * @param {Object} props Props.
     * @param {Array} data Array of all data.
     * @returns {Object} Map of scales.
     * @private
     */

  }, {
    key: '_getAllScaleProps',
    value: function _getAllScaleProps(props) {
      var defaultScaleProps = this._getDefaultScaleProps(props);

      var userScaleProps = extractScalePropsFromProps(props, ATTRIBUTES);
      var missingScaleProps = getMissingScaleProps(_extends$4({}, defaultScaleProps, userScaleProps), props.data, ATTRIBUTES);
      return _extends$4({}, defaultScaleProps, userScaleProps, missingScaleProps);
    }
    /**
     * Get the list of scale-related settings that should be applied by default.
     * @param {Object} props Object of props.
     * @returns {Object} Defaults.
     * @private
     */

  }, {
    key: '_getDefaultScaleProps',
    value: function _getDefaultScaleProps(props) {
      var innerWidth = props.innerWidth,
          innerHeight = props.innerHeight;
      var radius = Math.min(innerWidth / 2, innerHeight / 2);
      return {
        radiusRange: [0, radius],
        _radiusValue: radius,
        angleType: 'literal'
      };
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          arcClassName = _props.arcClassName,
          animation = _props.animation,
          className = _props.className,
          center = _props.center,
          data = _props.data,
          disableSeries = _props.disableSeries,
          hideSeries = _props.hideSeries,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          padAngle = _props.padAngle,
          style = _props.style;

      if (!data) {
        return null;
      }

      if (animation) {
        var cloneData = data.map(function (d) {
          return _extends$4({}, d);
        });
        return React.createElement('g', {
          className: 'rv-xy-plot__series--arc__animation-wrapper'
        }, React.createElement(Animation, _extends$4({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS,
          data: cloneData
        }), React.createElement(ArcSeries, _extends$4({}, this.props, {
          animation: null,
          disableSeries: true,
          data: cloneData
        }))), React.createElement(ArcSeries, _extends$4({}, this.props, {
          animation: null,
          hideSeries: true,
          style: {
            stroke: 'red'
          }
        })));
      }

      var scaleProps = this.state.scaleProps;
      var radiusDomain = scaleProps.radiusDomain; // need to generate our own functors as abstract series doesnt have anythign for us

      var radius = getAttributeFunctor(scaleProps, 'radius');
      var radius0 = getAttr0Functor(scaleProps, 'radius');
      var angle = getAttributeFunctor(scaleProps, 'angle');
      var angle0 = getAttr0Functor(scaleProps, 'angle'); // but it does have good color support!

      var fill = this._getAttributeFunctor('fill') || this._getAttributeFunctor('color');

      var stroke = this._getAttributeFunctor('stroke') || this._getAttributeFunctor('color');

      var opacity = this._getAttributeFunctor('opacity');

      var x = this._getAttributeFunctor('x');

      var y = this._getAttributeFunctor('y');

      return React.createElement('g', {
        className: predefinedClassName + ' ' + className,
        onMouseOver: this._seriesMouseOverHandler,
        onMouseOut: this._seriesMouseOutHandler,
        onClick: this._seriesClickHandler,
        onContextMenu: this._seriesRightClickHandler,
        opacity: hideSeries ? 0 : 1,
        pointerEvents: disableSeries ? 'none' : 'all',
        transform: 'translate(' + (marginLeft + x(center)) + ',' + (marginTop + y(center)) + ')'
      }, data.map(function (row, i) {
        var noRadius = radiusDomain[1] === radiusDomain[0];
        var arcArg = {
          innerRadius: noRadius ? 0 : radius0(row),
          outerRadius: radius(row),
          startAngle: angle0(row) || 0,
          endAngle: angle(row)
        };
        var arcedData = arc().padAngle(padAngle);
        var rowStyle = row.style || {};
        var rowClassName = row.className || '';
        return React.createElement('path', {
          style: _extends$4({
            opacity: opacity && opacity(row),
            stroke: stroke && stroke(row),
            fill: fill && fill(row)
          }, style, rowStyle),
          onClick: function onClick(e) {
            return _this2._valueClickHandler(modifyRow(row), e);
          },
          onContextMenu: function onContextMenu(e) {
            return _this2._valueRightClickHandler(modifyRow(row), e);
          },
          onMouseOver: function onMouseOver(e) {
            return _this2._valueMouseOverHandler(modifyRow(row), e);
          },
          onMouseOut: function onMouseOut(e) {
            return _this2._valueMouseOutHandler(modifyRow(row), e);
          },
          key: i,
          className: predefinedClassName + '-path ' + arcClassName + ' ' + rowClassName,
          d: arcedData(arcArg)
        });
      }));
    }
  }]);

  return ArcSeries;
}(AbstractSeries);

ArcSeries.propTypes = _extends$4({}, AbstractSeries.propTypes, getScalePropTypesByAttribute('radius'), getScalePropTypesByAttribute('angle'), {
  center: PropTypes.shape({
    x: PropTypes.number,
    y: PropTypes.number
  }),
  arcClassName: PropTypes.string,
  padAngle: PropTypes.oneOfType([PropTypes.func, PropTypes.number])
});
ArcSeries.defaultProps = defaultProps$1;
ArcSeries.displayName = 'ArcSeries';

var _extends$5 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$3 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$3(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$3(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$3(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$1 = 'rv-xy-plot__series rv-xy-plot__series--line';

var AreaSeries = function (_AbstractSeries) {
  _inherits$3(AreaSeries, _AbstractSeries);

  function AreaSeries() {
    _classCallCheck$3(this, AreaSeries);

    return _possibleConstructorReturn$3(this, (AreaSeries.__proto__ || Object.getPrototypeOf(AreaSeries)).apply(this, arguments));
  }

  _createClass$3(AreaSeries, [{
    key: '_renderArea',
    value: function _renderArea(data, x, y0, y, curve, getNull) {
      var area$1 = area();

      if (curve !== null) {
        if (typeof curve === 'string' && d3Shape[curve]) {
          area$1 = area$1.curve(d3Shape[curve]);
        } else if (typeof curve === 'function') {
          area$1 = area$1.curve(curve);
        }
      }

      area$1 = area$1.defined(getNull);
      area$1 = area$1.x(x).y0(y0).y1(y);
      return area$1(data);
    }
  }, {
    key: 'render',
    value: function render() {
      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          curve = _props.curve,
          data = _props.data,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          style = _props.style;

      if (this.props.nullAccessor) {
        warning('nullAccessor has been renamed to getNull', true);
      }

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$5({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(AreaSeries, _extends$5({}, this.props, {
          animation: null
        })));
      }

      var x = this._getAttributeFunctor('x');

      var y = this._getAttributeFunctor('y');

      var y0 = this._getAttr0Functor('y');

      var stroke = this._getAttributeValue('stroke') || this._getAttributeValue('color');

      var fill = this._getAttributeValue('fill') || this._getAttributeValue('color');

      var newOpacity = this._getAttributeValue('opacity');

      var opacity = Number.isFinite(newOpacity) ? newOpacity : DEFAULT_OPACITY;
      var getNull = this.props.nullAccessor || this.props.getNull;

      var d = this._renderArea(data, x, y0, y, curve, getNull);

      return React.createElement('path', {
        d: d,
        className: predefinedClassName$1 + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')',
        onMouseOver: this._seriesMouseOverHandler,
        onMouseOut: this._seriesMouseOutHandler,
        onClick: this._seriesClickHandler,
        onContextMenu: this._seriesRightClickHandler,
        style: _extends$5({
          opacity: opacity,
          stroke: stroke,
          fill: fill
        }, style)
      });
    }
  }]);

  return AreaSeries;
}(AbstractSeries);

AreaSeries.displayName = 'AreaSeries';
AreaSeries.propTypes = _extends$5({}, AbstractSeries.propTypes, {
  getNull: PropTypes.func
});
AreaSeries.defaultProps = _extends$5({}, AbstractSeries.defaultProps, {
  getNull: function getNull() {
    return true;
  }
});

var _extends$6 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var propTypes$2 = {
  style: PropTypes.shape({
    bottom: PropTypes.object,
    left: PropTypes.object,
    right: PropTypes.object,
    top: PropTypes.object
  }),
  // supplied by xyplot
  marginTop: PropTypes.number,
  marginBottom: PropTypes.number,
  marginLeft: PropTypes.number,
  marginRight: PropTypes.number,
  innerWidth: PropTypes.number,
  innerHeight: PropTypes.number
};
var CLASSES = {
  bottom: 'rv-xy-plot__borders-bottom',
  container: 'rv-xy-plot__borders',
  left: 'rv-xy-plot__borders-left',
  right: 'rv-xy-plot__borders-right',
  top: 'rv-xy-plot__borders-top'
};

function Borders(props) {
  var marginTop = props.marginTop,
      marginBottom = props.marginBottom,
      marginLeft = props.marginLeft,
      marginRight = props.marginRight,
      innerWidth = props.innerWidth,
      innerHeight = props.innerHeight,
      style = props.style,
      className = props.className;
  var height = innerHeight + marginTop + marginBottom;
  var width = innerWidth + marginLeft + marginRight;
  return React.createElement('g', {
    className: CLASSES.container + ' ' + className
  }, React.createElement('rect', {
    className: CLASSES.bottom + ' ' + className + '-bottom',
    style: _extends$6({}, style.all, style.bottom),
    x: 0,
    y: height - marginBottom,
    width: width,
    height: marginBottom
  }), React.createElement('rect', {
    className: CLASSES.left + ' ' + className + '-left',
    style: _extends$6({}, style.all, style.left),
    x: 0,
    y: 0,
    width: marginLeft,
    height: height
  }), React.createElement('rect', {
    className: CLASSES.right + ' ' + className + '-right',
    style: _extends$6({}, style.all, style.right),
    x: width - marginRight,
    y: 0,
    width: marginRight,
    height: height
  }), React.createElement('rect', {
    className: CLASSES.top + ' ' + className + '-top',
    style: _extends$6({}, style.all, style.top),
    x: 0,
    y: 0,
    width: width,
    height: marginTop
  }));
}

Borders.displayName = 'Borders';
Borders.defaultProps = {
  className: '',
  style: {
    all: {},
    bottom: {},
    left: {},
    right: {},
    top: {}
  }
};
Borders.propTypes = propTypes$2;
Borders.requiresSVG = true;

var _createClass$4 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$4(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$4(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$4(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var ChartLabel = function (_React$PureComponent) {
  _inherits$4(ChartLabel, _React$PureComponent);

  function ChartLabel() {
    _classCallCheck$4(this, ChartLabel);

    return _possibleConstructorReturn$4(this, (ChartLabel.__proto__ || Object.getPrototypeOf(ChartLabel)).apply(this, arguments));
  }

  _createClass$4(ChartLabel, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          innerHeight = _props.innerHeight,
          innerWidth = _props.innerWidth,
          marginBottom = _props.marginBottom,
          marginLeft = _props.marginLeft,
          marginRight = _props.marginRight,
          marginTop = _props.marginTop,
          className = _props.className,
          includeMargin = _props.includeMargin,
          style = _props.style,
          text = _props.text,
          xPercent = _props.xPercent,
          yPercent = _props.yPercent;
      var width = innerWidth + (includeMargin ? marginLeft + marginRight : 0);
      var height = innerHeight + (includeMargin ? marginTop + marginBottom : 0);
      var xPos = width * xPercent + (includeMargin ? 0 : marginLeft);
      var yPos = height * yPercent + (includeMargin ? marginLeft : 0);
      return React.createElement('g', {
        transform: 'translate(' + xPos + ', ' + yPos + ')',
        className: 'rv-xy-plot__axis__title ' + className
      }, React.createElement('text', style, text));
    }
  }], [{
    key: 'requiresSVG',
    get: function get() {
      return true;
    }
  }]);

  return ChartLabel;
}(React.PureComponent);

ChartLabel.displayName = 'ChartLabel';
ChartLabel.propTypes = {
  className: PropTypes.string,
  includeMargin: PropTypes.bool,
  style: PropTypes.object,
  text: PropTypes.string.isRequired,
  xPercent: PropTypes.number.isRequired,
  yPercent: PropTypes.number.isRequired
};
ChartLabel.defaultProps = {
  className: '',
  includeMargin: true,
  text: '',
  xPercent: 0,
  yPercent: 0,
  style: {}
}; // Copyright (c) 2016 - 2017 Uber Technologies, Inc.

var ORIENTATION = {
  TOP: 'top',
  LEFT: 'left',
  RIGHT: 'right',
  BOTTOM: 'bottom',
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal'
};
var DIRECTION = {
  VERTICAL: 'vertical',
  HORIZONTAL: 'horizontal'
};
/**
 * Get total amount of ticks from a given size in pixels.
 * @param {number} size Size of the axis in pixels.
 * @returns {number} Total amount of ticks.
 */

function getTicksTotalFromSize(size) {
  if (size < 700) {
    if (size > 300) {
      return 10;
    }

    return 5;
  }

  return 20;
}
/**
 * Get the tick values from a given d3 scale.
 * @param {d3.scale} scale Scale function.
 * @param {number} tickTotal Total number of ticks
 * @param {Array} tickValues Array of tick values if they exist.
 * @returns {Array} Array of tick values.
 */


function getTickValues(scale, tickTotal, tickValues) {
  return !tickValues ? scale.ticks ? scale.ticks(tickTotal) : scale.domain() : tickValues;
}
/**
 * Generate a description of a decorative axis in terms of a linear equation
 * y = slope * x + offset in coordinates
 * @param {Object} axisStart Object of format {x, y} describing in coordinates
 * the start position of the decorative axis
 * @param {Object} axisEnd Object of format {x, y} describing in coordinates
 * the start position of the decorative axis
 * @returns {Number} Object describing each the line in coordinates
 */


function generateFit(axisStart, axisEnd) {
  // address the special case when the slope is infinite
  if (axisStart.x === axisEnd.x) {
    return {
      left: axisStart.y,
      right: axisEnd.y,
      slope: 0,
      offset: axisStart.x
    };
  }

  var slope = (axisStart.y - axisEnd.y) / (axisStart.x - axisEnd.x);
  return {
    left: axisStart.x,
    right: axisEnd.x,
    // generate the linear projection of the axis direction
    slope: slope,
    offset: axisStart.y - slope * axisStart.x
  };
}
/**
 * Generate a description of a decorative axis in terms of a linear equation
 * y = slope * x + offset in coordinates
 * @param props
 * props.@param {Object} axisStart Object of format {x, y} describing in coordinates
 * the start position of the decorative axis
 * props.@param {Object} axisEnd Object of format {x, y} describing in coordinates
 * the start position of the decorative axis
 * props.@param {Number} numberOfTicks The number of ticks on the axis
 * props.@param {Array.Numbers} axisDomain The values to be interpolated across for the axis
 * @returns {Number} Object describing the slope and the specific coordinates of the points
 */


function generatePoints(_ref) {
  var axisStart = _ref.axisStart,
      axisEnd = _ref.axisEnd,
      numberOfTicks = _ref.numberOfTicks,
      axisDomain = _ref.axisDomain;

  var _generateFit = generateFit(axisStart, axisEnd),
      left = _generateFit.left,
      right = _generateFit.right,
      slope = _generateFit.slope,
      offset = _generateFit.offset; // construct a linear band of points, then map them


  var pointSlope = (right - left) / numberOfTicks;
  var axisScale = scaleLinear().domain([left, right]).range(axisDomain);
  var slopeVertical = axisStart.x === axisEnd.x;
  return {
    slope: slopeVertical ? Infinity : slope,
    points: range(left, right + pointSlope, pointSlope).map(function (val) {
      if (slopeVertical) {
        return {
          y: val,
          x: slope * val + offset,
          text: axisScale(val)
        };
      }

      return {
        x: val,
        y: slope * val + offset,
        text: axisScale(val)
      };
    }).slice(0, numberOfTicks + 1)
  };
}
/**
 * Compute the angle (in radians) of a decorative axis
 * @param {Object} axisStart Object of format {x, y} describing in coordinates
 * the start position of the decorative axis
 * @param {Object} axisEnd Object of format {x, y} describing in coordinates
 * the start position of the decorative axis
 * @returns {Number} Angle in radials
 */


function getAxisAngle(axisStart, axisEnd) {
  if (axisStart.x === axisEnd.x) {
    return axisEnd.y > axisStart.y ? Math.PI / 2 : 3 * Math.PI / 2;
  }

  return Math.atan((axisEnd.y - axisStart.y) / (axisEnd.x - axisStart.x));
}

var axisUtils = {
  DIRECTION: DIRECTION,
  ORIENTATION: ORIENTATION,
  getTicksTotalFromSize: getTicksTotalFromSize,
  getTickValues: getTickValues
};

var _extends$7 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$5 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$5(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$5(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$5(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var animatedProps = ['xRange', 'yRange', 'xDomain', 'yDomain', 'width', 'height', 'marginLeft', 'marginTop', 'marginRight', 'marginBottom', 'tickTotal'];

var CircularGridLines = function (_PureComponent) {
  _inherits$5(CircularGridLines, _PureComponent);

  function CircularGridLines() {
    _classCallCheck$5(this, CircularGridLines);

    return _possibleConstructorReturn$5(this, (CircularGridLines.__proto__ || Object.getPrototypeOf(CircularGridLines)).apply(this, arguments));
  }

  _createClass$5(CircularGridLines, [{
    key: '_getDefaultProps',
    value: function _getDefaultProps() {
      var _props = this.props,
          innerWidth = _props.innerWidth,
          innerHeight = _props.innerHeight,
          marginTop = _props.marginTop,
          marginLeft = _props.marginLeft;
      return {
        left: marginLeft,
        top: marginTop,
        width: innerWidth,
        height: innerHeight,
        style: {},
        tickTotal: getTicksTotalFromSize(Math.min(innerWidth, innerHeight))
      };
    }
  }, {
    key: 'render',
    value: function render() {
      var _props2 = this.props,
          animation = _props2.animation,
          centerX = _props2.centerX,
          centerY = _props2.centerY;

      if (animation) {
        return React.createElement(Animation, _extends$7({}, this.props, {
          animatedProps: animatedProps
        }), React.createElement(CircularGridLines, _extends$7({}, this.props, {
          animation: null
        })));
      }

      var props = _extends$7({}, this._getDefaultProps(), this.props);

      var tickTotal = props.tickTotal,
          tickValues = props.tickValues,
          marginLeft = props.marginLeft,
          marginTop = props.marginTop,
          rRange = props.rRange,
          style = props.style;
      var xScale = getAttributeScale(props, 'x');
      var yScale = getAttributeScale(props, 'y');
      var values = getTickValues(xScale, tickTotal, tickValues);
      return React.createElement('g', {
        transform: 'translate(' + (xScale(centerX) + marginLeft) + ',' + (yScale(centerY) + marginTop) + ')',
        className: 'rv-xy-plot__circular-grid-lines'
      }, values.reduce(function (res, value, index) {
        var radius = xScale(value);

        if (rRange && (radius < rRange[0] || radius > rRange[1])) {
          return res;
        }

        return res.concat([React.createElement('circle', _extends$7({
          cx: 0,
          cy: 0,
          r: radius
        }, {
          key: index,
          className: 'rv-xy-plot__circular-grid-lines__line',
          style: style
        }))]);
      }, []));
    }
  }]);

  return CircularGridLines;
}(PureComponent);

CircularGridLines.displayName = 'CircularGridLines';
CircularGridLines.propTypes = {
  centerX: PropTypes.number,
  centerY: PropTypes.number,
  width: PropTypes.number,
  height: PropTypes.number,
  top: PropTypes.number,
  left: PropTypes.number,
  rRange: PropTypes.arrayOf(PropTypes.number),
  style: PropTypes.object,
  tickValues: PropTypes.arrayOf(PropTypes.number),
  tickTotal: PropTypes.number,
  animation: AnimationPropType,
  // generally supplied by xyplot
  marginTop: PropTypes.number,
  marginBottom: PropTypes.number,
  marginLeft: PropTypes.number,
  marginRight: PropTypes.number,
  innerWidth: PropTypes.number,
  innerHeight: PropTypes.number
};
CircularGridLines.defaultProps = {
  centerX: 0,
  centerY: 0
};
CircularGridLines.requiresSVG = true;

var _extends$8 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$6 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$6(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$6(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$6(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$2 = 'rv-xy-plot__series rv-xy-plot__series--contour';

function getDomain(data) {
  return data.reduce(function (acc, row) {
    return {
      min: Math.min(acc.min, row.value),
      max: Math.max(acc.max, row.value)
    };
  }, {
    min: Infinity,
    max: -Infinity
  });
}

var ContourSeries = function (_AbstractSeries) {
  _inherits$6(ContourSeries, _AbstractSeries);

  function ContourSeries() {
    _classCallCheck$6(this, ContourSeries);

    return _possibleConstructorReturn$6(this, (ContourSeries.__proto__ || Object.getPrototypeOf(ContourSeries)).apply(this, arguments));
  }

  _createClass$6(ContourSeries, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          animation = _props.animation,
          bandwidth = _props.bandwidth,
          className = _props.className,
          colorRange = _props.colorRange,
          data = _props.data,
          innerHeight = _props.innerHeight,
          innerWidth = _props.innerWidth,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          style = _props.style;

      if (!data || !innerWidth || !innerHeight) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$8({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(ContourSeries, _extends$8({}, this.props, {
          animation: null
        })));
      }

      var x = this._getAttributeFunctor('x');

      var y = this._getAttributeFunctor('y');

      var contouredData = contourDensity().x(function (d) {
        return x(d);
      }).y(function (d) {
        return y(d);
      }).size([innerWidth, innerHeight]).bandwidth(bandwidth)(data);
      var geo = geoPath();

      var _getDomain = getDomain(contouredData),
          min = _getDomain.min,
          max = _getDomain.max;

      var colorScale = scaleLinear().domain([min, max]).range(colorRange || CONTINUOUS_COLOR_RANGE);
      return React.createElement('g', {
        className: predefinedClassName$2 + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, contouredData.map(function (polygon, index) {
        return React.createElement('path', {
          className: 'rv-xy-plot__series--contour-line',
          key: 'rv-xy-plot__series--contour-line-' + index,
          d: geo(polygon),
          style: _extends$8({
            fill: colorScale(polygon.value)
          }, style)
        });
      }));
    }
  }]);

  return ContourSeries;
}(AbstractSeries);

ContourSeries.propTypes = _extends$8({}, AbstractSeries.propTypes, {
  animation: PropTypes.bool,
  bandwidth: PropTypes.number,
  className: PropTypes.string,
  marginLeft: PropTypes.number,
  marginTop: PropTypes.number,
  style: PropTypes.object
});
ContourSeries.defaultProps = _extends$8({}, AbstractSeries.defaultProps, {
  bandwidth: 40,
  style: {}
});

var _extends$9 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$7 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$7(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$7(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$7(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}
/**
 * Format title by detault.
 * @param {Array} values List of values.
 * @returns {*} Formatted value or undefined.
 */


function defaultTitleFormat(values) {
  var value = getFirstNonEmptyValue(values);

  if (value) {
    return {
      title: 'x',
      value: transformValueToString(value.x)
    };
  }
}
/**
 * Format items by default.
 * @param {Array} values Array of values.
 * @returns {*} Formatted list of items.
 */


function defaultItemsFormat(values) {
  return values.map(function (v, i) {
    if (v) {
      return {
        value: v.y,
        title: i
      };
    }
  });
}
/**
 * Get the first non-empty item from an array.
 * @param {Array} values Array of values.
 * @returns {*} First non-empty value or undefined.
 */


function getFirstNonEmptyValue(values) {
  return (values || []).find(function (v) {
    return Boolean(v);
  });
}

var Crosshair = function (_PureComponent) {
  _inherits$7(Crosshair, _PureComponent);

  function Crosshair() {
    _classCallCheck$7(this, Crosshair);

    return _possibleConstructorReturn$7(this, (Crosshair.__proto__ || Object.getPrototypeOf(Crosshair)).apply(this, arguments));
  }

  _createClass$7(Crosshair, [{
    key: '_renderCrosshairItems',

    /**
     * Render crosshair items (title + value for each series).
     * @returns {*} Array of React classes with the crosshair values.
     * @private
     */
    value: function _renderCrosshairItems() {
      var _props = this.props,
          values = _props.values,
          itemsFormat = _props.itemsFormat;
      var items = itemsFormat(values);

      if (!items) {
        return null;
      }

      return items.filter(function (i) {
        return i;
      }).map(function renderValue(item, i) {
        return React.createElement('div', {
          className: 'rv-crosshair__item',
          key: 'item' + i
        }, React.createElement('span', {
          className: 'rv-crosshair__item__title'
        }, item.title), ': ', React.createElement('span', {
          className: 'rv-crosshair__item__value'
        }, item.value));
      });
    }
    /**
     * Render crosshair title.
     * @returns {*} Container with the crosshair title.
     * @private
     */

  }, {
    key: '_renderCrosshairTitle',
    value: function _renderCrosshairTitle() {
      var _props2 = this.props,
          values = _props2.values,
          titleFormat = _props2.titleFormat,
          style = _props2.style;
      var titleItem = titleFormat(values);

      if (!titleItem) {
        return null;
      }

      return React.createElement('div', {
        className: 'rv-crosshair__title',
        key: 'title',
        style: style.title
      }, React.createElement('span', {
        className: 'rv-crosshair__title__title'
      }, titleItem.title), ': ', React.createElement('span', {
        className: 'rv-crosshair__title__value'
      }, titleItem.value));
    }
  }, {
    key: 'render',
    value: function render() {
      var _props3 = this.props,
          children = _props3.children,
          className = _props3.className,
          values = _props3.values,
          marginTop = _props3.marginTop,
          marginLeft = _props3.marginLeft,
          innerWidth = _props3.innerWidth,
          innerHeight = _props3.innerHeight,
          style = _props3.style;
      var value = getFirstNonEmptyValue(values);

      if (!value) {
        return null;
      }

      var x = getAttributeFunctor(this.props, 'x');
      var innerLeft = x(value);
      var _props$orientation = this.props.orientation,
          orientation = _props$orientation === undefined ? innerLeft > innerWidth / 2 ? 'left' : 'right' : _props$orientation;
      var left = marginLeft + innerLeft;
      var top = marginTop;
      var innerClassName = 'rv-crosshair__inner rv-crosshair__inner--' + orientation;
      return React.createElement('div', {
        className: 'rv-crosshair ' + className,
        style: {
          left: left + 'px',
          top: top + 'px'
        }
      }, React.createElement('div', {
        className: 'rv-crosshair__line',
        style: _extends$9({
          height: innerHeight + 'px'
        }, style.line)
      }), React.createElement('div', {
        className: innerClassName
      }, children ? children : React.createElement('div', {
        className: 'rv-crosshair__inner__content',
        style: style.box
      }, React.createElement('div', null, this._renderCrosshairTitle(), this._renderCrosshairItems()))));
    }
  }], [{
    key: 'defaultProps',
    get: function get() {
      return {
        titleFormat: defaultTitleFormat,
        itemsFormat: defaultItemsFormat,
        style: {
          line: {},
          title: {},
          box: {}
        }
      };
    }
  }, {
    key: 'propTypes',
    get: function get() {
      return {
        className: PropTypes.string,
        values: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string, PropTypes.object])),
        series: PropTypes.object,
        innerWidth: PropTypes.number,
        innerHeight: PropTypes.number,
        marginLeft: PropTypes.number,
        marginTop: PropTypes.number,
        orientation: PropTypes.oneOf(['left', 'right']),
        itemsFormat: PropTypes.func,
        titleFormat: PropTypes.func,
        style: PropTypes.shape({
          line: PropTypes.object,
          title: PropTypes.object,
          box: PropTypes.object
        })
      };
    }
  }]);

  return Crosshair;
}(PureComponent);

Crosshair.displayName = 'Crosshair';

var _createClass$8 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$a = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _classCallCheck$8(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$8(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$8(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

function _toConsumableArray$1(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  } else {
    return Array.from(arr);
  }
}

var predefinedClassName$3 = 'rv-xy-plot__series rv-xy-plot__series--custom-svg-wrapper';
var DEFAULT_STYLE = {
  stroke: 'blue',
  fill: 'blue'
};

function predefinedComponents(type) {
  var size = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 2;
  var style = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : DEFAULT_STYLE;

  switch (type) {
    case 'diamond':
      return React.createElement('polygon', {
        style: style,
        points: '0 0 ' + size / 2 + ' ' + size / 2 + ' 0 ' + size + ' ' + -size / 2 + ' ' + size / 2 + ' 0 0'
      });

    case 'star':
      var starPoints = [].concat(_toConsumableArray$1(new Array(5))).map(function (c, index) {
        var angle = index / 5 * Math.PI * 2;
        var innerAngle = angle + Math.PI / 10;
        var outerAngle = angle - Math.PI / 10; // ratio of inner polygon to outer polgyon

        var innerRadius = size / 2.61;
        return '\n        ' + Math.cos(outerAngle) * size + ' ' + Math.sin(outerAngle) * size + '\n        ' + Math.cos(innerAngle) * innerRadius + ' ' + Math.sin(innerAngle) * innerRadius + '\n      ';
      }).join(' ');
      return React.createElement('polygon', {
        points: starPoints,
        x: '0',
        y: '0',
        height: size,
        width: size,
        style: style
      });

    case 'square':
      return React.createElement('rect', {
        x: '' + -size / 2,
        y: '' + -size / 2,
        height: size,
        width: size,
        style: style
      });

    default:
    case 'circle':
      return React.createElement('circle', {
        cx: '0',
        cy: '0',
        r: size / 2,
        style: style
      });
  }
}

function getInnerComponent(_ref) {
  var customComponent = _ref.customComponent,
      defaultType = _ref.defaultType,
      positionInPixels = _ref.positionInPixels,
      positionFunctions = _ref.positionFunctions,
      style = _ref.style,
      propsSize = _ref.propsSize;
  var size = customComponent.size;

  var aggStyle = _extends$a({}, style, customComponent.style || {});

  var innerComponent = customComponent.customComponent;

  if (!innerComponent && typeof defaultType === 'string') {
    return predefinedComponents(defaultType, size || propsSize, aggStyle);
  } // if default component is a function


  if (!innerComponent) {
    return defaultType(customComponent, positionInPixels, aggStyle);
  }

  if (typeof innerComponent === 'string') {
    return predefinedComponents(innerComponent || defaultType, size, aggStyle);
  } // if inner component is a function


  return innerComponent(customComponent, positionInPixels, aggStyle);
}

var CustomSVGSeries = function (_AbstractSeries) {
  _inherits$8(CustomSVGSeries, _AbstractSeries);

  function CustomSVGSeries() {
    _classCallCheck$8(this, CustomSVGSeries);

    return _possibleConstructorReturn$8(this, (CustomSVGSeries.__proto__ || Object.getPrototypeOf(CustomSVGSeries)).apply(this, arguments));
  }

  _createClass$8(CustomSVGSeries, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          customComponent = _props.customComponent,
          data = _props.data,
          innerHeight = _props.innerHeight,
          innerWidth = _props.innerWidth,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          style = _props.style,
          size = _props.size;

      if (!data || !innerWidth || !innerHeight) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$a({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(CustomSVGSeries, _extends$a({}, this.props, {
          animation: false
        })));
      }

      var x = this._getAttributeFunctor('x');

      var y = this._getAttributeFunctor('y');

      var contents = data.map(function (seriesComponent, index) {
        var positionInPixels = {
          x: x(seriesComponent),
          y: y(seriesComponent)
        };
        var innerComponent = getInnerComponent({
          customComponent: seriesComponent,
          positionInPixels: positionInPixels,
          defaultType: customComponent,
          positionFunctions: {
            x: x,
            y: y
          },
          style: style,
          propsSize: size
        });
        return React.createElement('g', {
          className: 'rv-xy-plot__series--custom-svg',
          key: 'rv-xy-plot__series--custom-svg-' + index,
          transform: 'translate(' + positionInPixels.x + ',' + positionInPixels.y + ')',
          onMouseEnter: function onMouseEnter(e) {
            return _this2._valueMouseOverHandler(seriesComponent, e);
          },
          onMouseLeave: function onMouseLeave(e) {
            return _this2._valueMouseOutHandler(seriesComponent, e);
          }
        }, innerComponent);
      });
      return React.createElement('g', {
        className: predefinedClassName$3 + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, contents);
    }
  }]);

  return CustomSVGSeries;
}(AbstractSeries);

CustomSVGSeries.propTypes = {
  animation: PropTypes.bool,
  className: PropTypes.string,
  customComponent: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  data: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    y: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired
  })).isRequired,
  marginLeft: PropTypes.number,
  marginTop: PropTypes.number,
  style: PropTypes.object,
  size: PropTypes.number,
  onValueMouseOver: PropTypes.func,
  onValueMouseOut: PropTypes.func
};
CustomSVGSeries.defaultProps = _extends$a({}, AbstractSeries.defaultProps, {
  animation: false,
  customComponent: 'circle',
  style: {},
  size: 2
});

var _extends$b = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};
/**
 * Generate the actual polygons to be plotted
 * @param {Object} props
 - props.animation {Boolean}
 - props.axisDomain {Array} a pair of values specifying the domain of the axis
 - props.numberOfTicks{Number} the number of ticks on the axis
 - props.axisStart {Object} a object specify in cartesian space the start of the axis
 example: {x: 0, y: 0}
 - props.axisEnd {Object} a object specify in cartesian space the start of the axis
 - props.tickValue {Func} a formatting function for the tick values
 - props.tickSize {Number} a pixel size of the axis
 - props.style {Object} The style object for the axis
 * @return {Component} the plotted axis
 */


function decorativeAxisTick(props) {
  var axisDomain = props.axisDomain,
      numberOfTicks = props.numberOfTicks,
      axisStart = props.axisStart,
      axisEnd = props.axisEnd,
      tickValue = props.tickValue,
      tickSize = props.tickSize,
      style = props.style;

  var _generatePoints = generatePoints({
    axisStart: axisStart,
    axisEnd: axisEnd,
    numberOfTicks: numberOfTicks,
    axisDomain: axisDomain
  }),
      points = _generatePoints.points; // add a quarter rotation to make ticks orthogonal to axis


  var tickAngle = getAxisAngle(axisStart, axisEnd) + Math.PI / 2;
  return points.map(function (point, index) {
    var tickProps = _extends$b({
      x1: 0,
      y1: 0,
      x2: tickSize * Math.cos(tickAngle),
      y2: tickSize * Math.sin(tickAngle)
    }, style.ticks);

    var textProps = _extends$b({
      x: tickSize * Math.cos(tickAngle),
      y: tickSize * Math.sin(tickAngle),
      textAnchor: 'start'
    }, style.text);

    return React.createElement('g', {
      key: index,
      transform: 'translate(' + point.x + ', ' + point.y + ')',
      className: 'rv-xy-plot__axis__tick'
    }, React.createElement('line', _extends$b({}, tickProps, {
      className: 'rv-xy-plot__axis__tick__line'
    })), React.createElement('text', _extends$b({}, textProps, {
      className: 'rv-xy-plot__axis__tick__text'
    }), tickValue(point.text)));
  });
}

var _extends$c = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$9 = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$9(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$9(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$9(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$4 = 'rv-xy-manipulable-axis rv-xy-plot__axis';
var animatedProps$1 = ['xRange', 'yRange', 'xDomain', 'yDomain', 'width', 'height', 'marginLeft', 'marginTop', 'marginRight', 'marginBottom', 'tickSize', 'tickTotal', 'tickSizeInner', 'tickSizeOuter'];

var DecorativeAxis = function (_AbstractSeries) {
  _inherits$9(DecorativeAxis, _AbstractSeries);

  function DecorativeAxis() {
    _classCallCheck$9(this, DecorativeAxis);

    return _possibleConstructorReturn$9(this, (DecorativeAxis.__proto__ || Object.getPrototypeOf(DecorativeAxis)).apply(this, arguments));
  }

  _createClass$9(DecorativeAxis, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          axisStart = _props.axisStart,
          axisEnd = _props.axisEnd,
          axisDomain = _props.axisDomain,
          numberOfTicks = _props.numberOfTicks,
          tickValue = _props.tickValue,
          tickSize = _props.tickSize,
          style = _props.style;

      if (animation) {
        return React.createElement(Animation, _extends$c({}, this.props, {
          animatedProps: animatedProps$1
        }), React.createElement(DecorativeAxis, _extends$c({}, this.props, {
          animation: null
        })));
      }

      var x = this._getAttributeFunctor('x');

      var y = this._getAttributeFunctor('y');

      return React.createElement('g', {
        className: predefinedClassName$4 + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, React.createElement('line', _extends$c({}, _extends$c({
        x1: x({
          x: axisStart.x
        }),
        x2: x({
          x: axisEnd.x
        }),
        y1: y({
          y: axisStart.y
        }),
        y2: y({
          y: axisEnd.y
        })
      }, style.line), {
        className: 'rv-xy-plot__axis__line'
      })), React.createElement('g', {
        className: 'rv-xy-manipulable-axis__ticks'
      }, decorativeAxisTick({
        axisDomain: axisDomain,
        axisEnd: {
          x: x(axisEnd),
          y: y(axisEnd)
        },
        axisStart: {
          x: x(axisStart),
          y: y(axisStart)
        },
        numberOfTicks: numberOfTicks,
        tickValue: tickValue,
        tickSize: tickSize,
        style: style
      })));
    }
  }]);

  return DecorativeAxis;
}(AbstractSeries);

var DEFAULT_FORMAT = format('.2r');
DecorativeAxis.defaultProps = {
  className: '',
  numberOfTicks: 10,
  tickValue: function tickValue(d) {
    return DEFAULT_FORMAT(d);
  },
  tickSize: 5,
  style: {
    line: {
      strokeWidth: 1
    },
    ticks: {
      strokeWidth: 2
    },
    text: {}
  }
};
DecorativeAxis.propTypes = _extends$c({}, AbstractSeries.propTypes, {
  axisDomain: PropTypes.arrayOf(PropTypes.number).isRequired,
  axisEnd: PropTypes.shape({
    x: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    y: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }).isRequired,
  axisStart: PropTypes.shape({
    x: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    y: PropTypes.oneOfType([PropTypes.number, PropTypes.string])
  }).isRequired,
  className: PropTypes.string,
  numberOfTicks: PropTypes.number,
  tickValue: PropTypes.func,
  tickSize: PropTypes.number,
  style: PropTypes.shape({
    line: PropTypes.object,
    ticks: PropTypes.object,
    text: PropTypes.object
  })
});
DecorativeAxis.displayName = 'DecorativeAxis'; // Copyright (c) 2016 - 2017 Uber Technologies, Inc.

var predefinedClassName$5 = 'rv-gradient-defs';

function GradientDefs(props) {
  var className = props.className;
  return React.createElement('defs', {
    className: predefinedClassName$5 + ' ' + className
  }, props.children);
}

GradientDefs.displayName = 'GradientDefs';
GradientDefs.requiresSVG = true;
GradientDefs.propTypes = {
  className: PropTypes.string
};
GradientDefs.defaultProps = {
  className: ''
};

var _extends$d = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$a = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _defineProperty$2(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _classCallCheck$a(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$a(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$a(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var VERTICAL = DIRECTION.VERTICAL,
    HORIZONTAL = DIRECTION.HORIZONTAL;
var propTypes$3 = {
  direction: PropTypes.oneOf([VERTICAL, HORIZONTAL]),
  attr: PropTypes.string.isRequired,
  width: PropTypes.number,
  height: PropTypes.number,
  top: PropTypes.number,
  left: PropTypes.number,
  style: PropTypes.object,
  tickValues: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
  tickTotal: PropTypes.number,
  animation: AnimationPropType,
  // generally supplied by xyplot
  marginTop: PropTypes.number,
  marginBottom: PropTypes.number,
  marginLeft: PropTypes.number,
  marginRight: PropTypes.number,
  innerWidth: PropTypes.number,
  innerHeight: PropTypes.number
};
var defaultProps$2 = {
  direction: VERTICAL
};
var animatedProps$2 = ['xRange', 'yRange', 'xDomain', 'yDomain', 'width', 'height', 'marginLeft', 'marginTop', 'marginRight', 'marginBottom', 'tickTotal'];

var GridLines = function (_PureComponent) {
  _inherits$a(GridLines, _PureComponent);

  function GridLines() {
    _classCallCheck$a(this, GridLines);

    return _possibleConstructorReturn$a(this, (GridLines.__proto__ || Object.getPrototypeOf(GridLines)).apply(this, arguments));
  }

  _createClass$a(GridLines, [{
    key: '_getDefaultProps',
    value: function _getDefaultProps() {
      var _props = this.props,
          innerWidth = _props.innerWidth,
          innerHeight = _props.innerHeight,
          marginTop = _props.marginTop,
          marginLeft = _props.marginLeft,
          direction = _props.direction;
      return {
        left: marginLeft,
        top: marginTop,
        width: innerWidth,
        height: innerHeight,
        tickTotal: getTicksTotalFromSize(direction === VERTICAL ? innerWidth : innerHeight)
      };
    }
  }, {
    key: 'render',
    value: function render() {
      var _props2 = this.props,
          animation = _props2.animation,
          className = _props2.className;

      if (animation) {
        return React.createElement(Animation, _extends$d({}, this.props, {
          animatedProps: animatedProps$2
        }), React.createElement(GridLines, _extends$d({}, this.props, {
          animation: null
        })));
      }

      var props = _extends$d({}, this._getDefaultProps(), this.props);

      var attr = props.attr,
          direction = props.direction,
          width = props.width,
          height = props.height,
          style = props.style,
          tickTotal = props.tickTotal,
          tickValues = props.tickValues,
          top = props.top,
          left = props.left;
      var isVertical = direction === VERTICAL;
      var tickXAttr = isVertical ? 'y' : 'x';
      var tickYAttr = isVertical ? 'x' : 'y';
      var length = isVertical ? height : width;
      var scale = getAttributeScale(props, attr);
      var values = getTickValues(scale, tickTotal, tickValues);
      return React.createElement('g', {
        transform: 'translate(' + left + ',' + top + ')',
        className: 'rv-xy-plot__grid-lines ' + className
      }, values.map(function (v, i) {
        var _pathProps;

        var pos = scale(v);
        var pathProps = (_pathProps = {}, _defineProperty$2(_pathProps, tickYAttr + '1', pos), _defineProperty$2(_pathProps, tickYAttr + '2', pos), _defineProperty$2(_pathProps, tickXAttr + '1', 0), _defineProperty$2(_pathProps, tickXAttr + '2', length), _pathProps);
        return React.createElement('line', _extends$d({}, pathProps, {
          key: i,
          className: 'rv-xy-plot__grid-lines__line',
          style: style
        }));
      }));
    }
  }]);

  return GridLines;
}(PureComponent);

GridLines.displayName = 'GridLines';
GridLines.defaultProps = defaultProps$2;
GridLines.propTypes = propTypes$3;
GridLines.requiresSVG = true;

var _extends$e = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$b = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$b(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$b(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$b(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$6 = 'rv-xy-plot__series rv-xy-plot__series--heatmap';

var HeatmapSeries = function (_AbstractSeries) {
  _inherits$b(HeatmapSeries, _AbstractSeries);

  function HeatmapSeries() {
    _classCallCheck$b(this, HeatmapSeries);

    return _possibleConstructorReturn$b(this, (HeatmapSeries.__proto__ || Object.getPrototypeOf(HeatmapSeries)).apply(this, arguments));
  }

  _createClass$b(HeatmapSeries, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          data = _props.data,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          style = _props.style;

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$e({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(HeatmapSeries, _extends$e({}, this.props, {
          animation: null
        })));
      }

      var _rectStyle$style = _extends$e({
        rectStyle: {}
      }, style),
          rectStyle = _rectStyle$style.rectStyle;

      var x = this._getAttributeFunctor('x');

      var y = this._getAttributeFunctor('y');

      var opacity = this._getAttributeFunctor('opacity');

      var fill = this._getAttributeFunctor('fill') || this._getAttributeFunctor('color');

      var stroke = this._getAttributeFunctor('stroke') || this._getAttributeFunctor('color');

      var xDistance = this._getScaleDistance('x');

      var yDistance = this._getScaleDistance('y');

      return React.createElement('g', {
        className: predefinedClassName$6 + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, data.map(function (d, i) {
        var attrs = _extends$e({
          style: _extends$e({
            stroke: stroke && stroke(d),
            fill: fill && fill(d),
            opacity: opacity && opacity(d)
          }, style)
        }, rectStyle, {
          x: x(d) - xDistance / 2,
          y: y(d) - yDistance / 2,
          width: xDistance,
          height: yDistance,
          key: i,
          onClick: function onClick(e) {
            return _this2._valueClickHandler(d, e);
          },
          onContextMenu: function onContextMenu(e) {
            return _this2._valueRightClickHandler(d, e);
          },
          onMouseOver: function onMouseOver(e) {
            return _this2._valueMouseOverHandler(d, e);
          },
          onMouseOut: function onMouseOut(e) {
            return _this2._valueMouseOutHandler(d, e);
          }
        });

        return React.createElement('rect', attrs);
      }));
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = attr === 'x' || attr === 'y';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded
      };
    }
  }]);

  return HeatmapSeries;
}(AbstractSeries);

HeatmapSeries.propTypes = _extends$e({}, AbstractSeries.propTypes);
HeatmapSeries.displayName = 'HeatmapSeries';

var _extends$f = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$c = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$c(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$c(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$c(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

function _toConsumableArray$2(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  } else {
    return Array.from(arr);
  }
}

var predefinedClassName$7 = 'rv-xy-plot__series rv-xy-plot__series--hexbin';

function getColorDomain(_ref, hexes) {
  var countDomain = _ref.countDomain;

  if (countDomain) {
    return countDomain;
  }

  return [0, Math.max.apply(Math, _toConsumableArray$2(hexes.map(function (row) {
    return row.length;
  })))];
}

var HexbinSeries = function (_AbstractSeries) {
  _inherits$c(HexbinSeries, _AbstractSeries);

  function HexbinSeries() {
    _classCallCheck$c(this, HexbinSeries);

    return _possibleConstructorReturn$c(this, (HexbinSeries.__proto__ || Object.getPrototypeOf(HexbinSeries)).apply(this, arguments));
  }

  _createClass$c(HexbinSeries, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          colorRange = _props.colorRange,
          data = _props.data,
          innerHeight = _props.innerHeight,
          innerWidth = _props.innerWidth,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          radius = _props.radius,
          sizeHexagonsWithCount = _props.sizeHexagonsWithCount,
          style = _props.style,
          xOffset = _props.xOffset,
          yOffset = _props.yOffset;

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$f({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(HexbinSeries, _extends$f({}, this.props, {
          animation: null
        })));
      }

      var x = this._getAttributeFunctor('x');

      var y = this._getAttributeFunctor('y');

      var hex = hexbin().x(function (d) {
        return x(d) + xOffset;
      }).y(function (d) {
        return y(d) + yOffset;
      }).radius(radius).size([innerWidth, innerHeight]);
      var hexagonPath = hex.hexagon();
      var hexes = hex(data);
      var countDomain = getColorDomain(this.props, hexes);
      var color = scaleLinear().domain(countDomain).range(colorRange);
      var size = scaleLinear().domain(countDomain).range([0, radius]);
      return React.createElement('g', {
        className: predefinedClassName$7 + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, hexes.map(function (d, i) {
        var attrs = {
          style: style,
          d: sizeHexagonsWithCount ? hex.hexagon(size(d.length)) : hexagonPath,
          fill: color(d.length),
          transform: 'translate(' + d.x + ', ' + d.y + ')',
          key: i,
          onClick: function onClick(e) {
            return _this2._valueClickHandler(d, e);
          },
          onContextMenu: function onContextMenu(e) {
            return _this2._valueRightClickHandler(d, e);
          },
          onMouseOver: function onMouseOver(e) {
            return _this2._valueMouseOverHandler(d, e);
          },
          onMouseOut: function onMouseOut(e) {
            return _this2._valueMouseOutHandler(d, e);
          }
        };
        return React.createElement('path', attrs);
      }));
    }
  }]);

  return HexbinSeries;
}(AbstractSeries);

HexbinSeries.propTypes = _extends$f({}, AbstractSeries.propTypes, {
  radius: PropTypes.number
});
HexbinSeries.defaultProps = {
  radius: 20,
  colorRange: CONTINUOUS_COLOR_RANGE,
  xOffset: 0,
  yOffset: 0
};
HexbinSeries.displayName = 'HexbinSeries';

var _extends$g = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$d = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$d(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$d(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$d(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

function getLocs(evt) {
  var xLoc = evt.type === 'touchstart' ? evt.pageX : evt.offsetX;
  var yLoc = evt.type === 'touchstart' ? evt.pageY : evt.offsetY;
  return {
    xLoc: xLoc,
    yLoc: yLoc
  };
}

var Highlight = function (_AbstractSeries) {
  _inherits$d(Highlight, _AbstractSeries);

  function Highlight() {
    var _ref;

    var _temp, _this, _ret;

    _classCallCheck$d(this, Highlight);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn$d(this, (_ref = Highlight.__proto__ || Object.getPrototypeOf(Highlight)).call.apply(_ref, [this].concat(args))), _this), _this.state = {
      dragging: false,
      brushArea: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      },
      brushing: false,
      startLocX: 0,
      startLocY: 0,
      dragArea: null
    }, _temp), _possibleConstructorReturn$d(_this, _ret);
  }

  _createClass$d(Highlight, [{
    key: '_getDrawArea',
    value: function _getDrawArea(xLoc, yLoc) {
      var _state = this.state,
          startLocX = _state.startLocX,
          startLocY = _state.startLocY;
      var _props = this.props,
          enableX = _props.enableX,
          enableY = _props.enableY,
          highlightWidth = _props.highlightWidth,
          highlightHeight = _props.highlightHeight,
          innerWidth = _props.innerWidth,
          innerHeight = _props.innerHeight,
          marginLeft = _props.marginLeft,
          marginRight = _props.marginRight,
          marginBottom = _props.marginBottom,
          marginTop = _props.marginTop;
      var plotHeight = innerHeight + marginTop + marginBottom;
      var plotWidth = innerWidth + marginLeft + marginRight;
      var touchWidth = highlightWidth || plotWidth;
      var touchHeight = highlightHeight || plotHeight;
      return {
        bottom: enableY ? Math.max(startLocY, yLoc) : touchHeight,
        right: enableX ? Math.max(startLocX, xLoc) : touchWidth,
        left: enableX ? Math.min(xLoc, startLocX) : 0,
        top: enableY ? Math.min(yLoc, startLocY) : 0
      };
    }
  }, {
    key: '_getDragArea',
    value: function _getDragArea(xLoc, yLoc) {
      var _props2 = this.props,
          enableX = _props2.enableX,
          enableY = _props2.enableY;
      var _state2 = this.state,
          startLocX = _state2.startLocX,
          startLocY = _state2.startLocY,
          dragArea = _state2.dragArea;
      return {
        bottom: dragArea.bottom + (enableY ? yLoc - startLocY : 0),
        left: dragArea.left + (enableX ? xLoc - startLocX : 0),
        right: dragArea.right + (enableX ? xLoc - startLocX : 0),
        top: dragArea.top + (enableY ? yLoc - startLocY : 0)
      };
    }
  }, {
    key: '_clickedOutsideDrag',
    value: function _clickedOutsideDrag(xLoc, yLoc) {
      var _props3 = this.props,
          enableX = _props3.enableX,
          enableY = _props3.enableY;
      var _state3 = this.state,
          dragArea = _state3.dragArea,
          _state3$brushArea = _state3.brushArea,
          left = _state3$brushArea.left,
          right = _state3$brushArea.right,
          top = _state3$brushArea.top,
          bottom = _state3$brushArea.bottom;
      var clickedOutsideDragX = dragArea && (xLoc < left || xLoc > right);
      var clickedOutsideDragY = dragArea && (yLoc < top || yLoc > bottom);

      if (enableX && enableY) {
        return clickedOutsideDragX || clickedOutsideDragY;
      }

      if (enableX) {
        return clickedOutsideDragX;
      }

      if (enableY) {
        return clickedOutsideDragY;
      }

      return true;
    }
  }, {
    key: '_convertAreaToCoordinates',
    value: function _convertAreaToCoordinates(brushArea) {
      // NOTE only continuous scales are supported for brushing/getting coordinates back
      var _props4 = this.props,
          enableX = _props4.enableX,
          enableY = _props4.enableY,
          marginLeft = _props4.marginLeft,
          marginTop = _props4.marginTop;
      var xScale = getAttributeScale(this.props, 'x');
      var yScale = getAttributeScale(this.props, 'y'); // Ensure that users wishes are being respected about which scales are evaluated
      // this is specifically enabled to ensure brushing on mixed categorical and linear
      // charts will run as expected

      if (enableX && enableY) {
        return {
          bottom: yScale.invert(brushArea.bottom),
          left: xScale.invert(brushArea.left - marginLeft),
          right: xScale.invert(brushArea.right - marginLeft),
          top: yScale.invert(brushArea.top)
        };
      }

      if (enableY) {
        return {
          bottom: yScale.invert(brushArea.bottom - marginTop),
          top: yScale.invert(brushArea.top - marginTop)
        };
      }

      if (enableX) {
        return {
          left: xScale.invert(brushArea.left - marginLeft),
          right: xScale.invert(brushArea.right - marginLeft)
        };
      }

      return {};
    }
  }, {
    key: 'startBrushing',
    value: function startBrushing(e) {
      var _this2 = this;

      var _props5 = this.props,
          onBrushStart = _props5.onBrushStart,
          onDragStart = _props5.onDragStart,
          drag = _props5.drag;
      var dragArea = this.state.dragArea;

      var _getLocs = getLocs(e.nativeEvent),
          xLoc = _getLocs.xLoc,
          yLoc = _getLocs.yLoc;

      var startArea = function startArea(dragging, resetDrag) {
        var emptyBrush = {
          bottom: yLoc,
          left: xLoc,
          right: xLoc,
          top: yLoc
        };

        _this2.setState({
          dragging: dragging,
          brushArea: dragArea && !resetDrag ? dragArea : emptyBrush,
          brushing: !dragging,
          startLocX: xLoc,
          startLocY: yLoc
        });
      };

      var clickedOutsideDrag = this._clickedOutsideDrag(xLoc, yLoc);

      if (drag && !dragArea || !drag || clickedOutsideDrag) {
        startArea(false, clickedOutsideDrag);

        if (onBrushStart) {
          onBrushStart(e);
        }

        return;
      }

      if (drag && dragArea) {
        startArea(true, clickedOutsideDrag);

        if (onDragStart) {
          onDragStart(e);
        }
      }
    }
  }, {
    key: 'stopBrushing',
    value: function stopBrushing(e) {
      var _state4 = this.state,
          brushing = _state4.brushing,
          dragging = _state4.dragging,
          brushArea = _state4.brushArea; // Quickly short-circuit if the user isn't brushing in our component

      if (!brushing && !dragging) {
        return;
      }

      var _props6 = this.props,
          onBrushEnd = _props6.onBrushEnd,
          onDragEnd = _props6.onDragEnd,
          drag = _props6.drag;
      var noHorizontal = Math.abs(brushArea.right - brushArea.left) < 5;
      var noVertical = Math.abs(brushArea.top - brushArea.bottom) < 5; // Invoke the callback with null if the selected area was < 5px

      var isNulled = noVertical || noHorizontal; // Clear the draw area

      this.setState({
        brushing: false,
        dragging: false,
        brushArea: drag ? brushArea : {
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        },
        startLocX: 0,
        startLocY: 0,
        dragArea: drag && !isNulled && brushArea
      });

      if (brushing && onBrushEnd) {
        onBrushEnd(!isNulled ? this._convertAreaToCoordinates(brushArea) : null);
      }

      if (drag && onDragEnd) {
        onDragEnd(!isNulled ? this._convertAreaToCoordinates(brushArea) : null);
      }
    }
  }, {
    key: 'onBrush',
    value: function onBrush(e) {
      var _props7 = this.props,
          onBrush = _props7.onBrush,
          onDrag = _props7.onDrag,
          drag = _props7.drag;
      var _state5 = this.state,
          brushing = _state5.brushing,
          dragging = _state5.dragging;

      var _getLocs2 = getLocs(e.nativeEvent),
          xLoc = _getLocs2.xLoc,
          yLoc = _getLocs2.yLoc;

      if (brushing) {
        var brushArea = this._getDrawArea(xLoc, yLoc);

        this.setState({
          brushArea: brushArea
        });

        if (onBrush) {
          onBrush(this._convertAreaToCoordinates(brushArea));
        }
      }

      if (drag && dragging) {
        var _brushArea = this._getDragArea(xLoc, yLoc);

        this.setState({
          brushArea: _brushArea
        });

        if (onDrag) {
          onDrag(this._convertAreaToCoordinates(_brushArea));
        }
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _props8 = this.props,
          color = _props8.color,
          className = _props8.className,
          highlightHeight = _props8.highlightHeight,
          highlightWidth = _props8.highlightWidth,
          highlightX = _props8.highlightX,
          highlightY = _props8.highlightY,
          innerWidth = _props8.innerWidth,
          innerHeight = _props8.innerHeight,
          marginLeft = _props8.marginLeft,
          marginRight = _props8.marginRight,
          marginTop = _props8.marginTop,
          marginBottom = _props8.marginBottom,
          opacity = _props8.opacity;
      var _state$brushArea = this.state.brushArea,
          left = _state$brushArea.left,
          right = _state$brushArea.right,
          top = _state$brushArea.top,
          bottom = _state$brushArea.bottom;
      var leftPos = 0;

      if (highlightX) {
        var xScale = getAttributeScale(this.props, 'x');
        leftPos = xScale(highlightX);
      }

      var topPos = 0;

      if (highlightY) {
        var yScale = getAttributeScale(this.props, 'y');
        topPos = yScale(highlightY);
      }

      var plotWidth = marginLeft + marginRight + innerWidth;
      var plotHeight = marginTop + marginBottom + innerHeight;
      var touchWidth = highlightWidth || plotWidth;
      var touchHeight = highlightHeight || plotHeight;
      return React.createElement('g', {
        transform: 'translate(' + leftPos + ', ' + topPos + ')',
        className: className + ' rv-highlight-container'
      }, React.createElement('rect', {
        className: 'rv-mouse-target',
        fill: 'black',
        opacity: '0',
        x: '0',
        y: '0',
        width: Math.max(touchWidth, 0),
        height: Math.max(touchHeight, 0),
        onMouseDown: function onMouseDown(e) {
          return _this3.startBrushing(e);
        },
        onMouseMove: function onMouseMove(e) {
          return _this3.onBrush(e);
        },
        onMouseUp: function onMouseUp(e) {
          return _this3.stopBrushing(e);
        },
        onMouseLeave: function onMouseLeave(e) {
          return _this3.stopBrushing(e);
        } // preventDefault() so that mouse event emulation does not happen
        ,
        onTouchEnd: function onTouchEnd(e) {
          e.preventDefault();

          _this3.stopBrushing(e);
        },
        onTouchCancel: function onTouchCancel(e) {
          e.preventDefault();

          _this3.stopBrushing(e);
        },
        onContextMenu: function onContextMenu(e) {
          return e.preventDefault();
        },
        onContextMenuCapture: function onContextMenuCapture(e) {
          return e.preventDefault();
        }
      }), React.createElement('rect', {
        className: 'rv-highlight',
        pointerEvents: 'none',
        opacity: opacity,
        fill: color,
        x: left,
        y: top,
        width: Math.min(Math.max(0, right - left), touchWidth),
        height: Math.min(Math.max(0, bottom - top), touchHeight)
      }));
    }
  }]);

  return Highlight;
}(AbstractSeries);

Highlight.displayName = 'HighlightOverlay';
Highlight.defaultProps = {
  color: 'rgb(77, 182, 172)',
  className: '',
  enableX: true,
  enableY: true,
  opacity: 0.3
};
Highlight.propTypes = _extends$g({}, AbstractSeries.propTypes, {
  enableX: PropTypes.bool,
  enableY: PropTypes.bool,
  highlightHeight: PropTypes.number,
  highlightWidth: PropTypes.number,
  highlightX: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  highlightY: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  onBrushStart: PropTypes.func,
  onDragStart: PropTypes.func,
  onBrush: PropTypes.func,
  onDrag: PropTypes.func,
  onBrushEnd: PropTypes.func,
  onDragEnd: PropTypes.func
});

var _extends$h = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$e = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$e(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$e(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$e(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}
/*
 * Hint provides two options for placement of hint:
 * a) around a data point in one of four quadrants (imagine the point bisected
 *    by two axes -vertical, horizontal- creating 4 quadrants around a data
 *    point).
 * b) **New** pin to an edge of chart/plot area and position along that edge
 *    using data point's other dimension value.
 *
 * To support these two options, deprecate one Hint props (orientation) with two
 * new Hint align prop object (horizontal, vertical) with following values:
 *
 *   horizontal: auto, left, right, leftEdge, rightEdge
 *   vertical: auto, bottom, top, bottomEdge, topEdge
 *
 * Thus, the following ALIGN constants are the values for horizontal
 * and vertical
 */


var ALIGN = {
  AUTO: 'auto',
  LEFT: 'left',
  RIGHT: 'right',
  LEFT_EDGE: 'leftEdge',
  RIGHT_EDGE: 'rightEdge',
  BOTTOM: 'bottom',
  TOP: 'top',
  BOTTOM_EDGE: 'bottomEdge',
  TOP_EDGE: 'topEdge'
};
/**
 * For backwards support, retain the ORIENTATION prop constants
 */

var ORIENTATION$1 = {
  BOTTOM_LEFT: 'bottomleft',
  BOTTOM_RIGHT: 'bottomright',
  TOP_LEFT: 'topleft',
  TOP_RIGHT: 'topright'
};
/**
 * Default format function for the value.
 * @param {Object} value Value.
 * @returns {Array} title-value pairs.
 */

function defaultFormat(value) {
  return Object.keys(value).map(function getProp(key) {
    return {
      title: key,
      value: transformValueToString(value[key])
    };
  });
}

var Hint = function (_PureComponent) {
  _inherits$e(Hint, _PureComponent);

  function Hint() {
    _classCallCheck$e(this, Hint);

    return _possibleConstructorReturn$e(this, (Hint.__proto__ || Object.getPrototypeOf(Hint)).apply(this, arguments));
  }

  _createClass$e(Hint, [{
    key: '_getAlign',

    /**
     * Obtain align object with horizontal and vertical settings
     * but convert any AUTO values to the non-auto ALIGN depending on the
     * values of x and y.
     * @param {number} x X value.
     * @param {number} y Y value.
     * @returns {Object} Align object w/ horizontal, vertical prop strings.
     * @private
     */
    value: function _getAlign(x, y) {
      var _props = this.props,
          innerWidth = _props.innerWidth,
          innerHeight = _props.innerHeight,
          orientation = _props.orientation,
          _props$align = _props.align,
          horizontal = _props$align.horizontal,
          vertical = _props$align.vertical;
      var align = orientation ? this._mapOrientationToAlign(orientation) : {
        horizontal: horizontal,
        vertical: vertical
      };

      if (horizontal === ALIGN.AUTO) {
        align.horizontal = x > innerWidth / 2 ? ALIGN.LEFT : ALIGN.RIGHT;
      }

      if (vertical === ALIGN.AUTO) {
        align.vertical = y > innerHeight / 2 ? ALIGN.TOP : ALIGN.BOTTOM;
      }

      return align;
    }
    /**
     * Get the class names from align values.
     * @param {Object} align object with horizontal and vertical prop strings.
     * @returns {string} Class names.
     * @private
     */

  }, {
    key: '_getAlignClassNames',
    value: function _getAlignClassNames(align) {
      var orientation = this.props.orientation;
      var orientationClass = orientation ? 'rv-hint--orientation-' + orientation : '';
      return orientationClass + ' rv-hint--horizontalAlign-' + align.horizontal + '\n     rv-hint--verticalAlign-' + align.vertical;
    }
    /**
     * Get a CSS mixin for a proper positioning of the element.
     * @param {Object} align object with horizontal and vertical prop strings.
     * @param {number} x X position.
     * @param {number} y Y position.
     * @returns {Object} Object, that may contain `left` or `right, `top` or
     * `bottom` properties.
     * @private
     */

  }, {
    key: '_getAlignStyle',
    value: function _getAlignStyle(align, x, y) {
      return _extends$h({}, this._getXCSS(align.horizontal, x), this._getYCSS(align.vertical, y));
    }
    /**
     * Get the bottom coordinate of the hint.
     * When y undefined or null, edge case, pin bottom.
     * @param {number} y Y.
     * @returns {{bottom: *}} Mixin.
     * @private
     */

  }, {
    key: '_getCSSBottom',
    value: function _getCSSBottom(y) {
      if (y === undefined || y === null) {
        return {
          bottom: 0
        };
      }

      var _props2 = this.props,
          innerHeight = _props2.innerHeight,
          marginBottom = _props2.marginBottom;
      return {
        bottom: marginBottom + innerHeight - y
      };
    }
    /**
     * Get the left coordinate of the hint.
     * When x undefined or null, edge case, pin left.
     * @param {number} x X.
     * @returns {{left: *}} Mixin.
     * @private
     */

  }, {
    key: '_getCSSLeft',
    value: function _getCSSLeft(x) {
      if (x === undefined || x === null) {
        return {
          left: 0
        };
      }

      var marginLeft = this.props.marginLeft;
      return {
        left: marginLeft + x
      };
    }
    /**
     * Get the right coordinate of the hint.
     * When x undefined or null, edge case, pin right.
     * @param {number} x X.
     * @returns {{right: *}} Mixin.
     * @private
     */

  }, {
    key: '_getCSSRight',
    value: function _getCSSRight(x) {
      if (x === undefined || x === null) {
        return {
          right: 0
        };
      }

      var _props3 = this.props,
          innerWidth = _props3.innerWidth,
          marginRight = _props3.marginRight;
      return {
        right: marginRight + innerWidth - x
      };
    }
    /**
     * Get the top coordinate of the hint.
     * When y undefined or null, edge case, pin top.
     * @param {number} y Y.
     * @returns {{top: *}} Mixin.
     * @private
     */

  }, {
    key: '_getCSSTop',
    value: function _getCSSTop(y) {
      if (y === undefined || y === null) {
        return {
          top: 0
        };
      }

      var marginTop = this.props.marginTop;
      return {
        top: marginTop + y
      };
    }
    /**
     * Get the position for the hint and the appropriate class name.
     * @returns {{style: Object, positionClassName: string}} Style and className for the
     * hint.
     * @private
     */

  }, {
    key: '_getPositionInfo',
    value: function _getPositionInfo() {
      var _props4 = this.props,
          value = _props4.value,
          getAlignStyle = _props4.getAlignStyle;
      var x = getAttributeFunctor(this.props, 'x')(value);
      var y = getAttributeFunctor(this.props, 'y')(value);

      var align = this._getAlign(x, y);

      return {
        position: getAlignStyle ? getAlignStyle(align, x, y) : this._getAlignStyle(align, x, y),
        positionClassName: this._getAlignClassNames(align)
      };
    }
  }, {
    key: '_getXCSS',
    value: function _getXCSS(horizontal, x) {
      // obtain xCSS
      switch (horizontal) {
        case ALIGN.LEFT_EDGE:
          // this pins x to left edge
          return this._getCSSLeft(null);

        case ALIGN.RIGHT_EDGE:
          // this pins x to left edge
          return this._getCSSRight(null);

        case ALIGN.LEFT:
          // this places hint text to the left of center, so set its right edge
          return this._getCSSRight(x);

        case ALIGN.RIGHT:
        default:
          // this places hint text to the right of center, so set its left edge
          // default case should not be possible but if it happens set to RIGHT
          return this._getCSSLeft(x);
      }
    }
  }, {
    key: '_getYCSS',
    value: function _getYCSS(verticalAlign, y) {
      // obtain yCSS
      switch (verticalAlign) {
        case ALIGN.TOP_EDGE:
          // this pins x to top edge
          return this._getCSSTop(null);

        case ALIGN.BOTTOM_EDGE:
          // this pins x to bottom edge
          return this._getCSSBottom(null);

        case ALIGN.BOTTOM:
          // this places hint text to the bottom of center, so set its top edge
          return this._getCSSTop(y);

        case ALIGN.TOP:
        default:
          // this places hint text to the top of center, so set its bottom edge
          // default case should not be possible but if it happens set to BOTTOM
          return this._getCSSBottom(y);
      }
    }
  }, {
    key: '_mapOrientationToAlign',
    value: function _mapOrientationToAlign(orientation) {
      // TODO: print warning that this feature is deprecated and support will be
      // removed in next major release.
      switch (orientation) {
        case ORIENTATION$1.BOTTOM_LEFT:
          return {
            horizontal: ALIGN.LEFT,
            vertical: ALIGN.BOTTOM
          };

        case ORIENTATION$1.BOTTOM_RIGHT:
          return {
            horizontal: ALIGN.RIGHT,
            vertical: ALIGN.BOTTOM
          };

        case ORIENTATION$1.TOP_LEFT:
          return {
            horizontal: ALIGN.LEFT,
            vertical: ALIGN.TOP
          };

        case ORIENTATION$1.TOP_RIGHT:
          return {
            horizontal: ALIGN.RIGHT,
            vertical: ALIGN.TOP
          };
      }
    }
  }, {
    key: 'render',
    value: function render() {
      var _props5 = this.props,
          value = _props5.value,
          format = _props5.format,
          children = _props5.children,
          style = _props5.style,
          className = _props5.className;

      var _getPositionInfo2 = this._getPositionInfo(),
          position = _getPositionInfo2.position,
          positionClassName = _getPositionInfo2.positionClassName;

      return React.createElement('div', {
        className: 'rv-hint ' + positionClassName + ' ' + className,
        style: _extends$h({}, style, position, {
          position: 'absolute'
        })
      }, children ? children : React.createElement('div', {
        className: 'rv-hint__content',
        style: style.content
      }, format(value).map(function (formattedProp, i) {
        return React.createElement('div', {
          key: 'rv-hint' + i,
          style: style.row
        }, React.createElement('span', {
          className: 'rv-hint__title',
          style: style.title
        }, formattedProp.title), ': ', React.createElement('span', {
          className: 'rv-hint__value',
          style: style.value
        }, formattedProp.value));
      })));
    }
  }], [{
    key: 'defaultProps',
    get: function get() {
      return {
        format: defaultFormat,
        align: {
          horizontal: ALIGN.AUTO,
          vertical: ALIGN.AUTO
        },
        style: {}
      };
    }
  }, {
    key: 'propTypes',
    get: function get() {
      return {
        marginTop: PropTypes.number,
        marginLeft: PropTypes.number,
        innerWidth: PropTypes.number,
        innerHeight: PropTypes.number,
        scales: PropTypes.object,
        value: PropTypes.object,
        format: PropTypes.func,
        style: PropTypes.object,
        className: PropTypes.string,
        align: PropTypes.shape({
          horizontal: PropTypes.oneOf([ALIGN.AUTO, ALIGN.LEFT, ALIGN.RIGHT, ALIGN.LEFT_EDGE, ALIGN.RIGHT_EDGE]),
          vertical: PropTypes.oneOf([ALIGN.AUTO, ALIGN.BOTTOM, ALIGN.TOP, ALIGN.BOTTOM_EDGE, ALIGN.TOP_EDGE])
        }),
        getAlignStyle: PropTypes.func,
        orientation: PropTypes.oneOf([ORIENTATION$1.BOTTOM_LEFT, ORIENTATION$1.BOTTOM_RIGHT, ORIENTATION$1.TOP_LEFT, ORIENTATION$1.TOP_RIGHT])
      };
    }
  }]);

  return Hint;
}(PureComponent);

Hint.displayName = 'Hint';
Hint.ORIENTATION = ORIENTATION$1;
Hint.ALIGN = ALIGN;

var _extends$i = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$f = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _defineProperty$3(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _classCallCheck$f(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$f(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$f(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$8 = 'rv-xy-plot__series rv-xy-plot__series--bar';

var BarSeries = function (_AbstractSeries) {
  _inherits$f(BarSeries, _AbstractSeries);

  function BarSeries() {
    _classCallCheck$f(this, BarSeries);

    return _possibleConstructorReturn$f(this, (BarSeries.__proto__ || Object.getPrototypeOf(BarSeries)).apply(this, arguments));
  }

  _createClass$f(BarSeries, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          data = _props.data,
          linePosAttr = _props.linePosAttr,
          lineSizeAttr = _props.lineSizeAttr,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          style = _props.style,
          valuePosAttr = _props.valuePosAttr,
          valueSizeAttr = _props.valueSizeAttr,
          barWidth = _props.barWidth;

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$i({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(BarSeries, _extends$i({}, this.props, {
          animation: null
        })));
      }

      var _getStackParams = getStackParams(this.props),
          sameTypeTotal = _getStackParams.sameTypeTotal,
          sameTypeIndex = _getStackParams.sameTypeIndex;

      var distance = this._getScaleDistance(linePosAttr);

      var lineFunctor = this._getAttributeFunctor(linePosAttr);

      var valueFunctor = this._getAttributeFunctor(valuePosAttr);

      var value0Functor = this._getAttr0Functor(valuePosAttr);

      var fillFunctor = this._getAttributeFunctor('fill') || this._getAttributeFunctor('color');

      var strokeFunctor = this._getAttributeFunctor('stroke') || this._getAttributeFunctor('color');

      var opacityFunctor = this._getAttributeFunctor('opacity');

      var halfSpace = distance / 2 * barWidth;
      return React.createElement('g', {
        className: predefinedClassName$8 + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, data.map(function (d, i) {
        var _attrs; // totalSpaceAvailable is the space we have available to draw all the
        // bars of a same 'linePosAttr' value (a.k.a. sameTypeTotal)


        var totalSpaceAvailable = halfSpace * 2;
        var totalSpaceCenter = lineFunctor(d); // totalSpaceStartingPoint is the first pixel were we can start drawing

        var totalSpaceStartingPoint = totalSpaceCenter - halfSpace; // spaceTakenByInterBarsPixels has the overhead space consumed by each bar of sameTypeTotal

        var spaceTakenByInterBarsPixels = (sameTypeTotal - 1) / sameTypeTotal; // spacePerBar is the space we have available to draw sameTypeIndex bar

        var spacePerBar = totalSpaceAvailable / sameTypeTotal - spaceTakenByInterBarsPixels; // barStartingPoint is the first pixel were we can start drawing sameTypeIndex bar

        var barStartingPoint = totalSpaceStartingPoint + spacePerBar * sameTypeIndex + sameTypeIndex;
        var attrs = (_attrs = {
          style: _extends$i({
            opacity: opacityFunctor && opacityFunctor(d),
            stroke: strokeFunctor && strokeFunctor(d),
            fill: fillFunctor && fillFunctor(d)
          }, style)
        }, _defineProperty$3(_attrs, linePosAttr, barStartingPoint), _defineProperty$3(_attrs, lineSizeAttr, spacePerBar), _defineProperty$3(_attrs, valuePosAttr, Math.min(value0Functor(d), valueFunctor(d))), _defineProperty$3(_attrs, valueSizeAttr, Math.abs(-value0Functor(d) + valueFunctor(d))), _defineProperty$3(_attrs, 'onClick', function onClick(e) {
          return _this2._valueClickHandler(d, e);
        }), _defineProperty$3(_attrs, 'onContextMenu', function onContextMenu(e) {
          return _this2._valueRightClickHandler(d, e);
        }), _defineProperty$3(_attrs, 'onMouseOver', function onMouseOver(e) {
          return _this2._valueMouseOverHandler(d, e);
        }), _defineProperty$3(_attrs, 'onMouseOut', function onMouseOut(e) {
          return _this2._valueMouseOutHandler(d, e);
        }), _defineProperty$3(_attrs, 'key', i), _attrs);
        return React.createElement('rect', attrs);
      }));
    }
  }], [{
    key: 'propTypes',
    get: function get() {
      return _extends$i({}, AbstractSeries.propTypes, {
        linePosAttr: PropTypes.string,
        valuePosAttr: PropTypes.string,
        lineSizeAttr: PropTypes.string,
        valueSizeAttr: PropTypes.string,
        cluster: PropTypes.string,
        barWidth: PropTypes.number
      });
    }
  }, {
    key: 'defaultProps',
    get: function get() {
      return {
        barWidth: 0.85
      };
    }
  }]);

  return BarSeries;
}(AbstractSeries);

BarSeries.displayName = 'BarSeries';

var _extends$j = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$g = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$g(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$g(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$g(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var HorizontalBarSeries = function (_AbstractSeries) {
  _inherits$g(HorizontalBarSeries, _AbstractSeries);

  function HorizontalBarSeries() {
    _classCallCheck$g(this, HorizontalBarSeries);

    return _possibleConstructorReturn$g(this, (HorizontalBarSeries.__proto__ || Object.getPrototypeOf(HorizontalBarSeries)).apply(this, arguments));
  }

  _createClass$g(HorizontalBarSeries, [{
    key: 'render',
    value: function render() {
      return React.createElement(BarSeries, _extends$j({}, this.props, {
        linePosAttr: 'y',
        valuePosAttr: 'x',
        lineSizeAttr: 'height',
        valueSizeAttr: 'width'
      }));
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = attr === 'y';
      var zeroBaseValue = attr === 'x';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded,
        zeroBaseValue: zeroBaseValue
      };
    }
  }]);

  return HorizontalBarSeries;
}(AbstractSeries);

HorizontalBarSeries.displayName = 'HorizontalBarSeries';

var _extends$k = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$h = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$h(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$h(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$h(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

function getScaleDistance(props, attr) {
  var scaleObject = getScaleObjectFromProps(props, attr);
  return scaleObject ? scaleObject.distance : 0;
}

var BarSeriesCanvas = function (_AbstractSeries) {
  _inherits$h(BarSeriesCanvas, _AbstractSeries);

  function BarSeriesCanvas() {
    _classCallCheck$h(this, BarSeriesCanvas);

    return _possibleConstructorReturn$h(this, (BarSeriesCanvas.__proto__ || Object.getPrototypeOf(BarSeriesCanvas)).apply(this, arguments));
  }

  _createClass$h(BarSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return null;
    }
  }], [{
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      var data = props.data,
          linePosAttr = props.linePosAttr,
          lineSizeAttr = props.lineSizeAttr,
          valuePosAttr = props.valuePosAttr,
          marginTop = props.marginTop,
          marginBottom = props.marginBottom;

      if (!data || data.length === 0) {
        return;
      }

      var distance = getScaleDistance(props, linePosAttr);
      var line = getAttributeFunctor(props, linePosAttr);
      var value = getAttributeFunctor(props, valuePosAttr);
      var value0 = getAttr0Functor(props, valuePosAttr);
      var fill = getAttributeFunctor(props, 'fill') || getAttributeFunctor(props, 'color');
      var stroke = getAttributeFunctor(props, 'stroke') || getAttributeFunctor(props, 'color');
      var opacity = getAttributeFunctor(props, 'opacity');
      var halfSpace = distance / 2 * 0.85; // totalSpaceAvailable is the space we have available to draw all the
      // bars of a same 'linePosAttr' value (a.k.a. sameTypeTotal)

      var totalSpaceAvailable = halfSpace * 2;

      var _getStackParams = getStackParams(props),
          sameTypeTotal = _getStackParams.sameTypeTotal,
          sameTypeIndex = _getStackParams.sameTypeIndex;

      data.forEach(function (row) {
        var totalSpaceCenter = line(row); // totalSpaceStartingPoint is the first pixel were we can start drawing

        var totalSpaceStartingPoint = totalSpaceCenter - halfSpace; // spaceTakenByInterBarsPixels has the overhead space consumed by each bar of sameTypeTotal

        var spaceTakenByInterBarsPixels = (sameTypeTotal - 1) / sameTypeTotal; // lineSize is the space we have available to draw sameTypeIndex bar

        var lineSize = totalSpaceAvailable / sameTypeTotal - spaceTakenByInterBarsPixels;
        var fillColor = rgb(fill(row));
        var strokeColor = rgb(stroke(row));
        var rowOpacity = opacity(row) || DEFAULT_OPACITY; // linePos is the first pixel were we can start drawing sameTypeIndex bar

        var linePos = totalSpaceStartingPoint + lineSize * sameTypeIndex + sameTypeIndex;
        var valuePos = Math.min(value0(row), value(row));
        var x = valuePosAttr === 'x' ? valuePos : linePos;
        var y = valuePosAttr === 'y' ? valuePos : linePos;
        var valueSize = Math.abs(-value0(row) + value(row));
        var height = lineSizeAttr === 'height' ? lineSize : valueSize;
        var width = lineSizeAttr === 'width' ? lineSize : valueSize;
        ctx.beginPath();
        ctx.rect(x + marginBottom, y + marginTop, width, height);
        ctx.fillStyle = 'rgba(' + fillColor.r + ', ' + fillColor.g + ', ' + fillColor.b + ', ' + rowOpacity + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(' + strokeColor.r + ', ' + strokeColor.g + ', ' + strokeColor.b + ', ' + rowOpacity + ')';
        ctx.stroke();
      });
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return BarSeriesCanvas;
}(AbstractSeries);

BarSeriesCanvas.displayName = 'BarSeriesCanvas';
BarSeriesCanvas.defaultProps = _extends$k({}, AbstractSeries.defaultProps, {
  linePosAttr: PropTypes.string.isRequired,
  valuePosAttr: PropTypes.string.isRequired,
  lineSizeAttr: PropTypes.string.isRequired,
  valueSizeAttr: PropTypes.string.isRequired
});
BarSeriesCanvas.propTypes = _extends$k({}, AbstractSeries.propTypes);

var _extends$l = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$i = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$i(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$i(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$i(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var HorizontalBarSeriesCanvas = function (_AbstractSeries) {
  _inherits$i(HorizontalBarSeriesCanvas, _AbstractSeries);

  function HorizontalBarSeriesCanvas() {
    _classCallCheck$i(this, HorizontalBarSeriesCanvas);

    return _possibleConstructorReturn$i(this, (HorizontalBarSeriesCanvas.__proto__ || Object.getPrototypeOf(HorizontalBarSeriesCanvas)).apply(this, arguments));
  }

  _createClass$i(HorizontalBarSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return null;
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = attr === 'y';
      var zeroBaseValue = attr === 'x';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded,
        zeroBaseValue: zeroBaseValue
      };
    }
  }, {
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      BarSeriesCanvas.renderLayer(_extends$l({}, props, {
        linePosAttr: 'y',
        valuePosAttr: 'x',
        lineSizeAttr: 'height',
        valueSizeAttr: 'width'
      }), ctx);
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return HorizontalBarSeriesCanvas;
}(AbstractSeries);

HorizontalBarSeriesCanvas.displayName = 'HorizontalBarSeriesCanvas';
HorizontalBarSeriesCanvas.propTypes = _extends$l({}, AbstractSeries.propTypes);

var _extends$m = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var HORIZONTAL$1 = DIRECTION.HORIZONTAL;

var propTypes$4 = _extends$m({}, GridLines.propTypes, {
  direction: PropTypes.oneOf([HORIZONTAL$1])
});

var defaultProps$3 = {
  direction: HORIZONTAL$1,
  attr: 'y'
};

function HorizontalGridLines(props) {
  return React.createElement(GridLines, props);
}

HorizontalGridLines.displayName = 'HorizontalGridLines';
HorizontalGridLines.propTypes = propTypes$4;
HorizontalGridLines.defaultProps = defaultProps$3;
HorizontalGridLines.requiresSVG = true;

var _extends$n = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$j = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _defineProperty$4(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _classCallCheck$j(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$j(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$j(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$9 = 'rv-xy-plot__series rv-xy-plot__series--rect';

var RectSeries = function (_AbstractSeries) {
  _inherits$j(RectSeries, _AbstractSeries);

  function RectSeries() {
    _classCallCheck$j(this, RectSeries);

    return _possibleConstructorReturn$j(this, (RectSeries.__proto__ || Object.getPrototypeOf(RectSeries)).apply(this, arguments));
  }

  _createClass$j(RectSeries, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          data = _props.data,
          linePosAttr = _props.linePosAttr,
          lineSizeAttr = _props.lineSizeAttr,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          style = _props.style,
          valuePosAttr = _props.valuePosAttr,
          valueSizeAttr = _props.valueSizeAttr;

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$n({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(RectSeries, _extends$n({}, this.props, {
          animation: null
        })));
      }

      var lineFunctor = this._getAttributeFunctor(linePosAttr);

      var line0Functor = this._getAttr0Functor(linePosAttr);

      var valueFunctor = this._getAttributeFunctor(valuePosAttr);

      var value0Functor = this._getAttr0Functor(valuePosAttr);

      var fillFunctor = this._getAttributeFunctor('fill') || this._getAttributeFunctor('color');

      var strokeFunctor = this._getAttributeFunctor('stroke') || this._getAttributeFunctor('color');

      var opacityFunctor = this._getAttributeFunctor('opacity');

      return React.createElement('g', {
        className: predefinedClassName$9 + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, data.map(function (d, i) {
        var _attrs;

        var attrs = (_attrs = {
          style: _extends$n({
            opacity: opacityFunctor && opacityFunctor(d),
            stroke: strokeFunctor && strokeFunctor(d),
            fill: fillFunctor && fillFunctor(d)
          }, style)
        }, _defineProperty$4(_attrs, linePosAttr, line0Functor(d)), _defineProperty$4(_attrs, lineSizeAttr, Math.abs(lineFunctor(d) - line0Functor(d))), _defineProperty$4(_attrs, valuePosAttr, Math.min(value0Functor(d), valueFunctor(d))), _defineProperty$4(_attrs, valueSizeAttr, Math.abs(-value0Functor(d) + valueFunctor(d))), _defineProperty$4(_attrs, 'onClick', function onClick(e) {
          return _this2._valueClickHandler(d, e);
        }), _defineProperty$4(_attrs, 'onContextMenu', function onContextMenu(e) {
          return _this2._valueRightClickHandler(d, e);
        }), _defineProperty$4(_attrs, 'onMouseOver', function onMouseOver(e) {
          return _this2._valueMouseOverHandler(d, e);
        }), _defineProperty$4(_attrs, 'onMouseOut', function onMouseOut(e) {
          return _this2._valueMouseOutHandler(d, e);
        }), _defineProperty$4(_attrs, 'key', i), _attrs);
        return React.createElement('rect', attrs);
      }));
    }
  }], [{
    key: 'propTypes',
    get: function get() {
      return _extends$n({}, AbstractSeries.propTypes, {
        linePosAttr: PropTypes.string,
        valuePosAttr: PropTypes.string,
        lineSizeAttr: PropTypes.string,
        valueSizeAttr: PropTypes.string
      });
    }
  }]);

  return RectSeries;
}(AbstractSeries);

RectSeries.displayName = 'RectSeries';

var _extends$o = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$k = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$k(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$k(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$k(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var HorizontalRectSeries = function (_AbstractSeries) {
  _inherits$k(HorizontalRectSeries, _AbstractSeries);

  function HorizontalRectSeries() {
    _classCallCheck$k(this, HorizontalRectSeries);

    return _possibleConstructorReturn$k(this, (HorizontalRectSeries.__proto__ || Object.getPrototypeOf(HorizontalRectSeries)).apply(this, arguments));
  }

  _createClass$k(HorizontalRectSeries, [{
    key: 'render',
    value: function render() {
      return React.createElement(RectSeries, _extends$o({}, this.props, {
        linePosAttr: 'y',
        valuePosAttr: 'x',
        lineSizeAttr: 'height',
        valueSizeAttr: 'width'
      }));
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = false;
      var zeroBaseValue = attr === 'x';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded,
        zeroBaseValue: zeroBaseValue
      };
    }
  }]);

  return HorizontalRectSeries;
}(AbstractSeries);

HorizontalRectSeries.displayName = 'HorizontalRectSeries';

var _extends$p = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$l = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$l(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$l(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$l(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var RectSeriesCanvas = function (_AbstractSeries) {
  _inherits$l(RectSeriesCanvas, _AbstractSeries);

  function RectSeriesCanvas() {
    _classCallCheck$l(this, RectSeriesCanvas);

    return _possibleConstructorReturn$l(this, (RectSeriesCanvas.__proto__ || Object.getPrototypeOf(RectSeriesCanvas)).apply(this, arguments));
  }

  _createClass$l(RectSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return null;
    }
  }], [{
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      var data = props.data,
          linePosAttr = props.linePosAttr,
          lineSizeAttr = props.lineSizeAttr,
          marginLeft = props.marginLeft,
          marginTop = props.marginTop,
          valuePosAttr = props.valuePosAttr;

      if (!data || data.length === 0) {
        return;
      }

      var line = getAttributeFunctor(props, linePosAttr);
      var line0 = getAttr0Functor(props, linePosAttr);
      var value = getAttributeFunctor(props, valuePosAttr);
      var value0 = getAttr0Functor(props, valuePosAttr);
      var fill = getAttributeFunctor(props, 'fill') || getAttributeFunctor(props, 'color');
      var stroke = getAttributeFunctor(props, 'stroke') || getAttributeFunctor(props, 'color');
      var opacity = getAttributeFunctor(props, 'opacity');
      data.forEach(function (row) {
        var fillColor = rgb(fill(row));
        var strokeColor = rgb(stroke(row));
        var rowOpacity = opacity(row) || DEFAULT_OPACITY;
        var linePos = line0(row);
        var valuePos = Math.min(value0(row), value(row));
        var x = valuePosAttr === 'x' ? valuePos : linePos;
        var y = valuePosAttr === 'y' ? valuePos : linePos;
        var lineSize = Math.abs(line(row) - line0(row));
        var valueSize = Math.abs(-value0(row) + value(row));
        var height = lineSizeAttr === 'height' ? lineSize : valueSize;
        var width = lineSizeAttr === 'width' ? lineSize : valueSize;
        ctx.beginPath();
        ctx.rect(x + marginLeft, y + marginTop, width, height);
        ctx.fillStyle = 'rgba(' + fillColor.r + ', ' + fillColor.g + ', ' + fillColor.b + ', ' + rowOpacity + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(' + strokeColor.r + ', ' + strokeColor.g + ', ' + strokeColor.b + ', ' + rowOpacity + ')';
        ctx.stroke();
      });
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return RectSeriesCanvas;
}(AbstractSeries);

RectSeriesCanvas.displayName = 'RectSeriesCanvas';
RectSeriesCanvas.defaultProps = _extends$p({}, AbstractSeries.defaultProps, {
  linePosAttr: PropTypes.string.isRequired,
  valuePosAttr: PropTypes.string.isRequired,
  lineSizeAttr: PropTypes.string.isRequired,
  valueSizeAttr: PropTypes.string.isRequired
});
RectSeriesCanvas.propTypes = _extends$p({}, AbstractSeries.propTypes);

var _extends$q = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$m = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$m(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$m(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$m(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var HorizontalRectSeriesCanvas = function (_AbstractSeries) {
  _inherits$m(HorizontalRectSeriesCanvas, _AbstractSeries);

  function HorizontalRectSeriesCanvas() {
    _classCallCheck$m(this, HorizontalRectSeriesCanvas);

    return _possibleConstructorReturn$m(this, (HorizontalRectSeriesCanvas.__proto__ || Object.getPrototypeOf(HorizontalRectSeriesCanvas)).apply(this, arguments));
  }

  _createClass$m(HorizontalRectSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return null;
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = false;
      var zeroBaseValue = attr === 'x';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded,
        zeroBaseValue: zeroBaseValue
      };
    }
  }, {
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      RectSeriesCanvas.renderLayer(_extends$q({}, props, {
        linePosAttr: 'y',
        valuePosAttr: 'x',
        lineSizeAttr: 'height',
        valueSizeAttr: 'width'
      }), ctx);
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return HorizontalRectSeriesCanvas;
}(AbstractSeries);

HorizontalRectSeriesCanvas.displayName = 'HorizontalRectSeriesCanvas';
HorizontalRectSeriesCanvas.propTypes = _extends$q({}, AbstractSeries.propTypes);

var _extends$r = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$n = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$n(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$n(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$n(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$a = 'rv-xy-plot__series rv-xy-plot__series--label';

var getTextAnchor = function getTextAnchor(labelAnchorX, leftOfMiddle) {
  return labelAnchorX ? labelAnchorX : leftOfMiddle ? 'start' : 'end';
};

var getDominantBaseline = function getDominantBaseline(labelAnchorY, aboveMiddle) {
  return labelAnchorY ? labelAnchorY : aboveMiddle ? 'text-before-edge' : 'text-after-edge';
};

var LabelSeries = function (_AbstractSeries) {
  _inherits$n(LabelSeries, _AbstractSeries);

  function LabelSeries() {
    _classCallCheck$n(this, LabelSeries);

    return _possibleConstructorReturn$n(this, (LabelSeries.__proto__ || Object.getPrototypeOf(LabelSeries)).apply(this, arguments));
  }

  _createClass$n(LabelSeries, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          animation = _props.animation,
          allowOffsetToBeReversed = _props.allowOffsetToBeReversed,
          className = _props.className,
          data = _props.data,
          _data = _props._data,
          getLabel = _props.getLabel,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          rotation = _props.rotation,
          style = _props.style,
          xRange = _props.xRange,
          yRange = _props.yRange,
          labelAnchorX = _props.labelAnchorX,
          labelAnchorY = _props.labelAnchorY;

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$r({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(LabelSeries, _extends$r({}, this.props, {
          animation: null,
          _data: data
        })));
      }

      var xFunctor = this._getAttributeFunctor('x');

      var yFunctor = this._getAttributeFunctor('y');

      return React.createElement('g', {
        className: predefinedClassName$a + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')',
        style: style
      }, data.reduce(function (res, d, i) {
        var markStyle = d.style,
            xOffset = d.xOffset,
            yOffset = d.yOffset;

        if (!getLabel(d)) {
          return res;
        }

        var xVal = xFunctor(d);
        var yVal = yFunctor(d);
        var leftOfMiddle = xVal < (xRange[1] - xRange[0]) / 2;
        var aboveMiddle = yVal < Math.abs(yRange[1] - yRange[0]) / 2;
        var x = xVal + (allowOffsetToBeReversed && leftOfMiddle ? -1 : 1) * (xOffset || 0);
        var y = yVal + (allowOffsetToBeReversed && aboveMiddle ? -1 : 1) * (yOffset || 0);
        var hasRotationValueSet = d.rotation === 0 || d.rotation;
        var labelRotation = hasRotationValueSet ? d.rotation : rotation;

        var attrs = _extends$r({
          dominantBaseline: getDominantBaseline(labelAnchorY, aboveMiddle),
          className: 'rv-xy-plot__series--label-text',
          key: i,
          onClick: function onClick(e) {
            return _this2._valueClickHandler(d, e);
          },
          onContextMenu: function onContextMenu(e) {
            return _this2._valueRightClickHandler(d, e);
          },
          onMouseOver: function onMouseOver(e) {
            return _this2._valueMouseOverHandler(d, e);
          },
          onMouseOut: function onMouseOut(e) {
            return _this2._valueMouseOutHandler(d, e);
          },
          textAnchor: getTextAnchor(labelAnchorX, leftOfMiddle),
          x: x,
          y: y,
          transform: 'rotate(' + labelRotation + ',' + x + ',' + y + ')'
        }, markStyle);

        var textContent = getLabel(_data ? _data[i] : d);
        return res.concat([React.createElement('text', attrs, textContent)]);
      }, []));
    }
  }]);

  return LabelSeries;
}(AbstractSeries);

LabelSeries.propTypes = {
  animation: PropTypes.bool,
  allowOffsetToBeReversed: PropTypes.bool,
  className: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.shape({
    x: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    y: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
    angle: PropTypes.number,
    radius: PropTypes.number,
    label: PropTypes.string,
    xOffset: PropTypes.number,
    yOffset: PropTypes.number,
    style: PropTypes.object
  })).isRequired,
  marginLeft: PropTypes.number,
  marginTop: PropTypes.number,
  rotation: PropTypes.number,
  style: PropTypes.object,
  xRange: PropTypes.arrayOf(PropTypes.number),
  yRange: PropTypes.arrayOf(PropTypes.number),
  labelAnchorX: PropTypes.string,
  labelAnchorY: PropTypes.string
};
LabelSeries.defaultProps = _extends$r({}, AbstractSeries.defaultProps, {
  animation: false,
  rotation: 0,
  getLabel: function getLabel(d) {
    return d.label;
  }
});
LabelSeries.displayName = 'LabelSeries';

var _extends$s = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$o = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$o(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$o(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$o(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$b = 'rv-xy-plot__series rv-xy-plot__series--line';
var STROKE_STYLES = {
  dashed: '6, 2',
  solid: null
};

var LineSeries = function (_AbstractSeries) {
  _inherits$o(LineSeries, _AbstractSeries);

  function LineSeries() {
    _classCallCheck$o(this, LineSeries);

    return _possibleConstructorReturn$o(this, (LineSeries.__proto__ || Object.getPrototypeOf(LineSeries)).apply(this, arguments));
  }

  _createClass$o(LineSeries, [{
    key: '_renderLine',
    value: function _renderLine(data, x, y, curve, getNull) {
      var line$1 = line();

      if (curve !== null) {
        if (typeof curve === 'string' && d3Shape[curve]) {
          line$1 = line$1.curve(d3Shape[curve]);
        } else if (typeof curve === 'function') {
          line$1 = line$1.curve(curve);
        }
      }

      line$1 = line$1.defined(getNull);
      line$1 = line$1.x(x).y(y);
      return line$1(data);
    }
  }, {
    key: 'render',
    value: function render() {
      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          data = _props.data;

      if (this.props.nullAccessor) {
        warning('nullAccessor has been renamed to getNull', true);
      }

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$s({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(LineSeries, _extends$s({}, this.props, {
          animation: null
        })));
      }

      var _props2 = this.props,
          curve = _props2.curve,
          marginLeft = _props2.marginLeft,
          marginTop = _props2.marginTop,
          strokeDasharray = _props2.strokeDasharray,
          strokeStyle = _props2.strokeStyle,
          strokeWidth = _props2.strokeWidth,
          style = _props2.style;

      var x = this._getAttributeFunctor('x');

      var y = this._getAttributeFunctor('y');

      var stroke = this._getAttributeValue('stroke') || this._getAttributeValue('color');

      var newOpacity = this._getAttributeValue('opacity');

      var opacity = Number.isFinite(newOpacity) ? newOpacity : DEFAULT_OPACITY;
      var getNull = this.props.nullAccessor || this.props.getNull;

      var d = this._renderLine(data, x, y, curve, getNull);

      return React.createElement('path', {
        d: d,
        className: predefinedClassName$b + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')',
        onMouseOver: this._seriesMouseOverHandler,
        onMouseOut: this._seriesMouseOutHandler,
        onClick: this._seriesClickHandler,
        onContextMenu: this._seriesRightClickHandler,
        style: _extends$s({
          opacity: opacity,
          strokeDasharray: STROKE_STYLES[strokeStyle] || strokeDasharray,
          strokeWidth: strokeWidth,
          stroke: stroke
        }, style)
      });
    }
  }]);

  return LineSeries;
}(AbstractSeries);

LineSeries.displayName = 'LineSeries';
LineSeries.propTypes = _extends$s({}, AbstractSeries.propTypes, {
  strokeStyle: PropTypes.oneOf(Object.keys(STROKE_STYLES)),
  curve: PropTypes.oneOfType([PropTypes.string, PropTypes.func]),
  getNull: PropTypes.func
});
LineSeries.defaultProps = _extends$s({}, AbstractSeries.defaultProps, {
  strokeStyle: 'solid',
  style: {},
  opacity: 1,
  curve: null,
  className: '',
  getNull: function getNull() {
    return true;
  }
});

var _extends$t = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$p = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$p(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$p(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$p(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$c = 'rv-xy-plot__series rv-xy-plot__series--mark';
var DEFAULT_STROKE_WIDTH = 1;

var MarkSeries = function (_AbstractSeries) {
  _inherits$p(MarkSeries, _AbstractSeries);

  function MarkSeries() {
    _classCallCheck$p(this, MarkSeries);

    return _possibleConstructorReturn$p(this, (MarkSeries.__proto__ || Object.getPrototypeOf(MarkSeries)).apply(this, arguments));
  }

  _createClass$p(MarkSeries, [{
    key: '_renderCircle',
    value: function _renderCircle(d, i, strokeWidth, style, scalingFunctions) {
      var _this2 = this;

      var fill = scalingFunctions.fill,
          opacity = scalingFunctions.opacity,
          size = scalingFunctions.size,
          stroke = scalingFunctions.stroke,
          x = scalingFunctions.x,
          y = scalingFunctions.y;
      var attrs = {
        r: size ? size(d) : DEFAULT_SIZE,
        cx: x(d),
        cy: y(d),
        style: _extends$t({
          opacity: opacity ? opacity(d) : DEFAULT_OPACITY,
          stroke: stroke && stroke(d),
          fill: fill && fill(d),
          strokeWidth: strokeWidth || DEFAULT_STROKE_WIDTH
        }, style),
        key: i,
        onClick: function onClick(e) {
          return _this2._valueClickHandler(d, e);
        },
        onContextMenu: function onContextMenu(e) {
          return _this2._valueRightClickHandler(d, e);
        },
        onMouseOver: function onMouseOver(e) {
          return _this2._valueMouseOverHandler(d, e);
        },
        onMouseOut: function onMouseOut(e) {
          return _this2._valueMouseOutHandler(d, e);
        }
      };
      return React.createElement('circle', attrs);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this3 = this;

      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          data = _props.data,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          strokeWidth = _props.strokeWidth,
          style = _props.style;

      if (this.props.nullAccessor) {
        warning('nullAccessor has been renamed to getNull', true);
      }

      var getNull = this.props.nullAccessor || this.props.getNull;

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$t({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(MarkSeries, _extends$t({}, this.props, {
          animation: null
        })));
      }

      var scalingFunctions = {
        fill: this._getAttributeFunctor('fill') || this._getAttributeFunctor('color'),
        opacity: this._getAttributeFunctor('opacity'),
        size: this._getAttributeFunctor('size'),
        stroke: this._getAttributeFunctor('stroke') || this._getAttributeFunctor('color'),
        x: this._getAttributeFunctor('x'),
        y: this._getAttributeFunctor('y')
      };
      return React.createElement('g', {
        className: predefinedClassName$c + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, data.map(function (d, i) {
        return getNull(d) && _this3._renderCircle(d, i, strokeWidth, style, scalingFunctions);
      }));
    }
  }]);

  return MarkSeries;
}(AbstractSeries);

MarkSeries.displayName = 'MarkSeries';
MarkSeries.propTypes = _extends$t({}, AbstractSeries.propTypes, {
  getNull: PropTypes.func,
  strokeWidth: PropTypes.number
});
MarkSeries.defaultProps = {
  getNull: function getNull() {
    return true;
  }
};

var _createClass$q = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$u = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _classCallCheck$q(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$q(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$q(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var propTypes$5 = _extends$u({}, LineSeries.propTypes, {
  lineStyle: PropTypes.object,
  markStyle: PropTypes.object
});

var LineMarkSeries = function (_AbstractSeries) {
  _inherits$q(LineMarkSeries, _AbstractSeries);

  function LineMarkSeries() {
    _classCallCheck$q(this, LineMarkSeries);

    return _possibleConstructorReturn$q(this, (LineMarkSeries.__proto__ || Object.getPrototypeOf(LineMarkSeries)).apply(this, arguments));
  }

  _createClass$q(LineMarkSeries, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          lineStyle = _props.lineStyle,
          markStyle = _props.markStyle,
          style = _props.style;
      return React.createElement('g', {
        className: 'rv-xy-plot__series rv-xy-plot__series--linemark'
      }, React.createElement(LineSeries, _extends$u({}, this.props, {
        style: _extends$u({}, style, lineStyle)
      })), React.createElement(MarkSeries, _extends$u({}, this.props, {
        style: _extends$u({}, style, markStyle)
      })));
    }
  }], [{
    key: 'defaultProps',
    get: function get() {
      return _extends$u({}, LineSeries.defaultProps, {
        lineStyle: {},
        markStyle: {}
      });
    }
  }]);

  return LineMarkSeries;
}(AbstractSeries);

LineMarkSeries.displayName = 'LineMarkSeries';
LineMarkSeries.propTypes = propTypes$5;

var _extends$v = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$r = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$r(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$r(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$r(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var MarkSeriesCanvas = function (_AbstractSeries) {
  _inherits$r(MarkSeriesCanvas, _AbstractSeries);

  function MarkSeriesCanvas() {
    _classCallCheck$r(this, MarkSeriesCanvas);

    return _possibleConstructorReturn$r(this, (MarkSeriesCanvas.__proto__ || Object.getPrototypeOf(MarkSeriesCanvas)).apply(this, arguments));
  }

  _createClass$r(MarkSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return null;
    }
  }], [{
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      var data = props.data,
          marginLeft = props.marginLeft,
          marginTop = props.marginTop;
      var x = getAttributeFunctor(props, 'x');
      var y = getAttributeFunctor(props, 'y');

      var size = getAttributeFunctor(props, 'size') || function (p) {
        return DEFAULT_SIZE;
      };

      var fill = getAttributeFunctor(props, 'fill') || getAttributeFunctor(props, 'color');
      var stroke = getAttributeFunctor(props, 'stroke') || getAttributeFunctor(props, 'color');
      var opacity = getAttributeFunctor(props, 'opacity');
      data.forEach(function (row) {
        var fillColor = rgb(fill(row));
        var strokeColor = rgb(stroke(row));
        var rowOpacity = opacity(row) || DEFAULT_OPACITY;
        ctx.beginPath();
        ctx.arc(x(row) + marginLeft, y(row) + marginTop, size(row), 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(' + fillColor.r + ', ' + fillColor.g + ', ' + fillColor.b + ', ' + rowOpacity + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(' + strokeColor.r + ', ' + strokeColor.g + ', ' + strokeColor.b + ', ' + rowOpacity + ')';
        ctx.stroke();
      });
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return MarkSeriesCanvas;
}(AbstractSeries);

MarkSeriesCanvas.displayName = 'MarkSeriesCanvas';
MarkSeriesCanvas.propTypes = _extends$v({}, AbstractSeries.propTypes);

var _extends$w = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$s = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$s(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$s(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$s(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var LineSeriesCanvas = function (_AbstractSeries) {
  _inherits$s(LineSeriesCanvas, _AbstractSeries);

  function LineSeriesCanvas() {
    _classCallCheck$s(this, LineSeriesCanvas);

    return _possibleConstructorReturn$s(this, (LineSeriesCanvas.__proto__ || Object.getPrototypeOf(LineSeriesCanvas)).apply(this, arguments));
  }

  _createClass$s(LineSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return React.createElement('div', null);
    }
  }], [{
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      var curve = props.curve,
          data = props.data,
          marginLeft = props.marginLeft,
          marginTop = props.marginTop,
          strokeWidth = props.strokeWidth,
          strokeDasharray = props.strokeDasharray;

      if (!data || data.length === 0) {
        return;
      }

      var x = getAttributeFunctor(props, 'x');
      var y = getAttributeFunctor(props, 'y');
      var stroke = getAttributeValue(props, 'stroke') || getAttributeValue(props, 'color');
      var strokeColor = rgb(stroke);
      var newOpacity = getAttributeValue(props, 'opacity');
      var opacity = Number.isFinite(newOpacity) ? newOpacity : DEFAULT_OPACITY;
      var line$1 = line().x(function (row) {
        return x(row) + marginLeft;
      }).y(function (row) {
        return y(row) + marginTop;
      });

      if (typeof curve === 'string' && d3Shape[curve]) {
        line$1 = line$1.curve(d3Shape[curve]);
      } else if (typeof curve === 'function') {
        line$1 = line$1.curve(curve);
      }

      ctx.beginPath();
      ctx.strokeStyle = 'rgba(' + strokeColor.r + ', ' + strokeColor.g + ', ' + strokeColor.b + ', ' + opacity + ')';
      ctx.lineWidth = strokeWidth;

      if (strokeDasharray) {
        ctx.setLineDash(strokeDasharray);
      }

      line$1.context(ctx)(data);
      ctx.stroke();
      ctx.closePath(); // set back to default

      ctx.lineWidth = 1;
      ctx.setLineDash([]);
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return LineSeriesCanvas;
}(AbstractSeries);

LineSeriesCanvas.displayName = 'LineSeriesCanvas';
LineSeriesCanvas.defaultProps = _extends$w({}, AbstractSeries.defaultProps, {
  strokeWidth: 2
});
LineSeriesCanvas.propTypes = _extends$w({}, AbstractSeries.propTypes, {
  strokeWidth: PropTypes.number
});

var _extends$x = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$t = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$t(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$t(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$t(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var LineMarkSeriesCanvas = function (_AbstractSeries) {
  _inherits$t(LineMarkSeriesCanvas, _AbstractSeries);

  function LineMarkSeriesCanvas() {
    _classCallCheck$t(this, LineMarkSeriesCanvas);

    return _possibleConstructorReturn$t(this, (LineMarkSeriesCanvas.__proto__ || Object.getPrototypeOf(LineMarkSeriesCanvas)).apply(this, arguments));
  }

  _createClass$t(LineMarkSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return null;
    }
  }], [{
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      LineSeriesCanvas.renderLayer(props, ctx);
      MarkSeriesCanvas.renderLayer(props, ctx);
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return LineMarkSeriesCanvas;
}(AbstractSeries);

LineMarkSeriesCanvas.displayName = 'LineMarkSeriesCanvas';
LineMarkSeriesCanvas.propTypes = _extends$x({}, AbstractSeries.propTypes);

var _extends$y = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$u = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$u(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$u(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$u(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$d = 'rv-xy-plot__series rv-xy-plot__series--polygon';
var DEFAULT_COLOR$1 = '#12939A';

var generatePath = function generatePath(data, xFunctor, yFunctor) {
  return data.reduce(function (res, row, i) {
    return res + ' ' + (i ? 'L' : 'M') + xFunctor(row) + ' ' + yFunctor(row);
  }, '') + ' Z';
};

var PolygonSeries = function (_AbstractSeries) {
  _inherits$u(PolygonSeries, _AbstractSeries);

  function PolygonSeries() {
    _classCallCheck$u(this, PolygonSeries);

    return _possibleConstructorReturn$u(this, (PolygonSeries.__proto__ || Object.getPrototypeOf(PolygonSeries)).apply(this, arguments));
  }

  _createClass$u(PolygonSeries, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          animation = _props.animation,
          color = _props.color,
          className = _props.className,
          data = _props.data,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          style = _props.style;

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$y({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(PolygonSeries, _extends$y({}, this.props, {
          animation: null
        })));
      }

      var xFunctor = this._getAttributeFunctor('x');

      var yFunctor = this._getAttributeFunctor('y');

      return React.createElement('path', {
        className: predefinedClassName$d + ' ' + className,
        onMouseOver: function onMouseOver(e) {
          return _this2._seriesMouseOverHandler(data, e);
        },
        onMouseOut: function onMouseOut(e) {
          return _this2._seriesMouseOutHandler(data, e);
        },
        onClick: this._seriesClickHandler,
        onContextMenu: this._seriesRightClickHandler,
        fill: color || DEFAULT_COLOR$1,
        style: style,
        d: generatePath(data, xFunctor, yFunctor),
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      });
    }
  }], [{
    key: 'propTypes',
    get: function get() {
      return _extends$y({}, AbstractSeries.propTypes);
    }
  }]);

  return PolygonSeries;
}(AbstractSeries);

PolygonSeries.displayName = 'PolygonSeries';

var _extends$z = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$v = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$v(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$v(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$v(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var VerticalBarSeries = function (_AbstractSeries) {
  _inherits$v(VerticalBarSeries, _AbstractSeries);

  function VerticalBarSeries() {
    _classCallCheck$v(this, VerticalBarSeries);

    return _possibleConstructorReturn$v(this, (VerticalBarSeries.__proto__ || Object.getPrototypeOf(VerticalBarSeries)).apply(this, arguments));
  }

  _createClass$v(VerticalBarSeries, [{
    key: 'render',
    value: function render() {
      return React.createElement(BarSeries, _extends$z({}, this.props, {
        linePosAttr: 'x',
        valuePosAttr: 'y',
        lineSizeAttr: 'width',
        valueSizeAttr: 'height'
      }));
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = attr === 'x';
      var zeroBaseValue = attr === 'y';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded,
        zeroBaseValue: zeroBaseValue
      };
    }
  }]);

  return VerticalBarSeries;
}(AbstractSeries);

VerticalBarSeries.displayName = 'VerticalBarSeries';

var _extends$A = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$w = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$w(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$w(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$w(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var HorizontalBarSeriesCanvas$1 = function (_AbstractSeries) {
  _inherits$w(HorizontalBarSeriesCanvas, _AbstractSeries);

  function HorizontalBarSeriesCanvas() {
    _classCallCheck$w(this, HorizontalBarSeriesCanvas);

    return _possibleConstructorReturn$w(this, (HorizontalBarSeriesCanvas.__proto__ || Object.getPrototypeOf(HorizontalBarSeriesCanvas)).apply(this, arguments));
  }

  _createClass$w(HorizontalBarSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return null;
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = attr === 'x';
      var zeroBaseValue = attr === 'y';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded,
        zeroBaseValue: zeroBaseValue
      };
    }
  }, {
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      BarSeriesCanvas.renderLayer(_extends$A({}, props, {
        linePosAttr: 'x',
        valuePosAttr: 'y',
        lineSizeAttr: 'width',
        valueSizeAttr: 'height'
      }), ctx);
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return HorizontalBarSeriesCanvas;
}(AbstractSeries);

HorizontalBarSeriesCanvas$1.displayName = 'HorizontalBarSeriesCanvas';
HorizontalBarSeriesCanvas$1.propTypes = _extends$A({}, AbstractSeries.propTypes);

var _extends$B = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var VERTICAL$1 = DIRECTION.VERTICAL;

var propTypes$6 = _extends$B({}, GridLines.propTypes, {
  direction: PropTypes.oneOf([VERTICAL$1])
});

var defaultProps$4 = {
  direction: VERTICAL$1,
  attr: 'x'
};

function VerticalGridLines(props) {
  return React.createElement(GridLines, props);
}

VerticalGridLines.displayName = 'VerticalGridLines';
VerticalGridLines.propTypes = propTypes$6;
VerticalGridLines.defaultProps = defaultProps$4;
VerticalGridLines.requiresSVG = true;

var _extends$C = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$x = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$x(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$x(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$x(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var VerticalRectSeries = function (_AbstractSeries) {
  _inherits$x(VerticalRectSeries, _AbstractSeries);

  function VerticalRectSeries() {
    _classCallCheck$x(this, VerticalRectSeries);

    return _possibleConstructorReturn$x(this, (VerticalRectSeries.__proto__ || Object.getPrototypeOf(VerticalRectSeries)).apply(this, arguments));
  }

  _createClass$x(VerticalRectSeries, [{
    key: 'render',
    value: function render() {
      return React.createElement(RectSeries, _extends$C({}, this.props, {
        linePosAttr: 'x',
        valuePosAttr: 'y',
        lineSizeAttr: 'width',
        valueSizeAttr: 'height'
      }));
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = false;
      var zeroBaseValue = attr === 'y';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded,
        zeroBaseValue: zeroBaseValue
      };
    }
  }]);

  return VerticalRectSeries;
}(AbstractSeries);

VerticalRectSeries.displayName = 'VerticalRectSeries';

var _extends$D = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$y = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$y(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$y(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$y(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var HorizontalRectSeriesCanvas$1 = function (_AbstractSeries) {
  _inherits$y(HorizontalRectSeriesCanvas, _AbstractSeries);

  function HorizontalRectSeriesCanvas() {
    _classCallCheck$y(this, HorizontalRectSeriesCanvas);

    return _possibleConstructorReturn$y(this, (HorizontalRectSeriesCanvas.__proto__ || Object.getPrototypeOf(HorizontalRectSeriesCanvas)).apply(this, arguments));
  }

  _createClass$y(HorizontalRectSeriesCanvas, [{
    key: 'render',
    value: function render() {
      return null;
    }
  }], [{
    key: 'getParentConfig',
    value: function getParentConfig(attr) {
      var isDomainAdjustmentNeeded = false;
      var zeroBaseValue = attr === 'y';
      return {
        isDomainAdjustmentNeeded: isDomainAdjustmentNeeded,
        zeroBaseValue: zeroBaseValue
      };
    }
  }, {
    key: 'renderLayer',
    value: function renderLayer(props, ctx) {
      RectSeriesCanvas.renderLayer(_extends$D({}, props, {
        linePosAttr: 'x',
        valuePosAttr: 'y',
        lineSizeAttr: 'width',
        valueSizeAttr: 'height'
      }), ctx);
    }
  }, {
    key: 'requiresSVG',
    get: function get() {
      return false;
    }
  }, {
    key: 'isCanvas',
    get: function get() {
      return true;
    }
  }]);

  return HorizontalRectSeriesCanvas;
}(AbstractSeries);

HorizontalRectSeriesCanvas$1.displayName = 'HorizontalRectSeriesCanvas';
HorizontalRectSeriesCanvas$1.propTypes = _extends$D({}, AbstractSeries.propTypes);

var _extends$E = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var NOOP = function NOOP(f) {
  return f;
}; // Find the index of the node at coordinates of a touch point


function getNodeIndex(evt) {
  var _evt$nativeEvent = evt.nativeEvent,
      pageX = _evt$nativeEvent.pageX,
      pageY = _evt$nativeEvent.pageY;
  var target = document.elementFromPoint(pageX, pageY);

  if (!target) {
    return -1;
  }

  var parentNode = target.parentNode;
  return Array.prototype.indexOf.call(parentNode.childNodes, target);
}

function getExtent(_ref) {
  var innerWidth = _ref.innerWidth,
      innerHeight = _ref.innerHeight,
      marginLeft = _ref.marginLeft,
      marginTop = _ref.marginTop;
  return [[marginLeft, marginTop], [innerWidth + marginLeft, innerHeight + marginTop]];
}

function Voronoi(props) {
  var className = props.className,
      extent = props.extent,
      nodes = props.nodes,
      onBlur = props.onBlur,
      _onClick = props.onClick,
      _onMouseUp = props.onMouseUp,
      _onMouseDown = props.onMouseDown,
      onHover = props.onHover,
      polygonStyle = props.polygonStyle,
      style = props.style,
      x = props.x,
      y = props.y; // Create a voronoi with each node center points

  var voronoiInstance = voronoi().x(x || getAttributeFunctor(props, 'x')).y(y || getAttributeFunctor(props, 'y')).extent(extent || getExtent(props)); // Create an array of polygons corresponding to the cells in voronoi

  var polygons = voronoiInstance.polygons(nodes); // Create helper function to handle special logic for touch events

  var handleTouchEvent = function handleTouchEvent(handler) {
    return function (evt) {
      evt.preventDefault();
      var index = getNodeIndex(evt);

      if (index > -1 && index < polygons.length) {
        var d = polygons[index];
        handler(d.data);
      }
    };
  };

  return React.createElement('g', {
    className: className + ' rv-voronoi',
    style: style // Because of the nature of how touch events, and more specifically touchmove
    // and how it differs from mouseover, we must manage touch events on the parent
    ,
    onTouchEnd: handleTouchEvent(_onMouseUp),
    onTouchStart: handleTouchEvent(_onMouseDown),
    onTouchMove: handleTouchEvent(onHover),
    onTouchCancel: handleTouchEvent(onBlur)
  }, polygons.map(function (d, i) {
    return React.createElement('path', {
      className: 'rv-voronoi__cell ' + (d.data && d.data.className || ''),
      d: 'M' + d.join('L') + 'Z',
      onClick: function onClick() {
        return _onClick(d.data);
      },
      onMouseUp: function onMouseUp() {
        return _onMouseUp(d.data);
      },
      onMouseDown: function onMouseDown() {
        return _onMouseDown(d.data);
      },
      onMouseOver: function onMouseOver() {
        return onHover(d.data);
      },
      onMouseOut: function onMouseOut() {
        return onBlur(d.data);
      },
      fill: 'none',
      style: _extends$E({
        pointerEvents: 'all'
      }, polygonStyle, d.data && d.data.style),
      key: i
    });
  }));
}

Voronoi.requiresSVG = true;
Voronoi.displayName = 'Voronoi';
Voronoi.defaultProps = {
  className: '',
  onBlur: NOOP,
  onClick: NOOP,
  onHover: NOOP,
  onMouseDown: NOOP,
  onMouseUp: NOOP
};
Voronoi.propTypes = {
  className: PropTypes.string,
  extent: PropTypes.arrayOf(PropTypes.arrayOf(PropTypes.number)),
  nodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  onBlur: PropTypes.func,
  onClick: PropTypes.func,
  onHover: PropTypes.func,
  onMouseDown: PropTypes.func,
  onMouseUp: PropTypes.func,
  x: PropTypes.func,
  y: PropTypes.func
};

var _createClass$z = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$F = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _classCallCheck$z(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$z(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$z(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$e = 'rv-xy-plot__series rv-xy-plot__series--whisker';
var DEFAULT_STROKE_WIDTH$1 = 1;
var DEFAULT_CROSS_BAR_WIDTH = 6;
/**
 * Render whisker lines for a data point.
 * @param {Object} whiskerMarkProps All the properties of the whisker mark.
 * @private
 */

var renderWhiskerMark = function renderWhiskerMark(whiskerMarkProps) {
  return function (d, i) {
    var crossBarWidth = whiskerMarkProps.crossBarWidth,
        opacityFunctor = whiskerMarkProps.opacityFunctor,
        sizeFunctor = whiskerMarkProps.sizeFunctor,
        strokeFunctor = whiskerMarkProps.strokeFunctor,
        strokeWidth = whiskerMarkProps.strokeWidth,
        style = whiskerMarkProps.style,
        valueClickHandler = whiskerMarkProps.valueClickHandler,
        valueMouseOutHandler = whiskerMarkProps.valueMouseOutHandler,
        valueMouseOverHandler = whiskerMarkProps.valueMouseOverHandler,
        valueRightClickHandler = whiskerMarkProps.valueRightClickHandler,
        xFunctor = whiskerMarkProps.xFunctor,
        yFunctor = whiskerMarkProps.yFunctor;
    var r = sizeFunctor ? sizeFunctor(d) : 0;
    var cx = xFunctor(d);
    var cy = yFunctor(d);
    var positiveXVariance = xFunctor({
      x: d.x + d.xVariance / 2
    });
    var negativeXVariance = xFunctor({
      x: d.x - d.xVariance / 2
    });
    var positiveYVariance = yFunctor({
      y: d.y + d.yVariance / 2
    });
    var negativeYVariance = yFunctor({
      y: d.y - d.yVariance / 2
    });
    /**
     * Determine whether on not we should draw whiskers in each direction.
     * We need to see an actual variance value, and also have that value extend past the
     * radius "buffer" region in which we won't be drawing (if any).
     */

    var hasXWhiskers = positiveXVariance && cx + r < positiveXVariance;
    var hasYWhiskers = positiveYVariance && cy - r > positiveYVariance;

    if (!hasXWhiskers && !hasYWhiskers) {
      return null;
    }

    var styleAttr = _extends$F({
      opacity: opacityFunctor ? opacityFunctor(d) : DEFAULT_OPACITY,
      stroke: strokeFunctor && strokeFunctor(d),
      strokeWidth: strokeWidth || DEFAULT_STROKE_WIDTH$1
    }, style);

    var crossBarExtension = crossBarWidth / 2;
    var rightLineAttrs = {
      x1: cx + r,
      y1: cy,
      x2: positiveXVariance,
      y2: cy,
      style: styleAttr
    };
    var leftLineAttrs = {
      x1: cx - r,
      y1: cy,
      x2: negativeXVariance,
      y2: cy,
      style: styleAttr
    };
    var rightCrossBarAttrs = {
      x1: positiveXVariance,
      y1: cy - crossBarExtension,
      x2: positiveXVariance,
      y2: cy + crossBarExtension,
      style: styleAttr
    };
    var leftCrossBarAttrs = {
      x1: negativeXVariance,
      y1: cy - crossBarExtension,
      x2: negativeXVariance,
      y2: cy + crossBarExtension,
      style: styleAttr
    };
    var upperLineAttrs = {
      x1: cx,
      y1: cy - r,
      x2: cx,
      y2: positiveYVariance,
      style: styleAttr
    };
    var lowerLineAttrs = {
      x1: cx,
      y1: cy + r,
      x2: cx,
      y2: negativeYVariance,
      style: styleAttr
    };
    var upperCrossBarAttrs = {
      x1: cx - crossBarExtension,
      y1: positiveYVariance,
      x2: cx + crossBarExtension,
      y2: positiveYVariance,
      style: styleAttr
    };
    var lowerCrossBarAttrs = {
      x1: cx - crossBarExtension,
      y1: negativeYVariance,
      x2: cx + crossBarExtension,
      y2: negativeYVariance,
      style: styleAttr
    };
    return React.createElement('g', {
      className: 'mark-whiskers',
      key: i,
      onClick: function onClick(e) {
        return valueClickHandler(d, e);
      },
      onContextMenu: function onContextMenu(e) {
        return valueRightClickHandler(d, e);
      },
      onMouseOver: function onMouseOver(e) {
        return valueMouseOverHandler(d, e);
      },
      onMouseOut: function onMouseOut(e) {
        return valueMouseOutHandler(d, e);
      }
    }, hasXWhiskers ? React.createElement('g', {
      className: 'x-whiskers'
    }, React.createElement('line', rightLineAttrs), React.createElement('line', leftLineAttrs), React.createElement('line', rightCrossBarAttrs), React.createElement('line', leftCrossBarAttrs)) : null, hasYWhiskers ? React.createElement('g', {
      className: 'y-whiskers'
    }, React.createElement('line', upperLineAttrs), React.createElement('line', lowerLineAttrs), React.createElement('line', upperCrossBarAttrs), React.createElement('line', lowerCrossBarAttrs)) : null);
  };
};

var WhiskerSeries = function (_AbstractSeries) {
  _inherits$z(WhiskerSeries, _AbstractSeries);

  function WhiskerSeries() {
    _classCallCheck$z(this, WhiskerSeries);

    return _possibleConstructorReturn$z(this, (WhiskerSeries.__proto__ || Object.getPrototypeOf(WhiskerSeries)).apply(this, arguments));
  }

  _createClass$z(WhiskerSeries, [{
    key: 'render',
    value: function render() {
      var _props = this.props,
          animation = _props.animation,
          className = _props.className,
          crossBarWidth = _props.crossBarWidth,
          data = _props.data,
          marginLeft = _props.marginLeft,
          marginTop = _props.marginTop,
          strokeWidth = _props.strokeWidth,
          style = _props.style;

      if (!data) {
        return null;
      }

      if (animation) {
        return React.createElement(Animation, _extends$F({}, this.props, {
          animatedProps: ANIMATED_SERIES_PROPS
        }), React.createElement(WhiskerSeries, _extends$F({}, this.props, {
          animation: null
        })));
      }

      var whiskerMarkProps = {
        crossBarWidth: crossBarWidth,
        opacityFunctor: this._getAttributeFunctor('opacity'),
        sizeFunctor: this._getAttributeFunctor('size'),
        strokeFunctor: this._getAttributeFunctor('stroke') || this._getAttributeFunctor('color'),
        strokeWidth: strokeWidth,
        style: style,
        xFunctor: this._getAttributeFunctor('x'),
        yFunctor: this._getAttributeFunctor('y'),
        valueClickHandler: this._valueClickHandler,
        valueRightClickHandler: this._valueRightClickHandler,
        valueMouseOverHandler: this._valueMouseOverHandler,
        valueMouseOutHandler: this._valueMouseOutHandler
      };
      return React.createElement('g', {
        className: predefinedClassName$e + ' ' + className,
        transform: 'translate(' + marginLeft + ',' + marginTop + ')'
      }, data.map(renderWhiskerMark(whiskerMarkProps)));
    }
  }]);

  return WhiskerSeries;
}(AbstractSeries);

WhiskerSeries.displayName = 'WhiskerSeries';
WhiskerSeries.propTypes = _extends$F({}, AbstractSeries.propTypes, {
  strokeWidth: PropTypes.number
});
WhiskerSeries.defaultProps = _extends$F({}, AbstractSeries.defaultProps, {
  crossBarWidth: DEFAULT_CROSS_BAR_WIDTH,
  size: 0,
  strokeWidth: DEFAULT_STROKE_WIDTH$1
});

var _extends$G = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};
/**
 * Get the dimensions of the component for the future use.
 * @param {Object} props Props.
 * @param {Object} defaultMargins Object with default margins.
 * @returns {Object} Dimensions of the component.
 */


function getInnerDimensions(props, defaultMargins) {
  var margin = props.margin,
      width = props.width,
      height = props.height;

  var marginProps = _extends$G({}, defaultMargins, typeof margin === 'number' ? {
    left: margin,
    right: margin,
    top: margin,
    bottom: margin
  } : margin);

  var _marginProps$left = marginProps.left,
      marginLeft = _marginProps$left === undefined ? 0 : _marginProps$left,
      _marginProps$top = marginProps.top,
      marginTop = _marginProps$top === undefined ? 0 : _marginProps$top,
      _marginProps$right = marginProps.right,
      marginRight = _marginProps$right === undefined ? 0 : _marginProps$right,
      _marginProps$bottom = marginProps.bottom,
      marginBottom = _marginProps$bottom === undefined ? 0 : _marginProps$bottom;
  return {
    marginLeft: marginLeft,
    marginTop: marginTop,
    marginRight: marginRight,
    marginBottom: marginBottom,
    innerHeight: height - marginBottom - marginTop,
    innerWidth: width - marginLeft - marginRight
  };
}
/**
 * Calculate the margin of the sunburst,
 * so it can be at the center of the container
 * @param  {Number} width - the width of the container
 * @param  {Number} height - the height of the container
 * @param  {Number} radius - the max radius of the sunburst
 * @return {Object} an object includes {bottom, left, right, top}
 */


function getRadialLayoutMargin(width, height, radius) {
  var marginX = width / 2 - radius;
  var marginY = height / 2 - radius;
  return {
    bottom: marginY,
    left: marginX,
    right: marginX,
    top: marginY
  };
}

var MarginPropType = PropTypes.oneOfType([PropTypes.shape({
  left: PropTypes.number,
  top: PropTypes.number,
  right: PropTypes.number,
  bottom: PropTypes.number
}), PropTypes.number]);
var DEFAULT_MARGINS = {
  left: 40,
  right: 10,
  top: 10,
  bottom: 40
};

var _createClass$A = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$H = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _classCallCheck$A(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$A(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$A(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var MAX_DRAWS = 30;
/**
 * Draw loop draws each of the layers until it should draw more
 * @param {CanvasContext} ctx - the context where the drawing will take place
 * @param {Number} height - height of the canvas
 * @param {Number} width - width of the canvas
 * @param {Array} layers - the layer objects to render
 */

function engageDrawLoop(ctx, height, width, layers) {
  var drawIteration = 0; // using setInterval because request animation frame goes too fast

  var drawCycle = setInterval(function () {
    if (!ctx) {
      clearInterval(drawCycle);
      return;
    }

    drawLayers(ctx, height, width, layers, drawIteration);

    if (drawIteration > MAX_DRAWS) {
      clearInterval(drawCycle);
    }

    drawIteration += 1;
  }, 1);
}
/**
 * Loops across each of the layers to be drawn and draws them
 * @param {CanvasContext} ctx - the context where the drawing will take place
 * @param {Number} height - height of the canvas
 * @param {Number} width - width of the canvas
 * @param {Array} layers - the layer objects to render
 * @param {Number} drawIteration - width of the canvas
 */


function drawLayers(ctx, height, width, layers, drawIteration) {
  ctx.clearRect(0, 0, width, height);
  layers.forEach(function (layer) {
    var interpolator = layer.interpolator,
        newProps = layer.newProps,
        animation = layer.animation; // return an empty object if dont need to be animating

    var interpolatedProps = animation ? interpolator ? interpolator(drawIteration / MAX_DRAWS) : interpolator : function () {
      return {};
    };
    layer.renderLayer(_extends$H({}, newProps, interpolatedProps), ctx);
  });
}
/**
 * Build an array of layer of objects the contain the method for drawing each series
 * as well as an interpolar (specifically a d3-interpolate interpolator)
 * @param {Object} newChildren the new children to be rendered.
 * @param {Object} oldChildren the old children to be rendered.
 * @returns {Array} Object for rendering
 */


function buildLayers(newChildren, oldChildren) {
  return newChildren.map(function (child, index) {
    var oldProps = oldChildren[index] ? oldChildren[index].props : {};
    var newProps = child.props;
    var oldAnimatedProps = extractAnimatedPropValues(_extends$H({}, oldProps, {
      animatedProps: ANIMATED_SERIES_PROPS
    }));
    var newAnimatedProps = newProps ? extractAnimatedPropValues(_extends$H({}, newProps, {
      animatedProps: ANIMATED_SERIES_PROPS
    })) : null;
    var interpolator = interpolate(oldAnimatedProps, newAnimatedProps);
    return {
      renderLayer: child.type.renderLayer,
      newProps: child.props,
      animation: child.props.animation,
      interpolator: interpolator
    };
  });
}

var CanvasWrapper = function (_Component) {
  _inherits$A(CanvasWrapper, _Component);

  function CanvasWrapper() {
    _classCallCheck$A(this, CanvasWrapper);

    return _possibleConstructorReturn$A(this, (CanvasWrapper.__proto__ || Object.getPrototypeOf(CanvasWrapper)).apply(this, arguments));
  }

  _createClass$A(CanvasWrapper, [{
    key: 'componentDidMount',
    value: function componentDidMount() {
      var ctx = this.canvas.getContext('2d');

      if (!ctx) {
        return;
      }

      var pixelRatio = this.props.pixelRatio;

      if (!ctx) {
        return;
      }

      ctx.scale(pixelRatio, pixelRatio);
      this.drawChildren(null, this.props, ctx);
    }
  }, {
    key: 'componentDidUpdate',
    value: function componentDidUpdate(oldProps) {
      this.drawChildren(oldProps, this.props, this.canvas.getContext('2d'));
    }
    /**
     * Check that we can and should be animating, then kick off animations as apporpriate
     * @param {Object} newProps the new props to be interpolated to
     * @param {Object} oldProps the old props to be interpolated against
     * @param {DomRef} ctx the canvas context to be drawn on.
     * @returns {Array} Object for rendering
     */

  }, {
    key: 'drawChildren',
    value: function drawChildren(oldProps, newProps, ctx) {
      var children = newProps.children,
          innerHeight = newProps.innerHeight,
          innerWidth = newProps.innerWidth,
          marginBottom = newProps.marginBottom,
          marginLeft = newProps.marginLeft,
          marginRight = newProps.marginRight,
          marginTop = newProps.marginTop;

      if (!ctx) {
        return;
      }

      var childrenShouldAnimate = children.find(function (child) {
        return child.props.animation;
      });
      var height = innerHeight + marginTop + marginBottom;
      var width = innerWidth + marginLeft + marginRight;
      var layers = buildLayers(newProps.children, oldProps ? oldProps.children : []); // if we don't need to be animating, dont! cut short

      if (!childrenShouldAnimate) {
        drawLayers(ctx, height, width, layers);
        return;
      }

      engageDrawLoop(ctx, height, width, layers);
    }
  }, {
    key: 'render',
    value: function render() {
      var _this2 = this;

      var _props = this.props,
          innerHeight = _props.innerHeight,
          innerWidth = _props.innerWidth,
          marginBottom = _props.marginBottom,
          marginLeft = _props.marginLeft,
          marginRight = _props.marginRight,
          marginTop = _props.marginTop,
          pixelRatio = _props.pixelRatio;
      var height = innerHeight + marginTop + marginBottom;
      var width = innerWidth + marginLeft + marginRight;
      return React.createElement('div', {
        style: {
          left: 0,
          top: 0
        },
        className: 'rv-xy-canvas'
      }, React.createElement('canvas', {
        className: 'rv-xy-canvas-element',
        height: height * pixelRatio,
        width: width * pixelRatio,
        style: {
          height: height + 'px',
          width: width + 'px'
        },
        ref: function ref(_ref) {
          return _this2.canvas = _ref;
        }
      }), this.props.children);
    }
  }], [{
    key: 'defaultProps',
    get: function get() {
      return {
        pixelRatio: window && window.devicePixelRatio || 1
      };
    }
  }]);

  return CanvasWrapper;
}(Component);

CanvasWrapper.displayName = 'CanvasWrapper';
CanvasWrapper.propTypes = {
  marginBottom: PropTypes.number.isRequired,
  marginLeft: PropTypes.number.isRequired,
  marginRight: PropTypes.number.isRequired,
  marginTop: PropTypes.number.isRequired,
  innerHeight: PropTypes.number.isRequired,
  innerWidth: PropTypes.number.isRequired,
  pixelRatio: PropTypes.number.isRequired
};

var _createClass$B = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$I = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _toConsumableArray$3(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  } else {
    return Array.from(arr);
  }
}

function _defineProperty$5(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _classCallCheck$B(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$B(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$B(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var ATTRIBUTES$1 = ['x', 'y', 'radius', 'angle', 'color', 'fill', 'stroke', 'opacity', 'size'];
/**
 * Remove parents from tree formatted data. deep-equal doesnt play nice with data
 * that has circular structures, so we make every node single directional by pruning the parents.
 * @param {Array} data - the data object to have circular deps resolved in
 * @returns {Array} the sanitized data
 */

function cleanseData(data) {
  return data.map(function (series) {
    if (!Array.isArray(series)) {
      return series;
    }

    return series.map(function (row) {
      return _extends$I({}, row, {
        parent: null
      });
    });
  });
}
/**
 * Wrapper on the deep-equal method for checking equality of next props vs current props
 * @param {Object} scaleMixins - Scale object.
 * @param {Object} nextScaleMixins - Scale object.
 * @param {Boolean} hasTreeStructure - Whether or not to cleanse the data of possible cyclic structures
 * @returns {Boolean} whether or not the two mixins objects are equal
 */


function checkIfMixinsAreEqual(nextScaleMixins, scaleMixins, hasTreeStructure) {
  var newMixins = _extends$I({}, nextScaleMixins, {
    _allData: hasTreeStructure ? cleanseData(nextScaleMixins._allData) : nextScaleMixins._allData
  });

  var oldMixins = _extends$I({}, scaleMixins, {
    _allData: hasTreeStructure ? cleanseData(scaleMixins._allData) : scaleMixins._allData
  }); // it's hard to say if this function is reasonable?


  return equal(newMixins, oldMixins);
}

var XYPlot = function (_React$Component) {
  _inherits$B(XYPlot, _React$Component);

  _createClass$B(XYPlot, null, [{
    key: 'defaultProps',
    get: function get() {
      return {
        className: ''
      };
    }
  }, {
    key: 'propTypes',
    get: function get() {
      return {
        animation: AnimationPropType,
        className: PropTypes.string,
        dontCheckIfEmpty: PropTypes.bool,
        height: PropTypes.number.isRequired,
        margin: MarginPropType,
        onClick: PropTypes.func,
        onDoubleClick: PropTypes.func,
        onMouseDown: PropTypes.func,
        onMouseUp: PropTypes.func,
        onMouseEnter: PropTypes.func,
        onMouseLeave: PropTypes.func,
        onMouseMove: PropTypes.func,
        onTouchStart: PropTypes.func,
        onTouchMove: PropTypes.func,
        onTouchEnd: PropTypes.func,
        onTouchCancel: PropTypes.func,
        onWheel: PropTypes.func,
        stackBy: PropTypes.oneOf(ATTRIBUTES$1),
        style: PropTypes.object,
        width: PropTypes.number.isRequired
      };
    }
  }]);

  function XYPlot(props) {
    _classCallCheck$B(this, XYPlot);

    var _this = _possibleConstructorReturn$B(this, (XYPlot.__proto__ || Object.getPrototypeOf(XYPlot)).call(this, props));

    _initialiseProps.call(_this);

    var stackBy = props.stackBy;
    var children = getSeriesChildren(props.children);
    var data = getStackedData(children, stackBy);
    _this.state = {
      scaleMixins: _this._getScaleMixins(data, props),
      data: data
    };
    return _this;
  }

  _createClass$B(XYPlot, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(nextProps) {
      var children = getSeriesChildren(nextProps.children);
      var nextData = getStackedData(children, nextProps.stackBy);
      var scaleMixins = this.state.scaleMixins;

      var nextScaleMixins = this._getScaleMixins(nextData, nextProps);

      if (!checkIfMixinsAreEqual(nextScaleMixins, scaleMixins, nextProps.hasTreeStructure)) {
        this.setState({
          scaleMixins: nextScaleMixins,
          data: nextData
        });
      }
    }
    /**
     * Trigger click related callbacks if they are available.
     * @param {React.SyntheticEvent} event Click event.
     * @private
     */

    /**
     * Trigger doule-click related callbacks if they are available.
     * @param {React.SyntheticEvent} event Double-click event.
     * @private
     */

  }, {
    key: '_getClonedChildComponents',

    /**
     * Prepare the child components (including series) for rendering.
     * @returns {Array} Array of child components.
     * @private
     */
    value: function _getClonedChildComponents() {
      var _this2 = this;

      var props = this.props;
      var animation = this.props.animation;
      var _state = this.state,
          scaleMixins = _state.scaleMixins,
          data = _state.data;
      var dimensions = getInnerDimensions(this.props, DEFAULT_MARGINS);
      var children = React.Children.toArray(this.props.children);
      var seriesProps = getSeriesPropsFromChildren(children);
      var XYPlotValues = getXYPlotValues(props, children);
      return children.map(function (child, index) {
        var dataProps = null;

        if (seriesProps[index]) {
          // Get the index of the series in the list of props and retrieve
          // the data property from it.
          var seriesIndex = seriesProps[index].seriesIndex;
          dataProps = {
            data: data[seriesIndex]
          };
        }

        return React.cloneElement(child, _extends$I({}, dimensions, {
          animation: animation
        }, dataProps && child.type.prototype && child.type.prototype.render ? {
          ref: function ref(_ref) {
            return _this2['series' + seriesProps[index].seriesIndex] = _ref;
          }
        } : {}, seriesProps[index], scaleMixins, child.props, XYPlotValues[index], dataProps));
      });
    }
    /**
     * Get the list of scale-related settings that should be applied by default.
     * @param {Object} props Object of props.
     * @returns {Object} Defaults.
     * @private
     */

  }, {
    key: '_getDefaultScaleProps',
    value: function _getDefaultScaleProps(props) {
      var _getInnerDimensions = getInnerDimensions(props, DEFAULT_MARGINS),
          innerWidth = _getInnerDimensions.innerWidth,
          innerHeight = _getInnerDimensions.innerHeight;

      var colorRanges = ['color', 'fill', 'stroke'].reduce(function (acc, attr) {
        var range = props[attr + 'Type'] === 'category' ? EXTENDED_DISCRETE_COLOR_RANGE : CONTINUOUS_COLOR_RANGE;
        return _extends$I({}, acc, _defineProperty$5({}, attr + 'Range', range));
      }, {});
      return _extends$I({
        xRange: [0, innerWidth],
        yRange: [innerHeight, 0]
      }, colorRanges, {
        opacityType: OPACITY_TYPE,
        sizeRange: SIZE_RANGE
      });
    }
    /**
     * Get the map of scales from the props, apply defaults to them and then pass
     * them further.
     * @param {Object} data Array of all data.
     * @param {Object} props Props of the component.
     * @returns {Object} Map of scale-related props.
     * @private
     */

  }, {
    key: '_getScaleMixins',
    value: function _getScaleMixins(data, props) {
      var _ref2;

      var filteredData = data.filter(function (d) {
        return d;
      });

      var allData = (_ref2 = []).concat.apply(_ref2, _toConsumableArray$3(filteredData));

      var defaultScaleProps = this._getDefaultScaleProps(props);

      var optionalScaleProps = getOptionalScaleProps(props);
      var userScaleProps = extractScalePropsFromProps(props, ATTRIBUTES$1);
      var missingScaleProps = getMissingScaleProps(_extends$I({}, defaultScaleProps, optionalScaleProps, userScaleProps), allData, ATTRIBUTES$1);
      var children = getSeriesChildren(props.children);
      var zeroBaseProps = {};
      var adjustBy = new Set();
      var adjustWhat = new Set();
      children.forEach(function (child, index) {
        if (!child || !data[index]) {
          return;
        }

        ATTRIBUTES$1.forEach(function (attr) {
          var _child$type$getParent = child.type.getParentConfig(attr, child.props),
              isDomainAdjustmentNeeded = _child$type$getParent.isDomainAdjustmentNeeded,
              zeroBaseValue = _child$type$getParent.zeroBaseValue;

          if (isDomainAdjustmentNeeded) {
            adjustBy.add(attr);
            adjustWhat.add(index);
          }

          if (zeroBaseValue) {
            var specifiedDomain = props[attr + 'Domain'];
            zeroBaseProps[attr + 'BaseValue'] = specifiedDomain ? specifiedDomain[0] : 0;
          }
        });
      });
      return _extends$I({}, defaultScaleProps, zeroBaseProps, userScaleProps, missingScaleProps, {
        _allData: data,
        _adjustBy: Array.from(adjustBy),
        _adjustWhat: Array.from(adjustWhat),
        _stackBy: props.stackBy
      });
    }
    /**
     * Checks if the plot is empty or not.
     * Currently checks the data only.
     * @returns {boolean} True for empty.
     * @private
     */

  }, {
    key: '_isPlotEmpty',
    value: function _isPlotEmpty() {
      var data = this.state.data;
      return !data || !data.length || !data.some(function (series) {
        return series && series.some(function (d) {
          return d;
        });
      });
    }
    /**
     * Trigger mouse-down related callbacks if they are available.
     * @param {React.SyntheticEvent} event Mouse down event.
     * @private
     */

    /**
     * Trigger onMouseEnter handler if it was passed in props.
     * @param {React.SyntheticEvent} event Mouse enter event.
     * @private
     */

    /**
     * Trigger onMouseLeave handler if it was passed in props.
     * @param {React.SyntheticEvent} event Mouse leave event.
     * @private
     */

    /**
     * Trigger movement-related callbacks if they are available.
     * @param {React.SyntheticEvent} event Mouse move event.
     * @private
     */

    /**
     * Trigger mouse-up related callbacks if they are available.
     * @param {React.SyntheticEvent} event Mouse up event.
     * @private
     */

    /**
     * Trigger onTouchCancel handler if it was passed in props.
     * @param {React.SyntheticEvent} event Touch Cancel event.
     * @private
     */

    /**
     * Trigger onTouchEnd handler if it was passed in props.
     * @param {React.SyntheticEvent} event Touch End event.
     * @private
     */

    /**
     * Trigger touch movement-related callbacks if they are available.
     * @param {React.SyntheticEvent} event Touch move event.
     * @private
     */

    /**
     * Trigger touch-start related callbacks if they are available.
     * @param {React.SyntheticEvent} event Touch start event.
     * @private
     */

    /**
     * Trigger doule-click related callbacks if they are available.
     * @param {React.SyntheticEvent} event Double-click event.
     * @private
     */

  }, {
    key: 'renderCanvasComponents',
    value: function renderCanvasComponents(components, props) {
      var componentsToRender = components.filter(function (c) {
        return c && !c.type.requiresSVG && c.type.isCanvas;
      });

      if (componentsToRender.length === 0) {
        return null;
      }

      var _componentsToRender$ = componentsToRender[0].props,
          marginLeft = _componentsToRender$.marginLeft,
          marginTop = _componentsToRender$.marginTop,
          marginBottom = _componentsToRender$.marginBottom,
          marginRight = _componentsToRender$.marginRight,
          innerHeight = _componentsToRender$.innerHeight,
          innerWidth = _componentsToRender$.innerWidth;
      return React.createElement(CanvasWrapper, {
        innerHeight: innerHeight,
        innerWidth: innerWidth,
        marginLeft: marginLeft,
        marginTop: marginTop,
        marginBottom: marginBottom,
        marginRight: marginRight
      }, componentsToRender);
    }
  }, {
    key: 'render',
    value: function render() {
      var _props = this.props,
          className = _props.className,
          dontCheckIfEmpty = _props.dontCheckIfEmpty,
          style = _props.style,
          width = _props.width,
          height = _props.height;

      if (!dontCheckIfEmpty && this._isPlotEmpty()) {
        return React.createElement('div', {
          className: 'rv-xy-plot ' + className,
          style: _extends$I({
            width: width + 'px',
            height: height + 'px'
          }, this.props.style)
        });
      }

      var components = this._getClonedChildComponents();

      return React.createElement('div', {
        style: {
          width: width + 'px',
          height: height + 'px'
        },
        className: 'rv-xy-plot ' + className
      }, React.createElement('svg', {
        className: 'rv-xy-plot__inner',
        width: width,
        height: height,
        style: style,
        onClick: this._clickHandler,
        onDoubleClick: this._doubleClickHandler,
        onMouseDown: this._mouseDownHandler,
        onMouseUp: this._mouseUpHandler,
        onMouseMove: this._mouseMoveHandler,
        onMouseLeave: this._mouseLeaveHandler,
        onMouseEnter: this._mouseEnterHandler,
        onTouchStart: this._mouseDownHandler,
        onTouchMove: this._touchMoveHandler,
        onTouchEnd: this._touchEndHandler,
        onTouchCancel: this._touchCancelHandler,
        onWheel: this._wheelHandler
      }, components.filter(function (c) {
        return c && c.type.requiresSVG;
      })), this.renderCanvasComponents(components, this.props), components.filter(function (c) {
        return c && !c.type.requiresSVG && !c.type.isCanvas;
      }));
    }
  }]);

  return XYPlot;
}(React.Component);

var _initialiseProps = function _initialiseProps() {
  var _this3 = this;

  this._clickHandler = function (event) {
    var onClick = _this3.props.onClick;

    if (onClick) {
      onClick(event);
    }
  };

  this._doubleClickHandler = function (event) {
    var onDoubleClick = _this3.props.onDoubleClick;

    if (onDoubleClick) {
      onDoubleClick(event);
    }
  };

  this._mouseDownHandler = function (event) {
    var _props2 = _this3.props,
        onMouseDown = _props2.onMouseDown,
        children = _props2.children;

    if (onMouseDown) {
      onMouseDown(event);
    }

    var seriesChildren = getSeriesChildren(children);
    seriesChildren.forEach(function (child, index) {
      var component = _this3['series' + index];

      if (component && component.onParentMouseDown) {
        component.onParentMouseDown(event);
      }
    });
  };

  this._mouseEnterHandler = function (event) {
    var _props3 = _this3.props,
        onMouseEnter = _props3.onMouseEnter,
        children = _props3.children;

    if (onMouseEnter) {
      onMouseEnter(event);
    }

    var seriesChildren = getSeriesChildren(children);
    seriesChildren.forEach(function (child, index) {
      var component = _this3['series' + index];

      if (component && component.onParentMouseEnter) {
        component.onParentMouseEnter(event);
      }
    });
  };

  this._mouseLeaveHandler = function (event) {
    var _props4 = _this3.props,
        onMouseLeave = _props4.onMouseLeave,
        children = _props4.children;

    if (onMouseLeave) {
      onMouseLeave(event);
    }

    var seriesChildren = getSeriesChildren(children);
    seriesChildren.forEach(function (child, index) {
      var component = _this3['series' + index];

      if (component && component.onParentMouseLeave) {
        component.onParentMouseLeave(event);
      }
    });
  };

  this._mouseMoveHandler = function (event) {
    var _props5 = _this3.props,
        onMouseMove = _props5.onMouseMove,
        children = _props5.children;

    if (onMouseMove) {
      onMouseMove(event);
    }

    var seriesChildren = getSeriesChildren(children);
    seriesChildren.forEach(function (child, index) {
      var component = _this3['series' + index];

      if (component && component.onParentMouseMove) {
        component.onParentMouseMove(event);
      }
    });
  };

  this._mouseUpHandler = function (event) {
    var _props6 = _this3.props,
        onMouseUp = _props6.onMouseUp,
        children = _props6.children;

    if (onMouseUp) {
      onMouseUp(event);
    }

    var seriesChildren = getSeriesChildren(children);
    seriesChildren.forEach(function (child, index) {
      var component = _this3['series' + index];

      if (component && component.onParentMouseUp) {
        component.onParentMouseUp(event);
      }
    });
  };

  this._touchCancelHandler = function (event) {
    var onTouchCancel = _this3.props.onTouchCancel;

    if (onTouchCancel) {
      onTouchCancel(event);
    }
  };

  this._touchEndHandler = function (event) {
    var onTouchEnd = _this3.props.onTouchEnd;

    if (onTouchEnd) {
      onTouchEnd(event);
    }
  };

  this._touchMoveHandler = function (event) {
    var _props7 = _this3.props,
        onTouchMove = _props7.onTouchMove,
        children = _props7.children;

    if (onTouchMove) {
      onTouchMove(event);
    }

    var seriesChildren = getSeriesChildren(children);
    seriesChildren.forEach(function (child, index) {
      var component = _this3['series' + index];

      if (component && component.onParentTouchMove) {
        component.onParentTouchMove(event);
      }
    });
  };

  this._touchStartHandler = function (event) {
    var _props8 = _this3.props,
        onTouchStart = _props8.onTouchStart,
        children = _props8.children;

    if (onTouchStart) {
      onTouchStart(event);
    }

    var seriesChildren = getSeriesChildren(children);
    seriesChildren.forEach(function (child, index) {
      var component = _this3['series' + index];

      if (component && component.onParentTouchStart) {
        component.onParentTouchStart(event);
      }
    });
  };

  this._wheelHandler = function (event) {
    var onWheel = _this3.props.onWheel;

    if (onWheel) {
      onWheel(event);
    }
  };
};

XYPlot.displayName = 'XYPlot';

var _extends$J = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var LEFT = ORIENTATION.LEFT,
    RIGHT = ORIENTATION.RIGHT,
    TOP = ORIENTATION.TOP,
    BOTTOM = ORIENTATION.BOTTOM;
var propTypes$7 = {
  height: PropTypes.number.isRequired,
  style: PropTypes.object,
  orientation: PropTypes.oneOf([LEFT, RIGHT, TOP, BOTTOM]).isRequired,
  width: PropTypes.number.isRequired
};
var defaultProps$5 = {
  style: {}
};

function AxisLine(_ref) {
  var orientation = _ref.orientation,
      width = _ref.width,
      height = _ref.height,
      style = _ref.style;
  var lineProps = void 0;

  if (orientation === LEFT) {
    lineProps = {
      x1: width,
      x2: width,
      y1: 0,
      y2: height
    };
  } else if (orientation === RIGHT) {
    lineProps = {
      x1: 0,
      x2: 0,
      y1: 0,
      y2: height
    };
  } else if (orientation === TOP) {
    lineProps = {
      x1: 0,
      x2: width,
      y1: height,
      y2: height
    };
  } else {
    lineProps = {
      x1: 0,
      x2: width,
      y1: 0,
      y2: 0
    };
  }

  return React.createElement('line', _extends$J({}, lineProps, {
    className: 'rv-xy-plot__axis__line',
    style: style
  }));
}

AxisLine.defaultProps = defaultProps$5;
AxisLine.displayName = 'AxisLine';
AxisLine.propTypes = propTypes$7;

var _extends$K = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$C = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _defineProperty$6(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _classCallCheck$C(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$C(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$C(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var LEFT$1 = ORIENTATION.LEFT,
    RIGHT$1 = ORIENTATION.RIGHT,
    TOP$1 = ORIENTATION.TOP,
    BOTTOM$1 = ORIENTATION.BOTTOM;
var propTypes$8 = {
  height: PropTypes.number.isRequired,
  orientation: PropTypes.oneOf([LEFT$1, RIGHT$1, TOP$1, BOTTOM$1]).isRequired,
  style: PropTypes.object,
  width: PropTypes.number.isRequired
};
var defaultProps$6 = {
  style: {}
};

function _getTickFormatFn(scale, tickTotal, tickFormat) {
  return !tickFormat ? scale.tickFormat ? scale.tickFormat(tickTotal) : function (v) {
    return v;
  } : tickFormat;
}

var AxisTicks = function (_React$Component) {
  _inherits$C(AxisTicks, _React$Component);

  function AxisTicks() {
    _classCallCheck$C(this, AxisTicks);

    return _possibleConstructorReturn$C(this, (AxisTicks.__proto__ || Object.getPrototypeOf(AxisTicks)).apply(this, arguments));
  }

  _createClass$C(AxisTicks, [{
    key: '_areTicksWrapped',

    /**
     * Check if axis ticks should be mirrored (for the right and top positions.
     * @returns {boolean} True if mirrored.
     * @private
     */
    value: function _areTicksWrapped() {
      var orientation = this.props.orientation;
      return orientation === LEFT$1 || orientation === TOP$1;
    }
  }, {
    key: '_getTickContainerPropsGetterFn',
    value: function _getTickContainerPropsGetterFn() {
      if (this._isAxisVertical()) {
        return function (pos) {
          return {
            transform: 'translate(0, ' + pos + ')'
          };
        };
      }

      return function (pos) {
        return {
          transform: 'translate(' + pos + ', 0)'
        };
      };
    }
    /**
     * Get attributes for the label of the tick.
     * @returns {Object} Object with properties.
     * @private
     */

  }, {
    key: '_getTickLabelProps',
    value: function _getTickLabelProps() {
      var _props = this.props,
          orientation = _props.orientation,
          tickLabelAngle = _props.tickLabelAngle,
          tickSize = _props.tickSize,
          _props$tickSizeOuter = _props.tickSizeOuter,
          tickSizeOuter = _props$tickSizeOuter === undefined ? tickSize : _props$tickSizeOuter,
          _props$tickPadding = _props.tickPadding,
          tickPadding = _props$tickPadding === undefined ? tickSize : _props$tickPadding; // Assign the text orientation inside the label of the tick mark.

      var textAnchor = void 0;

      if (orientation === LEFT$1 || orientation === BOTTOM$1 && tickLabelAngle) {
        textAnchor = 'end';
      } else if (orientation === RIGHT$1 || orientation === TOP$1 && tickLabelAngle) {
        textAnchor = 'start';
      } else {
        textAnchor = 'middle';
      } // The label's position is translated to the given padding and then the
      // label is rotated to the given angle.


      var isVertical = this._isAxisVertical();

      var wrap = this._areTicksWrapped() ? -1 : 1;
      var labelOffset = wrap * (tickSizeOuter + tickPadding);
      var transform = (isVertical ? 'translate(' + labelOffset + ', 0)' : 'translate(0, ' + labelOffset + ')') + (tickLabelAngle ? ' rotate(' + tickLabelAngle + ')' : ''); // Set the vertical offset of the label according to the position of
      // the axis.

      var dy = orientation === TOP$1 || tickLabelAngle ? '0' : orientation === BOTTOM$1 ? '0.72em' : '0.32em';
      return {
        textAnchor: textAnchor,
        dy: dy,
        transform: transform
      };
    }
    /**
     * Get the props of the tick line.
     * @returns {Object} Props.
     * @private
     */

  }, {
    key: '_getTickLineProps',
    value: function _getTickLineProps() {
      var _ref;

      var _props2 = this.props,
          tickSize = _props2.tickSize,
          _props2$tickSizeOuter = _props2.tickSizeOuter,
          tickSizeOuter = _props2$tickSizeOuter === undefined ? tickSize : _props2$tickSizeOuter,
          _props2$tickSizeInner = _props2.tickSizeInner,
          tickSizeInner = _props2$tickSizeInner === undefined ? tickSize : _props2$tickSizeInner;

      var isVertical = this._isAxisVertical();

      var tickXAttr = isVertical ? 'y' : 'x';
      var tickYAttr = isVertical ? 'x' : 'y';
      var wrap = this._areTicksWrapped() ? -1 : 1;
      return _ref = {}, _defineProperty$6(_ref, tickXAttr + '1', 0), _defineProperty$6(_ref, tickXAttr + '2', 0), _defineProperty$6(_ref, tickYAttr + '1', -wrap * tickSizeInner), _defineProperty$6(_ref, tickYAttr + '2', wrap * tickSizeOuter), _ref;
    }
    /**
     * Gets if the axis is vertical.
     * @returns {boolean} True if vertical.
     * @private
     */

  }, {
    key: '_isAxisVertical',
    value: function _isAxisVertical() {
      var orientation = this.props.orientation;
      return orientation === LEFT$1 || orientation === RIGHT$1;
    }
  }, {
    key: 'render',
    value: function render() {
      var _props3 = this.props,
          attr = _props3.attr,
          orientation = _props3.orientation,
          width = _props3.width,
          height = _props3.height,
          style = _props3.style,
          tickFormat = _props3.tickFormat,
          tickTotal = _props3.tickTotal,
          tickValues = _props3.tickValues;
      var x = orientation === LEFT$1 ? width : 0;
      var y = orientation === TOP$1 ? height : 0;
      var scale = getAttributeScale(this.props, attr);
      var values = getTickValues(scale, tickTotal, tickValues);

      var tickFormatFn = _getTickFormatFn(scale, tickTotal, tickFormat);

      var translateFn = this._getTickContainerPropsGetterFn();

      var pathProps = this._getTickLineProps();

      var textProps = this._getTickLabelProps();

      var ticks = values.map(function (v, i) {
        var pos = scale(v);
        var labelNode = tickFormatFn(v, i, scale, tickTotal);
        var shouldRenderAsOwnNode = React.isValidElement(labelNode) && !['tspan', 'textPath'].includes(labelNode.type);
        var shouldAddProps = labelNode && typeof labelNode.type !== 'string';
        return React.createElement('g', _extends$K({
          key: i
        }, translateFn(pos, 0), {
          className: 'rv-xy-plot__axis__tick',
          style: style
        }), React.createElement('line', _extends$K({}, pathProps, {
          className: 'rv-xy-plot__axis__tick__line',
          style: _extends$K({}, style, style.line)
        })), shouldRenderAsOwnNode ? React.cloneElement(labelNode, shouldAddProps ? _extends$K({}, textProps, {
          containerWidth: width,
          tickCount: values.length
        }) : undefined) : React.createElement('text', _extends$K({}, textProps, {
          className: 'rv-xy-plot__axis__tick__text',
          style: _extends$K({}, style, style.text)
        }), labelNode));
      });
      return React.createElement('g', {
        transform: 'translate(' + x + ', ' + y + ')',
        className: 'rv-xy-plot__axis__ticks'
      }, ticks);
    }
  }]);

  return AxisTicks;
}(React.Component);

AxisTicks.defaultProps = defaultProps$6;
AxisTicks.displayName = 'AxisTicks';
AxisTicks.propTypes = propTypes$8;
AxisTicks.requiresSVG = true;

var _extends$L = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _defineProperty$7(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
} // Assuming that 16px = 1em


var ADJUSTMENT_FOR_TEXT_SIZE = 16;
var MARGIN = 6;
var LEFT$2 = ORIENTATION.LEFT,
    RIGHT$2 = ORIENTATION.RIGHT,
    TOP$2 = ORIENTATION.TOP,
    BOTTOM$2 = ORIENTATION.BOTTOM;
var defaultProps$7 = {
  position: 'end'
};
/**
 * Compute transformations, keyed by orientation
 * @param {number} width - width of axis
 * @param {number} height - height of axis
 * @returns {Object} Object of transformations, keyed by orientation
 */

var transformation = function transformation(width, height) {
  var _ref;

  return _ref = {}, _defineProperty$7(_ref, LEFT$2, {
    end: {
      x: ADJUSTMENT_FOR_TEXT_SIZE,
      y: MARGIN,
      rotation: -90,
      textAnchor: 'end'
    },
    middle: {
      x: ADJUSTMENT_FOR_TEXT_SIZE,
      y: height / 2 - MARGIN,
      rotation: -90,
      textAnchor: 'middle'
    },
    start: {
      x: ADJUSTMENT_FOR_TEXT_SIZE,
      y: height - MARGIN,
      rotation: -90,
      textAnchor: 'start'
    }
  }), _defineProperty$7(_ref, RIGHT$2, {
    end: {
      x: ADJUSTMENT_FOR_TEXT_SIZE * -0.5,
      y: MARGIN,
      rotation: -90,
      textAnchor: 'end'
    },
    middle: {
      x: ADJUSTMENT_FOR_TEXT_SIZE * -0.5,
      y: height / 2 - MARGIN,
      rotation: -90,
      textAnchor: 'middle'
    },
    start: {
      x: ADJUSTMENT_FOR_TEXT_SIZE * -0.5,
      y: height - MARGIN,
      rotation: -90,
      textAnchor: 'start'
    }
  }), _defineProperty$7(_ref, TOP$2, {
    start: {
      x: MARGIN,
      y: ADJUSTMENT_FOR_TEXT_SIZE,
      rotation: 0,
      textAnchor: 'start'
    },
    middle: {
      x: width / 2 - MARGIN,
      y: ADJUSTMENT_FOR_TEXT_SIZE,
      rotation: 0,
      textAnchor: 'middle'
    },
    end: {
      x: width - MARGIN,
      y: ADJUSTMENT_FOR_TEXT_SIZE,
      rotation: 0,
      textAnchor: 'end'
    }
  }), _defineProperty$7(_ref, BOTTOM$2, {
    start: {
      x: MARGIN,
      y: -MARGIN,
      rotation: 0,
      textAnchor: 'start'
    },
    middle: {
      x: width / 2 - MARGIN,
      y: -MARGIN,
      rotation: 0,
      textAnchor: 'middle'
    },
    end: {
      x: width - MARGIN,
      y: -MARGIN,
      rotation: 0,
      textAnchor: 'end'
    }
  }), _ref;
};

var propTypes$9 = {
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  orientation: PropTypes.oneOf([LEFT$2, RIGHT$2, TOP$2, BOTTOM$2]).isRequired,
  style: PropTypes.object,
  title: PropTypes.string.isRequired
};

function AxisTitle(_ref2) {
  var orientation = _ref2.orientation,
      position = _ref2.position,
      width = _ref2.width,
      height = _ref2.height,
      style = _ref2.style,
      title = _ref2.title;
  var outerGroupTranslateX = orientation === LEFT$2 ? width : 0;
  var outerGroupTranslateY = orientation === TOP$2 ? height : 0;
  var outerGroupTransform = 'translate(' + outerGroupTranslateX + ', ' + outerGroupTranslateY + ')';
  var _transformation$orien = transformation(width, height)[orientation][position],
      x = _transformation$orien.x,
      y = _transformation$orien.y,
      rotation = _transformation$orien.rotation,
      textAnchor = _transformation$orien.textAnchor;
  var innerGroupTransform = 'translate(' + x + ', ' + y + ') rotate(' + rotation + ')';
  return React.createElement('g', {
    transform: outerGroupTransform,
    className: 'rv-xy-plot__axis__title'
  }, React.createElement('g', {
    style: _extends$L({
      textAnchor: textAnchor
    }, style),
    transform: innerGroupTransform
  }, React.createElement('text', {
    style: style
  }, title)));
}

AxisTitle.displayName = 'AxisTitle';
AxisTitle.propTypes = propTypes$9;
AxisTitle.defaultProps = defaultProps$7;

var _extends$M = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$D = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$D(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$D(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$D(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var defaultAnimatedProps = ['xRange', 'yRange', 'xDomain', 'yDomain', 'width', 'height', 'marginLeft', 'marginTop', 'marginRight', 'marginBottom', 'tickSize', 'tickTotal', 'tickSizeInner', 'tickSizeOuter'];
var LEFT$3 = ORIENTATION.LEFT,
    RIGHT$3 = ORIENTATION.RIGHT,
    TOP$3 = ORIENTATION.TOP,
    BOTTOM$3 = ORIENTATION.BOTTOM;
var propTypes$a = {
  orientation: PropTypes.oneOf([LEFT$3, RIGHT$3, TOP$3, BOTTOM$3]),
  attr: PropTypes.string.isRequired,
  attrAxis: PropTypes.string,
  width: PropTypes.number,
  height: PropTypes.number,
  top: PropTypes.number,
  left: PropTypes.number,
  title: PropTypes.string,
  style: PropTypes.object,
  className: PropTypes.string,
  hideTicks: PropTypes.bool,
  hideLine: PropTypes.bool,
  on0: PropTypes.bool,
  tickLabelAngle: PropTypes.number,
  tickSize: PropTypes.number,
  tickSizeInner: PropTypes.number,
  tickSizeOuter: PropTypes.number,
  tickPadding: PropTypes.number,
  tickValues: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.number, PropTypes.string])),
  tickFormat: PropTypes.func,
  tickTotal: PropTypes.number,
  // Not expected to be used by the users.
  // TODO: Add underscore to these properties later.
  marginTop: PropTypes.number,
  marginBottom: PropTypes.number,
  marginLeft: PropTypes.number,
  marginRight: PropTypes.number,
  innerWidth: PropTypes.number,
  innerHeight: PropTypes.number
};
var defaultProps$8 = {
  className: '',
  on0: false,
  style: {},
  tickSize: 6,
  tickPadding: 8,
  orientation: BOTTOM$3
};
var predefinedClassName$f = 'rv-xy-plot__axis';
var VERTICAL_CLASS_NAME = 'rv-xy-plot__axis--vertical';
var HORIZONTAL_CLASS_NAME = 'rv-xy-plot__axis--horizontal';

var Axis = function (_PureComponent) {
  _inherits$D(Axis, _PureComponent);

  function Axis() {
    _classCallCheck$D(this, Axis);

    return _possibleConstructorReturn$D(this, (Axis.__proto__ || Object.getPrototypeOf(Axis)).apply(this, arguments));
  }

  _createClass$D(Axis, [{
    key: '_getDefaultAxisProps',

    /**
     * Define the default values depending on the data passed from the outside.
     * @returns {*} Object of default properties.
     * @private
     */
    value: function _getDefaultAxisProps() {
      var _props = this.props,
          innerWidth = _props.innerWidth,
          innerHeight = _props.innerHeight,
          marginTop = _props.marginTop,
          marginBottom = _props.marginBottom,
          marginLeft = _props.marginLeft,
          marginRight = _props.marginRight,
          orientation = _props.orientation;

      if (orientation === BOTTOM$3) {
        return {
          tickTotal: getTicksTotalFromSize(innerWidth),
          top: innerHeight + marginTop,
          left: marginLeft,
          width: innerWidth,
          height: marginBottom
        };
      } else if (orientation === TOP$3) {
        return {
          tickTotal: getTicksTotalFromSize(innerWidth),
          top: 0,
          left: marginLeft,
          width: innerWidth,
          height: marginTop
        };
      } else if (orientation === LEFT$3) {
        return {
          tickTotal: getTicksTotalFromSize(innerHeight),
          top: marginTop,
          left: 0,
          width: marginLeft,
          height: innerHeight
        };
      }

      return {
        tickTotal: getTicksTotalFromSize(innerHeight),
        top: marginTop,
        left: marginLeft + innerWidth,
        width: marginRight,
        height: innerHeight
      };
    }
  }, {
    key: 'render',
    value: function render() {
      var animation = this.props.animation;

      if (animation) {
        var animatedProps = animation.nonAnimatedProps ? defaultAnimatedProps.filter(function (prop) {
          return animation.nonAnimatedProps.indexOf(prop) < 0;
        }) : defaultAnimatedProps;
        return React.createElement(Animation, _extends$M({}, this.props, {
          animatedProps: animatedProps
        }), React.createElement(Axis, _extends$M({}, this.props, {
          animation: null
        })));
      }

      var props = _extends$M({}, this._getDefaultAxisProps(), this.props);

      var attrAxis = props.attrAxis,
          className = props.className,
          height = props.height,
          hideLine = props.hideLine,
          hideTicks = props.hideTicks,
          left = props.left,
          marginTop = props.marginTop,
          on0 = props.on0,
          orientation = props.orientation,
          position = props.position,
          style = props.style,
          title = props.title,
          top = props.top,
          width = props.width;
      var isVertical = [LEFT$3, RIGHT$3].indexOf(orientation) > -1;
      var axisClassName = isVertical ? VERTICAL_CLASS_NAME : HORIZONTAL_CLASS_NAME;
      var leftPos = left;
      var topPos = top;

      if (on0) {
        var scale = getAttributeScale(props, attrAxis);

        if (isVertical) {
          leftPos = scale(0);
        } else {
          topPos = marginTop + scale(0);
        }
      }

      return React.createElement('g', {
        transform: 'translate(' + leftPos + ',' + topPos + ')',
        className: predefinedClassName$f + ' ' + axisClassName + ' ' + className,
        style: style
      }, !hideLine && React.createElement(AxisLine, {
        height: height,
        width: width,
        orientation: orientation,
        style: _extends$M({}, style, style.line)
      }), !hideTicks && React.createElement(AxisTicks, _extends$M({}, props, {
        style: _extends$M({}, style, style.ticks)
      })), title ? React.createElement(AxisTitle, {
        position: position,
        title: title,
        height: height,
        width: width,
        style: _extends$M({}, style, style.title),
        orientation: orientation
      }) : null);
    }
  }]);

  return Axis;
}(PureComponent);

Axis.displayName = 'Axis';
Axis.propTypes = propTypes$a;
Axis.defaultProps = defaultProps$8;
Axis.requiresSVG = true;

var _extends$N = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var TOP$4 = ORIENTATION.TOP,
    BOTTOM$4 = ORIENTATION.BOTTOM;

var propTypes$b = _extends$N({}, Axis.propTypes, {
  orientation: PropTypes.oneOf([TOP$4, BOTTOM$4])
});

var defaultProps$9 = {
  orientation: BOTTOM$4,
  attr: 'x',
  attrAxis: 'y'
};

function XAxis(props) {
  return React.createElement(Axis, props);
}

XAxis.displayName = 'XAxis';
XAxis.propTypes = propTypes$b;
XAxis.defaultProps = defaultProps$9;
XAxis.requiresSVG = true;

var _extends$O = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var LEFT$4 = ORIENTATION.LEFT,
    RIGHT$4 = ORIENTATION.RIGHT;

var propTypes$c = _extends$O({}, Axis.propTypes, {
  orientation: PropTypes.oneOf([LEFT$4, RIGHT$4])
});

var defaultProps$a = {
  orientation: LEFT$4,
  attr: 'y',
  attrAxis: 'x'
};

function YAxis(props) {
  return React.createElement(Axis, props);
}

YAxis.displayName = 'YAxis';
YAxis.propTypes = propTypes$c;
YAxis.defaultProps = defaultProps$a;
YAxis.requiresSVG = true; // Copyright (c) 2016 - 2017 Uber Technologies, Inc.

var propTypes$d = {
  className: PropTypes.string,
  height: PropTypes.number,
  endColor: PropTypes.string,
  endTitle: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  midColor: PropTypes.string,
  midTitle: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  startColor: PropTypes.string,
  startTitle: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  width: PropTypes.number
};
var defaultProps$b = {
  className: '',
  startColor: CONTINUOUS_COLOR_RANGE[0],
  endColor: CONTINUOUS_COLOR_RANGE[1]
};

function ContinuousColorLegend(_ref) {
  var startColor = _ref.startColor,
      midColor = _ref.midColor,
      endColor = _ref.endColor,
      startTitle = _ref.startTitle,
      midTitle = _ref.midTitle,
      endTitle = _ref.endTitle,
      height = _ref.height,
      width = _ref.width,
      className = _ref.className;
  var colors = [startColor];

  if (midColor) {
    colors.push(midColor);
  }

  colors.push(endColor);
  return React.createElement('div', {
    className: 'rv-continuous-color-legend ' + className,
    style: {
      width: width,
      height: height
    }
  }, React.createElement('div', {
    className: 'rv-gradient',
    style: {
      background: 'linear-gradient(to right, ' + colors.join(',') + ')'
    }
  }), React.createElement('div', {
    className: 'rv-legend-titles'
  }, React.createElement('span', {
    className: 'rv-legend-titles__left'
  }, startTitle), React.createElement('span', {
    className: 'rv-legend-titles__right'
  }, endTitle), midTitle ? React.createElement('span', {
    className: 'rv-legend-titles__center'
  }, midTitle) : null));
}

ContinuousColorLegend.displayName = 'ContinuousColorLegend';
ContinuousColorLegend.propTypes = propTypes$d;
ContinuousColorLegend.defaultProps = defaultProps$b; // Copyright (c) 2016 - 2017 Uber Technologies, Inc.

var propTypes$e = {
  className: PropTypes.string,
  circlesTotal: PropTypes.number,
  endSize: PropTypes.number,
  endTitle: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  height: PropTypes.number,
  startSize: PropTypes.number,
  startTitle: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  width: PropTypes.number
};
var defaultProps$c = {
  circlesTotal: 10,
  className: '',
  endSize: 20,
  startSize: 2
};

function ContinuousSizeLegend(_ref) {
  var startTitle = _ref.startTitle,
      endTitle = _ref.endTitle,
      startSize = _ref.startSize,
      endSize = _ref.endSize,
      circlesTotal = _ref.circlesTotal,
      height = _ref.height,
      width = _ref.width,
      className = _ref.className;
  var circles = [];
  var step = (endSize - startSize) / (circlesTotal - 1);

  for (var i = 0; i < circlesTotal; i++) {
    var size = step * i + startSize;
    circles.push(React.createElement('div', {
      key: i,
      className: 'rv-bubble',
      style: {
        width: size,
        height: size,
        borderRadius: size / 2
      }
    })); // Add the separator in order to justify the content (otherwise the tags
    // will be stacked together without any margins around).

    circles.push(' ');
  }

  return React.createElement('div', {
    className: 'rv-continuous-size-legend ' + className,
    style: {
      width: width,
      height: height
    }
  }, React.createElement('div', {
    className: 'rv-bubbles',
    style: {
      height: endSize
    }
  }, circles, React.createElement('div', {
    className: 'rv-spacer'
  })), React.createElement('div', {
    className: 'rv-legend-titles'
  }, React.createElement('span', {
    className: 'rv-legend-titles__left'
  }, startTitle), React.createElement('span', {
    className: 'rv-legend-titles__right'
  }, endTitle)));
}

ContinuousSizeLegend.displayName = 'ContinuousSizeLegend';
ContinuousSizeLegend.propTypes = propTypes$e;
ContinuousSizeLegend.defaultProps = defaultProps$c;

var _extends$P = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var STROKE_STYLES$1 = {
  dashed: '6, 2',
  solid: null
};

function DiscreteColorLegendItem(_ref) {
  var color = _ref.color,
      strokeDasharray = _ref.strokeDasharray,
      strokeStyle = _ref.strokeStyle,
      strokeWidth = _ref.strokeWidth,
      disabled = _ref.disabled,
      onClick = _ref.onClick,
      orientation = _ref.orientation,
      onMouseEnter = _ref.onMouseEnter,
      onMouseLeave = _ref.onMouseLeave,
      title = _ref.title;
  var className = 'rv-discrete-color-legend-item ' + orientation;

  if (disabled) {
    className += ' disabled';
  }

  if (onClick) {
    className += ' clickable';
  }

  var strokeDasharrayStyle = STROKE_STYLES$1[strokeStyle] || strokeDasharray;
  return React.createElement('div', {
    className: className,
    onClick: onClick,
    onMouseEnter: onMouseEnter,
    onMouseLeave: onMouseLeave
  }, React.createElement('svg', {
    className: 'rv-discrete-color-legend-item__color',
    height: 2,
    width: 14
  }, React.createElement('path', {
    className: 'rv-discrete-color-legend-item__color__path',
    d: 'M 0, 1 L 14, 1',
    style: _extends$P({}, strokeWidth ? {
      strokeWidth: strokeWidth
    } : {}, strokeDasharrayStyle ? {
      strokeDasharray: strokeDasharrayStyle
    } : {}, {
      stroke: disabled ? null : color
    })
  })), React.createElement('span', {
    className: 'rv-discrete-color-legend-item__title'
  }, title));
}

DiscreteColorLegendItem.propTypes = {
  color: PropTypes.string.isRequired,
  disabled: PropTypes.bool,
  title: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
  onClick: PropTypes.func,
  onMouseEnter: PropTypes.func,
  onMouseLeave: PropTypes.func,
  orientation: PropTypes.oneOf(['vertical', 'horizontal']).isRequired,
  strokeDasharray: PropTypes.string,
  strokeWidth: PropTypes.number,
  strokeStyle: PropTypes.oneOf(Object.keys(STROKE_STYLES$1))
};
DiscreteColorLegendItem.defaultProps = {
  disabled: false,
  strokeStyle: 'solid'
};
DiscreteColorLegendItem.displayName = 'DiscreteColorLegendItem';

var _extends$Q = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function DiscreteColorLegend(_ref) {
  var className = _ref.className,
      colors = _ref.colors,
      height = _ref.height,
      items = _ref.items,
      onItemClick = _ref.onItemClick,
      onItemMouseEnter = _ref.onItemMouseEnter,
      onItemMouseLeave = _ref.onItemMouseLeave,
      orientation = _ref.orientation,
      style = _ref.style,
      width = _ref.width;
  return React.createElement('div', {
    className: 'rv-discrete-color-legend ' + orientation + ' ' + className,
    style: _extends$Q({
      width: width,
      height: height
    }, style)
  }, items.map(function (item, i) {
    return React.createElement(DiscreteColorLegendItem, {
      title: item.title ? item.title : item,
      color: item.color ? item.color : colors[i % colors.length],
      strokeDasharray: item.strokeDasharray,
      strokeStyle: item.strokeStyle,
      strokeWidth: item.strokeWidth,
      disabled: Boolean(item.disabled),
      orientation: orientation,
      key: i,
      onClick: onItemClick ? function (e) {
        return onItemClick(item, i, e);
      } : null,
      onMouseEnter: onItemMouseEnter ? function (e) {
        return onItemMouseEnter(item, i, e);
      } : null,
      onMouseLeave: onItemMouseEnter ? function (e) {
        return onItemMouseLeave(item, i, e);
      } : null
    });
  }));
}

DiscreteColorLegend.displayName = 'DiscreteColorLegendItem';
DiscreteColorLegend.propTypes = {
  className: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.oneOfType([PropTypes.shape({
    title: PropTypes.oneOfType([PropTypes.string, PropTypes.element]).isRequired,
    color: PropTypes.string,
    disabled: PropTypes.bool
  }), PropTypes.string.isRequired, PropTypes.element])).isRequired,
  onItemClick: PropTypes.func,
  onItemMouseEnter: PropTypes.func,
  onItemMouseLeave: PropTypes.func,
  height: PropTypes.number,
  width: PropTypes.number,
  orientation: PropTypes.oneOf(['vertical', 'horizontal'])
};
DiscreteColorLegend.defaultProps = {
  className: '',
  colors: DISCRETE_COLOR_RANGE,
  orientation: 'vertical'
};

var _extends$R = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var propTypes$f = _extends$R({}, DiscreteColorLegend.propTypes, {
  searchText: PropTypes.string,
  onSearchChange: PropTypes.func,
  searchPlaceholder: PropTypes.string,
  searchFn: PropTypes.func
});

var defaultProps$d = {
  className: '',
  searchText: '',
  searchFn: function searchFn(items, s) {
    return items.filter(function (item) {
      return String(item.title || item).toLowerCase().indexOf(s) !== -1;
    });
  }
};

function SearchableDiscreteColorLegend(props) {
  var className = props.className,
      colors = props.colors,
      height = props.height,
      items = props.items,
      onItemClick = props.onItemClick,
      onSearchChange = props.onSearchChange,
      orientation = props.orientation,
      searchFn = props.searchFn,
      searchPlaceholder = props.searchPlaceholder,
      searchText = props.searchText,
      width = props.width;
  var onChange = onSearchChange ? function (_ref) {
    var value = _ref.target.value;
    return onSearchChange(value);
  } : null;
  var filteredItems = searchFn(items, searchText);
  return React.createElement('div', {
    className: 'rv-search-wrapper ' + className,
    style: {
      width: width,
      height: height
    }
  }, React.createElement('form', {
    className: 'rv-search-wrapper__form'
  }, React.createElement('input', {
    type: 'search',
    placeholder: searchPlaceholder,
    className: 'rv-search-wrapper__form__input',
    value: searchText,
    onChange: onChange
  })), React.createElement('div', {
    className: 'rv-search-wrapper__contents'
  }, React.createElement(DiscreteColorLegend, {
    colors: colors,
    items: filteredItems,
    onItemClick: onItemClick,
    orientation: orientation
  })));
}

SearchableDiscreteColorLegend.propTypes = propTypes$f;
SearchableDiscreteColorLegend.defaultProps = defaultProps$d;
SearchableDiscreteColorLegend.displayName = 'SearchableDiscreteColorLegend';

var _createClass$E = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$S = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _defineProperty$8(obj, key, value) {
  if (key in obj) {
    Object.defineProperty(obj, key, {
      value: value,
      enumerable: true,
      configurable: true,
      writable: true
    });
  } else {
    obj[key] = value;
  }

  return obj;
}

function _classCallCheck$E(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$E(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$E(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var predefinedClassName$g = 'rv-parallel-coordinates-chart';
var DEFAULT_FORMAT$1 = format('.2r');
/**
 * Generate axes for each of the domains
 * @param {Object} props
 - props.animation {Boolean}
 - props.domains {Array} array of object specifying the way each axis is to be plotted
 - props.style {object} style object for the whole chart
 - props.tickFormat {Function} formatting function for axes
 * @return {Array} the plotted axis components
 */

function getAxes(props) {
  var animation = props.animation,
      domains = props.domains,
      style = props.style,
      tickFormat = props.tickFormat;
  return domains.map(function (domain, index) {
    var sortedDomain = domain.domain;

    var domainTickFormat = function domainTickFormat(t) {
      return domain.tickFormat ? domain.tickFormat(t) : tickFormat(t);
    };

    return React.createElement(DecorativeAxis, {
      animation: animation,
      key: index + '-axis',
      axisStart: {
        x: domain.name,
        y: 0
      },
      axisEnd: {
        x: domain.name,
        y: 1
      },
      axisDomain: sortedDomain,
      numberOfTicks: 5,
      tickValue: domainTickFormat,
      style: style.axes
    });
  });
}
/**
 * Generate labels for the ends of the axes
 * @param {Object} props
 - props.domains {Array} array of object specifying the way each axis is to be plotted
 - props.style {object} style object for just the labels
 * @return {Array} the prepped data for the labelSeries
 */


function getLabels(props) {
  var domains = props.domains,
      style = props.style;
  return domains.map(function (domain, index) {
    return {
      x: domain.name,
      y: 1.1,
      label: domain.name,
      style: style
    };
  });
}
/**
 * Generate the actual lines to be plotted
 * @param {Object} props
 - props.animation {Boolean}
 - props.data {Array} array of object specifying what values are to be plotted
 - props.domains {Array} array of object specifying the way each axis is to be plotted
 - props.style {object} style object for the whole chart
 - props.showMarks {Bool} whether or not to use the line mark series
 * @return {Array} the plotted axis components
 */


function getLines(props) {
  var animation = props.animation,
      brushFilters = props.brushFilters,
      colorRange = props.colorRange,
      domains = props.domains,
      data = props.data,
      style = props.style,
      showMarks = props.showMarks;
  var scales = domains.reduce(function (acc, _ref) {
    var domain = _ref.domain,
        name = _ref.name;
    acc[name] = scaleLinear().domain(domain).range([0, 1]);
    return acc;
  }, {}); // const

  return data.map(function (row, rowIndex) {
    var withinFilteredRange = true;
    var mappedData = domains.map(function (domain, index) {
      var getValue = domain.getValue,
          name = domain.name; // watch out! Gotcha afoot
      // yVal after being scale is in [0, 1] range

      var yVal = scales[name](getValue ? getValue(row) : row[name]);
      var filter = brushFilters[name]; // filter value after being scale back from pixel space is also in [0, 1]

      if (filter && (yVal < filter.min || yVal > filter.max)) {
        withinFilteredRange = false;
      }

      return {
        x: name,
        y: yVal
      };
    });
    var selectedName = predefinedClassName$g + '-line';
    var unselectedName = selectedName + ' ' + predefinedClassName$g + '-line-unselected';
    var lineProps = {
      animation: animation,
      className: withinFilteredRange ? selectedName : unselectedName,
      key: rowIndex + '-polygon',
      data: mappedData,
      color: row.color || colorRange[rowIndex % colorRange.length],
      style: _extends$S({}, style.lines, row.style || {})
    };

    if (!withinFilteredRange) {
      lineProps.style = _extends$S({}, lineProps.style, style.deselectedLineStyle);
    }

    return showMarks ? React.createElement(LineMarkSeries, lineProps) : React.createElement(LineSeries, lineProps);
  });
}

var ParallelCoordinates = function (_Component) {
  _inherits$E(ParallelCoordinates, _Component);

  function ParallelCoordinates() {
    var _ref2;

    var _temp, _this, _ret;

    _classCallCheck$E(this, ParallelCoordinates);

    for (var _len = arguments.length, args = Array(_len), _key = 0; _key < _len; _key++) {
      args[_key] = arguments[_key];
    }

    return _ret = (_temp = (_this = _possibleConstructorReturn$E(this, (_ref2 = ParallelCoordinates.__proto__ || Object.getPrototypeOf(ParallelCoordinates)).call.apply(_ref2, [this].concat(args))), _this), _this.state = {
      brushFilters: {}
    }, _temp), _possibleConstructorReturn$E(_this, _ret);
  }

  _createClass$E(ParallelCoordinates, [{
    key: 'render',
    value: function render() {
      var _this2 = this;

      var brushFilters = this.state.brushFilters;
      var _props = this.props,
          animation = _props.animation,
          brushing = _props.brushing,
          className = _props.className,
          children = _props.children,
          colorRange = _props.colorRange,
          data = _props.data,
          domains = _props.domains,
          height = _props.height,
          hideInnerMostValues = _props.hideInnerMostValues,
          margin = _props.margin,
          onMouseLeave = _props.onMouseLeave,
          onMouseEnter = _props.onMouseEnter,
          showMarks = _props.showMarks,
          style = _props.style,
          tickFormat = _props.tickFormat,
          width = _props.width;
      var axes = getAxes({
        domains: domains,
        animation: animation,
        hideInnerMostValues: hideInnerMostValues,
        style: style,
        tickFormat: tickFormat
      });
      var lines = getLines({
        animation: animation,
        brushFilters: brushFilters,
        colorRange: colorRange,
        domains: domains,
        data: data,
        showMarks: showMarks,
        style: style
      });
      var labelSeries = React.createElement(LabelSeries, {
        animation: true,
        key: className,
        className: predefinedClassName$g + '-label',
        data: getLabels({
          domains: domains,
          style: style.labels
        })
      });

      var _getInnerDimensions = getInnerDimensions(this.props, DEFAULT_MARGINS),
          marginLeft = _getInnerDimensions.marginLeft,
          marginRight = _getInnerDimensions.marginRight;

      return React.createElement(XYPlot, {
        height: height,
        width: width,
        margin: margin,
        dontCheckIfEmpty: true,
        className: className + ' ' + predefinedClassName$g,
        onMouseLeave: onMouseLeave,
        onMouseEnter: onMouseEnter,
        xType: 'ordinal',
        yDomain: [0, 1]
      }, children, axes.concat(lines).concat(labelSeries), brushing && domains.map(function (d) {
        var trigger = function trigger(row) {
          _this2.setState({
            brushFilters: _extends$S({}, brushFilters, _defineProperty$8({}, d.name, row ? {
              min: row.bottom,
              max: row.top
            } : null))
          });
        };

        return React.createElement(Highlight, {
          key: d.name,
          drag: true,
          highlightX: d.name,
          onBrushEnd: trigger,
          onDragEnd: trigger,
          highlightWidth: (width - marginLeft - marginRight) / domains.length,
          enableX: false
        });
      }));
    }
  }]);

  return ParallelCoordinates;
}(Component);

ParallelCoordinates.displayName = 'ParallelCoordinates';
ParallelCoordinates.propTypes = {
  animation: AnimationPropType,
  brushing: PropTypes.bool,
  className: PropTypes.string,
  colorType: PropTypes.string,
  colorRange: PropTypes.arrayOf(PropTypes.string),
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  domains: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    domain: PropTypes.arrayOf(PropTypes.number).isRequired,
    tickFormat: PropTypes.func
  })).isRequired,
  height: PropTypes.number.isRequired,
  margin: MarginPropType,
  style: PropTypes.shape({
    axes: PropTypes.object,
    labels: PropTypes.object,
    lines: PropTypes.object
  }),
  showMarks: PropTypes.bool,
  tickFormat: PropTypes.func,
  width: PropTypes.number.isRequired
};
ParallelCoordinates.defaultProps = {
  className: '',
  colorType: 'category',
  colorRange: DISCRETE_COLOR_RANGE,
  style: {
    axes: {
      line: {},
      ticks: {},
      text: {}
    },
    labels: {
      fontSize: 10,
      textAnchor: 'middle'
    },
    lines: {
      strokeWidth: 1,
      strokeOpacity: 1
    },
    deselectedLineStyle: {
      strokeOpacity: 0.1
    }
  },
  tickFormat: DEFAULT_FORMAT$1
};

var _extends$T = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var predefinedClassName$h = 'rv-radar-chart';
var DEFAULT_FORMAT$2 = format('.2r');
/**
 * Generate axes for each of the domains
 * @param {Object} props
 - props.animation {Boolean}
 - props.domains {Array} array of object specifying the way each axis is to be plotted
 - props.style {object} style object for the whole chart
 - props.tickFormat {Function} formatting function for axes
 - props.startingAngle {number} the initial angle offset
 * @return {Array} the plotted axis components
 */

function getAxes$1(props) {
  var animation = props.animation,
      domains = props.domains,
      startingAngle = props.startingAngle,
      style = props.style,
      tickFormat = props.tickFormat,
      hideInnerMostValues = props.hideInnerMostValues;
  return domains.map(function (domain, index) {
    var angle = index / domains.length * Math.PI * 2 + startingAngle;
    var sortedDomain = domain.domain;

    var domainTickFormat = function domainTickFormat(t) {
      if (hideInnerMostValues && t === sortedDomain[0]) {
        return '';
      }

      return domain.tickFormat ? domain.tickFormat(t) : tickFormat(t);
    };

    return React.createElement(DecorativeAxis, {
      animation: animation,
      key: index + '-axis',
      axisStart: {
        x: 0,
        y: 0
      },
      axisEnd: {
        x: getCoordinate(Math.cos(angle)),
        y: getCoordinate(Math.sin(angle))
      },
      axisDomain: sortedDomain,
      numberOfTicks: 5,
      tickValue: domainTickFormat,
      style: style.axes
    });
  });
}
/**
 * Generate x or y coordinate for axisEnd
 * @param {Number} axisEndPoint
 - epsilon is an arbitrarily chosen small number to approximate axisEndPoints
 - to true values resulting from trigonometry functions (sin, cos) on angles
 * @return {Number} the x or y coordinate accounting for exact trig values
 */


function getCoordinate(axisEndPoint) {
  var epsilon = 10e-13;

  if (Math.abs(axisEndPoint) <= epsilon) {
    axisEndPoint = 0;
  } else if (axisEndPoint > 0) {
    if (Math.abs(axisEndPoint - 0.5) <= epsilon) {
      axisEndPoint = 0.5;
    }
  } else if (axisEndPoint < 0) {
    if (Math.abs(axisEndPoint + 0.5) <= epsilon) {
      axisEndPoint = -0.5;
    }
  }

  return axisEndPoint;
}
/**
 * Generate labels for the ends of the axes
 * @param {Object} props
 - props.domains {Array} array of object specifying the way each axis is to be plotted
  - props.startingAngle {number} the initial angle offset
 - props.style {object} style object for just the labels
 * @return {Array} the prepped data for the labelSeries
 */


function getLabels$1(props) {
  var domains = props.domains,
      startingAngle = props.startingAngle,
      style = props.style;
  return domains.map(function (_ref, index) {
    var name = _ref.name;
    var angle = index / domains.length * Math.PI * 2 + startingAngle;
    var radius = 1.2;
    return {
      x: radius * Math.cos(angle),
      y: radius * Math.sin(angle),
      label: name,
      style: style
    };
  });
}
/**
 * Generate the actual polygons to be plotted
 * @param {Object} props
 - props.animation {Boolean}
 - props.data {Array} array of object specifying what values are to be plotted
 - props.domains {Array} array of object specifying the way each axis is to be plotted
 - props.startingAngle {number} the initial angle offset
 - props.style {object} style object for the whole chart
 * @return {Array} the plotted axis components
 */


function getPolygons(props) {
  var animation = props.animation,
      colorRange = props.colorRange,
      domains = props.domains,
      data = props.data,
      style = props.style,
      startingAngle = props.startingAngle,
      onSeriesMouseOver = props.onSeriesMouseOver,
      onSeriesMouseOut = props.onSeriesMouseOut;
  var scales = domains.reduce(function (acc, _ref2) {
    var domain = _ref2.domain,
        name = _ref2.name;
    acc[name] = scaleLinear().domain(domain).range([0, 1]);
    return acc;
  }, {});
  return data.map(function (row, rowIndex) {
    var mappedData = domains.map(function (_ref3, index) {
      var name = _ref3.name,
          getValue = _ref3.getValue;
      var dataPoint = getValue ? getValue(row) : row[name]; // error handling if point doesn't exist

      var angle = index / domains.length * Math.PI * 2 + startingAngle; // dont let the radius become negative

      var radius = Math.max(scales[name](dataPoint), 0);
      return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        name: row.name
      };
    });
    return React.createElement(PolygonSeries, {
      animation: animation,
      className: predefinedClassName$h + '-polygon',
      key: rowIndex + '-polygon',
      data: mappedData,
      style: _extends$T({
        stroke: row.color || row.stroke || colorRange[rowIndex % colorRange.length],
        fill: row.color || row.fill || colorRange[rowIndex % colorRange.length]
      }, style.polygons),
      onSeriesMouseOver: onSeriesMouseOver,
      onSeriesMouseOut: onSeriesMouseOut
    });
  });
}
/**
 * Generate circles at the polygon points for Hover functionality
 * @param {Object} props
 - props.animation {Boolean}
 - props.data {Array} array of object specifying what values are to be plotted
 - props.domains {Array} array of object specifying the way each axis is to be plotted
 - props.startingAngle {number} the initial angle offset
 - props.style {object} style object for the whole chart
 - props.onValueMouseOver {function} function to call on mouse over a polygon point
 - props.onValueMouseOver {function} function to call when mouse leaves a polygon point
 * @return {Array} the plotted axis components
 */


function getPolygonPoints(props) {
  var animation = props.animation,
      domains = props.domains,
      data = props.data,
      startingAngle = props.startingAngle,
      style = props.style,
      onValueMouseOver = props.onValueMouseOver,
      onValueMouseOut = props.onValueMouseOut;

  if (!onValueMouseOver) {
    return;
  }

  var scales = domains.reduce(function (acc, _ref4) {
    var domain = _ref4.domain,
        name = _ref4.name;
    acc[name] = scaleLinear().domain(domain).range([0, 1]);
    return acc;
  }, {});
  return data.map(function (row, rowIndex) {
    var mappedData = domains.map(function (_ref5, index) {
      var name = _ref5.name,
          getValue = _ref5.getValue;
      var dataPoint = getValue ? getValue(row) : row[name]; // error handling if point doesn't exist

      var angle = index / domains.length * Math.PI * 2 + startingAngle; // dont let the radius become negative

      var radius = Math.max(scales[name](dataPoint), 0);
      return {
        x: radius * Math.cos(angle),
        y: radius * Math.sin(angle),
        domain: name,
        value: dataPoint,
        dataName: row.name
      };
    });
    return React.createElement(MarkSeries, {
      animation: animation,
      className: predefinedClassName$h + '-polygonPoint',
      key: rowIndex + '-polygonPoint',
      data: mappedData,
      size: 10,
      style: _extends$T({}, style.polygons, {
        fill: 'transparent',
        stroke: 'transparent'
      }),
      onValueMouseOver: onValueMouseOver,
      onValueMouseOut: onValueMouseOut
    });
  });
}

function RadarChart(props) {
  var animation = props.animation,
      className = props.className,
      children = props.children,
      colorRange = props.colorRange,
      data = props.data,
      domains = props.domains,
      height = props.height,
      hideInnerMostValues = props.hideInnerMostValues,
      margin = props.margin,
      onMouseLeave = props.onMouseLeave,
      onMouseEnter = props.onMouseEnter,
      startingAngle = props.startingAngle,
      style = props.style,
      tickFormat = props.tickFormat,
      width = props.width,
      renderAxesOverPolygons = props.renderAxesOverPolygons,
      onValueMouseOver = props.onValueMouseOver,
      onValueMouseOut = props.onValueMouseOut,
      onSeriesMouseOver = props.onSeriesMouseOver,
      onSeriesMouseOut = props.onSeriesMouseOut;
  var axes = getAxes$1({
    domains: domains,
    animation: animation,
    hideInnerMostValues: hideInnerMostValues,
    startingAngle: startingAngle,
    style: style,
    tickFormat: tickFormat
  });
  var polygons = getPolygons({
    animation: animation,
    colorRange: colorRange,
    domains: domains,
    data: data,
    startingAngle: startingAngle,
    style: style,
    onSeriesMouseOver: onSeriesMouseOver,
    onSeriesMouseOut: onSeriesMouseOut
  });
  var polygonPoints = getPolygonPoints({
    animation: animation,
    colorRange: colorRange,
    domains: domains,
    data: data,
    startingAngle: startingAngle,
    style: style,
    onValueMouseOver: onValueMouseOver,
    onValueMouseOut: onValueMouseOut
  });
  var labelSeries = React.createElement(LabelSeries, {
    animation: animation,
    key: className,
    className: predefinedClassName$h + '-label',
    data: getLabels$1({
      domains: domains,
      style: style.labels,
      startingAngle: startingAngle
    })
  });
  return React.createElement(XYPlot, {
    height: height,
    width: width,
    margin: margin,
    dontCheckIfEmpty: true,
    className: className + ' ' + predefinedClassName$h,
    onMouseLeave: onMouseLeave,
    onMouseEnter: onMouseEnter,
    xDomain: [-1, 1],
    yDomain: [-1, 1]
  }, children, !renderAxesOverPolygons && axes.concat(polygons).concat(labelSeries).concat(polygonPoints), renderAxesOverPolygons && polygons.concat(labelSeries).concat(axes).concat(polygonPoints));
}

RadarChart.displayName = 'RadarChart';
RadarChart.propTypes = {
  animation: AnimationPropType,
  className: PropTypes.string,
  colorType: PropTypes.string,
  colorRange: PropTypes.arrayOf(PropTypes.string),
  data: PropTypes.arrayOf(PropTypes.object).isRequired,
  domains: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    domain: PropTypes.arrayOf(PropTypes.number).isRequired,
    tickFormat: PropTypes.func
  })).isRequired,
  height: PropTypes.number.isRequired,
  hideInnerMostValues: PropTypes.bool,
  margin: MarginPropType,
  startingAngle: PropTypes.number,
  style: PropTypes.shape({
    axes: PropTypes.object,
    labels: PropTypes.object,
    polygons: PropTypes.object
  }),
  tickFormat: PropTypes.func,
  width: PropTypes.number.isRequired,
  renderAxesOverPolygons: PropTypes.bool,
  onValueMouseOver: PropTypes.func,
  onValueMouseOut: PropTypes.func,
  onSeriesMouseOver: PropTypes.func,
  onSeriesMouseOut: PropTypes.func
};
RadarChart.defaultProps = {
  className: '',
  colorType: 'category',
  colorRange: DISCRETE_COLOR_RANGE,
  hideInnerMostValues: true,
  startingAngle: Math.PI / 2,
  style: {
    axes: {
      line: {},
      ticks: {},
      text: {}
    },
    labels: {
      fontSize: 10,
      textAnchor: 'middle'
    },
    polygons: {
      strokeWidth: 0.5,
      strokeOpacity: 1,
      fillOpacity: 0.1
    }
  },
  tickFormat: DEFAULT_FORMAT$2,
  renderAxesOverPolygons: false
};

var _extends$U = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var predefinedClassName$i = 'rv-radial-chart';
var DEFAULT_RADIUS_MARGIN = 15;
/**
 * Create the list of wedges to render.
 * @param {Object} props
   props.data {Object} - tree structured data (each node has a name anc an array of children)
 * @returns {Array} Array of nodes.
 */

function getWedgesToRender(_ref) {
  var data = _ref.data,
      getAngle = _ref.getAngle;
  var pie$1 = pie().sort(null).value(getAngle);
  var pieData = pie$1(data).reverse();
  return pieData.map(function (row, index) {
    return _extends$U({}, row.data, {
      angle0: row.startAngle,
      angle: row.endAngle,
      radius0: row.data.innerRadius || 0,
      radius: row.data.radius || 1,
      color: row.data.color || index
    });
  });
}

function generateLabels(mappedData, accessors) {
  var labelsRadiusMultiplier = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 1.1;
  var getLabel = accessors.getLabel,
      getSubLabel = accessors.getSubLabel;
  return mappedData.reduce(function (res, row) {
    var angle = row.angle,
        angle0 = row.angle0,
        radius = row.radius;
    var centeredAngle = (angle + angle0) / 2; // unfortunate, but true fact: d3 starts its radians at 12 oclock rather than 3
    // and move clockwise rather than counter clockwise. why why why!

    var updatedAngle = -1 * centeredAngle + Math.PI / 2;
    var newLabels = [];

    if (getLabel(row)) {
      newLabels.push({
        angle: updatedAngle,
        radius: radius * labelsRadiusMultiplier,
        label: getLabel(row)
      });
    }

    if (getSubLabel(row)) {
      newLabels.push({
        angle: updatedAngle,
        radius: radius * labelsRadiusMultiplier,
        label: getSubLabel(row),
        style: {
          fontSize: 10
        },
        yOffset: 12
      });
    }

    return res.concat(newLabels);
  }, []); // could add force direction here to make sure the labels dont overlap
}
/**
 * Get the max radius so the chart can extend to the margin.
 * @param  {Number} width - container width
 * @param  {Number} height - container height
 * @return {Number} radius
 */


function getMaxRadius(width, height) {
  return Math.min(width, height) / 2 - DEFAULT_RADIUS_MARGIN;
}

function RadialChart(props) {
  var animation = props.animation,
      className = props.className,
      children = props.children,
      colorType = props.colorType,
      data = props.data,
      getAngle = props.getAngle,
      getLabel = props.getLabel,
      getSubLabel = props.getSubLabel,
      height = props.height,
      hideRootNode = props.hideRootNode,
      innerRadius = props.innerRadius,
      labelsAboveChildren = props.labelsAboveChildren,
      labelsRadiusMultiplier = props.labelsRadiusMultiplier,
      labelsStyle = props.labelsStyle,
      margin = props.margin,
      onMouseLeave = props.onMouseLeave,
      onMouseEnter = props.onMouseEnter,
      radius = props.radius,
      showLabels = props.showLabels,
      style = props.style,
      width = props.width;
  var mappedData = getWedgesToRender({
    data: data,
    height: height,
    hideRootNode: hideRootNode,
    width: width,
    getAngle: getAngle
  });
  var radialDomain = getRadialDomain(mappedData);

  var arcProps = _extends$U({
    colorType: colorType
  }, props, {
    animation: animation,
    radiusDomain: [0, radialDomain],
    data: mappedData,
    radiusNoFallBack: true,
    style: style,
    arcClassName: 'rv-radial-chart__series--pie__slice'
  });

  if (radius) {
    arcProps.radiusDomain = [0, 1];
    arcProps.radiusRange = [innerRadius || 0, radius];
    arcProps.radiusType = 'linear';
  }

  var maxRadius = radius ? radius : getMaxRadius(width, height);
  var defaultMargin = getRadialLayoutMargin(width, height, maxRadius);
  var labels = generateLabels(mappedData, {
    getLabel: getLabel,
    getSubLabel: getSubLabel
  }, labelsRadiusMultiplier);
  return React.createElement(XYPlot, {
    height: height,
    width: width,
    margin: _extends$U({}, margin, defaultMargin),
    className: className + ' ' + predefinedClassName$i,
    onMouseLeave: onMouseLeave,
    onMouseEnter: onMouseEnter,
    xDomain: [-radialDomain, radialDomain],
    yDomain: [-radialDomain, radialDomain]
  }, React.createElement(ArcSeries, _extends$U({}, arcProps, {
    getAngle: function getAngle(d) {
      return d.angle;
    }
  })), showLabels && !labelsAboveChildren && React.createElement(LabelSeries, {
    data: labels,
    style: labelsStyle
  }), children, showLabels && labelsAboveChildren && React.createElement(LabelSeries, {
    data: labels,
    style: labelsStyle
  }));
}

RadialChart.displayName = 'RadialChart';
RadialChart.propTypes = {
  animation: AnimationPropType,
  className: PropTypes.string,
  colorType: PropTypes.string,
  data: PropTypes.arrayOf(PropTypes.shape({
    angle: PropTypes.number,
    className: PropTypes.string,
    label: PropTypes.string,
    radius: PropTypes.number,
    style: PropTypes.object
  })).isRequired,
  getAngle: PropTypes.func,
  getAngle0: PropTypes.func,
  padAngle: PropTypes.oneOfType([PropTypes.func, PropTypes.number]),
  getRadius: PropTypes.func,
  getRadius0: PropTypes.func,
  getLabel: PropTypes.func,
  height: PropTypes.number.isRequired,
  labelsAboveChildren: PropTypes.bool,
  labelsStyle: PropTypes.object,
  margin: MarginPropType,
  onValueClick: PropTypes.func,
  onValueMouseOver: PropTypes.func,
  onValueMouseOut: PropTypes.func,
  showLabels: PropTypes.bool,
  style: PropTypes.object,
  subLabel: PropTypes.func,
  width: PropTypes.number.isRequired
};
RadialChart.defaultProps = {
  className: '',
  colorType: 'category',
  colorRange: DISCRETE_COLOR_RANGE,
  padAngle: 0,
  getAngle: function getAngle(d) {
    return d.angle;
  },
  getAngle0: function getAngle0(d) {
    return d.angle0;
  },
  getRadius: function getRadius(d) {
    return d.radius;
  },
  getRadius0: function getRadius0(d) {
    return d.radius0;
  },
  getLabel: function getLabel(d) {
    return d.label;
  },
  getSubLabel: function getSubLabel(d) {
    return d.subLabel;
  }
};

var _extends$V = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var DEFAULT_LINK_COLOR = DISCRETE_COLOR_RANGE[1];
var DEFAULT_LINK_OPACITY = 0.7;

function SankeyLink(props) {
  var animation = props.animation,
      data = props.data,
      node = props.node,
      opacity = props.opacity,
      color = props.color,
      strokeWidth = props.strokeWidth,
      style = props.style,
      onLinkClick = props.onLinkClick,
      onLinkMouseOver = props.onLinkMouseOver,
      onLinkMouseOut = props.onLinkMouseOut;

  if (animation) {
    return React.createElement(Animation, _extends$V({}, props, {
      animatedProps: ANIMATED_SERIES_PROPS
    }), React.createElement(SankeyLink, _extends$V({}, props, {
      animation: null
    })));
  }

  return React.createElement('path', _extends$V({
    d: data
  }, style, {
    className: 'rv-sankey__link',
    opacity: Number.isFinite(opacity) ? opacity : DEFAULT_LINK_OPACITY,
    stroke: color || DEFAULT_LINK_COLOR,
    onClick: function onClick(e) {
      return onLinkClick(node, e);
    },
    onMouseOver: function onMouseOver(e) {
      return onLinkMouseOver(node, e);
    },
    onMouseOut: function onMouseOut(e) {
      return onLinkMouseOut(node, e);
    },
    strokeWidth: strokeWidth,
    fill: 'none'
  }));
}

SankeyLink.displayName = 'SankeyLink';
SankeyLink.requiresSVG = true;

var _extends$W = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _toConsumableArray$4(arr) {
  if (Array.isArray(arr)) {
    for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) {
      arr2[i] = arr[i];
    }

    return arr2;
  } else {
    return Array.from(arr);
  }
}

var NOOP$1 = function NOOP(f) {
  return f;
};

var ALIGNMENTS = {
  justify: sankeyJustify,
  center: sankeyCenter,
  left: sankeyLeft,
  right: sankeyRight
};
var DEFAULT_MARGINS$1 = {
  top: 20,
  left: 20,
  right: 20,
  bottom: 20
};

function Sankey(props) {
  var align = props.align,
      animation = props.animation,
      children = props.children,
      className = props.className,
      hasVoronoi = props.hasVoronoi,
      height = props.height,
      hideLabels = props.hideLabels,
      labelRotation = props.labelRotation,
      layout = props.layout,
      links = props.links,
      linkOpacity = props.linkOpacity,
      margin = props.margin,
      nodePadding = props.nodePadding,
      nodes = props.nodes,
      nodeWidth = props.nodeWidth,
      onValueClick = props.onValueClick,
      onValueMouseOver = props.onValueMouseOver,
      onValueMouseOut = props.onValueMouseOut,
      onLinkClick = props.onLinkClick,
      onLinkMouseOver = props.onLinkMouseOver,
      onLinkMouseOut = props.onLinkMouseOut,
      style = props.style,
      width = props.width;
  var nodesCopy = [].concat(_toConsumableArray$4(new Array(nodes.length))).map(function (e, i) {
    return _extends$W({}, nodes[i]);
  });
  var linksCopy = [].concat(_toConsumableArray$4(new Array(links.length))).map(function (e, i) {
    return _extends$W({}, links[i]);
  });

  var _getInnerDimensions = getInnerDimensions({
    margin: margin,
    height: height,
    width: width
  }, DEFAULT_MARGINS$1),
      marginLeft = _getInnerDimensions.marginLeft,
      marginTop = _getInnerDimensions.marginTop,
      marginRight = _getInnerDimensions.marginRight,
      marginBottom = _getInnerDimensions.marginBottom;

  var sankeyInstance = sankey().extent([[marginLeft, marginTop], [width - marginRight, height - marginBottom - marginTop]]).nodeWidth(nodeWidth).nodePadding(nodePadding).nodes(nodesCopy).links(linksCopy).nodeAlign(ALIGNMENTS[align]).iterations(layout);
  sankeyInstance(nodesCopy);
  var nWidth = sankeyInstance.nodeWidth();
  var path = sankeyLinkHorizontal();
  return React.createElement(XYPlot, _extends$W({}, props, {
    yType: 'literal',
    className: 'rv-sankey ' + className
  }), linksCopy.map(function (link, i) {
    return React.createElement(SankeyLink, {
      style: style.links,
      data: path(link),
      opacity: link.opacity || linkOpacity,
      color: link.color,
      onLinkClick: onLinkClick,
      onLinkMouseOver: onLinkMouseOver,
      onLinkMouseOut: onLinkMouseOut,
      strokeWidth: Math.max(link.width, 1),
      node: link,
      nWidth: nWidth,
      key: 'link-' + i
    });
  }), React.createElement(VerticalRectSeries, {
    animation: animation,
    className: className + ' rv-sankey__node',
    data: nodesCopy.map(function (node) {
      return _extends$W({}, node, {
        y: node.y1 - marginTop,
        y0: node.y0 - marginTop,
        x: node.x1,
        x0: node.x0,
        color: node.color || DISCRETE_COLOR_RANGE[0],
        sourceLinks: null,
        targetLinks: null
      });
    }),
    style: style.rects,
    onValueClick: onValueClick,
    onValueMouseOver: onValueMouseOver,
    onValueMouseOut: onValueMouseOut,
    colorType: 'literal'
  }), !hideLabels && React.createElement(LabelSeries, {
    animation: animation,
    className: className,
    rotation: labelRotation,
    labelAnchorY: 'text-before-edge',
    data: nodesCopy.map(function (node, i) {
      return _extends$W({
        x: node.x0 + (node.x0 < width / 2 ? nWidth + 10 : -10),
        y: (node.y0 + node.y1) / 2 - marginTop,
        label: node.name,
        style: _extends$W({
          textAnchor: node.x0 < width / 2 ? 'start' : 'end',
          dy: '-.5em'
        }, style.labels)
      }, nodes[i]);
    })
  }), hasVoronoi && React.createElement(Voronoi, {
    className: 'rv-sankey__voronoi',
    extent: [[-marginLeft, -marginTop], [width + marginRight, height + marginBottom]],
    nodes: nodesCopy,
    onClick: onValueClick,
    onHover: onValueMouseOver,
    onBlur: onValueMouseOut,
    x: function x(d) {
      return d.x0 + (d.x1 - d.x0) / 2;
    },
    y: function y(d) {
      return d.y0 + (d.y1 - d.y0) / 2;
    }
  }), children);
}

Sankey.defaultProps = {
  align: 'justify',
  className: '',
  hasVoronoi: false,
  hideLabels: false,
  labelRotation: 0,
  layout: 50,
  margin: DEFAULT_MARGINS$1,
  nodePadding: 10,
  nodeWidth: 10,
  onValueMouseOver: NOOP$1,
  onValueClick: NOOP$1,
  onValueMouseOut: NOOP$1,
  onLinkClick: NOOP$1,
  onLinkMouseOver: NOOP$1,
  onLinkMouseOut: NOOP$1,
  style: {
    links: {},
    rects: {},
    labels: {}
  }
};
Sankey.propTypes = {
  align: PropTypes.oneOf(['justify', 'left', 'right', 'center']),
  className: PropTypes.string,
  hasVoronoi: PropTypes.bool,
  height: PropTypes.number.isRequired,
  hideLabels: PropTypes.bool,
  labelRotation: PropTypes.number,
  layout: PropTypes.number,
  links: PropTypes.arrayOf(PropTypes.shape({
    source: PropTypes.oneOfType([PropTypes.number, PropTypes.object]).isRequired,
    target: PropTypes.oneOfType([PropTypes.number, PropTypes.object]).isRequired
  })).isRequired,
  margin: MarginPropType,
  nodePadding: PropTypes.number,
  nodes: PropTypes.arrayOf(PropTypes.object).isRequired,
  nodeWidth: PropTypes.number,
  onValueMouseOver: PropTypes.func,
  onValueClick: PropTypes.func,
  onValueMouseOut: PropTypes.func,
  onLinkClick: PropTypes.func,
  onLinkMouseOver: PropTypes.func,
  onLinkMouseOut: PropTypes.func,
  style: PropTypes.shape({
    links: PropTypes.object,
    rects: PropTypes.object,
    labels: PropTypes.object
  }),
  width: PropTypes.number.isRequired
};

var _extends$X = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var predefinedClassName$j = 'rv-sunburst';
var LISTENERS_TO_OVERWRITE = ['onValueMouseOver', 'onValueMouseOut', 'onValueClick', 'onValueRightClick', 'onSeriesMouseOver', 'onSeriesMouseOut', 'onSeriesClick', 'onSeriesRightClick'];
/**
 * Create the list of nodes to render.
 * @param {Object} props
   props.data {Object} - tree structured data (each node has a name anc an array of children)
   props.height {number} - the height of the graphic to be rendered
   props.hideRootNode {boolean} - whether or not to hide the root node
   props.width {number} - the width of the graphic to be rendered
   props.getSize {function} - accessor for the size
 * @returns {Array} Array of nodes.
 */

function getNodesToRender(_ref) {
  var data = _ref.data,
      height = _ref.height,
      hideRootNode = _ref.hideRootNode,
      width = _ref.width,
      getSize = _ref.getSize;
  var partitionFunction = partition();
  var structuredInput = hierarchy(data).sum(getSize);
  var radius = Math.min(width, height) / 2 - 10;
  var x = scaleLinear().range([0, 2 * Math.PI]);
  var y = scaleSqrt().range([0, radius]);
  return partitionFunction(structuredInput).descendants().reduce(function (res, cell, index) {
    if (hideRootNode && index === 0) {
      return res;
    }

    return res.concat([_extends$X({
      angle0: Math.max(0, Math.min(2 * Math.PI, x(cell.x0))),
      angle: Math.max(0, Math.min(2 * Math.PI, x(cell.x1))),
      radius0: Math.max(0, y(cell.y0)),
      radius: Math.max(0, y(cell.y1)),
      depth: cell.depth,
      parent: cell.parent
    }, cell.data)]);
  }, []);
}
/**
 * Convert arc nodes into label rows.
 * Important to use mappedData rather than regular data, bc it is already unrolled
 * @param {Array} mappedData - Array of nodes.
 * @param {Object} accessors - object of accessors
 * @returns {Array} array of node for rendering as labels
 */


function buildLabels(mappedData, accessors) {
  var getAngle = accessors.getAngle,
      getAngle0 = accessors.getAngle0,
      getLabel = accessors.getLabel,
      getRadius0 = accessors.getRadius0;
  return mappedData.filter(getLabel).map(function (row) {
    var truedAngle = -1 * getAngle(row) + Math.PI / 2;
    var truedAngle0 = -1 * getAngle0(row) + Math.PI / 2;
    var angle = (truedAngle0 + truedAngle) / 2;
    var rotateLabels = !row.dontRotateLabel;
    var rotAngle = -angle / (2 * Math.PI) * 360;
    return _extends$X({}, row, {
      children: null,
      angle: null,
      radius: null,
      x: getRadius0(row) * Math.cos(angle),
      y: getRadius0(row) * Math.sin(angle),
      style: _extends$X({
        textAnchor: rotAngle > 90 ? 'end' : 'start'
      }, row.labelStyle),
      rotation: rotateLabels ? rotAngle > 90 ? rotAngle + 180 : rotAngle === 90 ? 90 : rotAngle : null
    });
  });
}

var NOOP$2 = function NOOP() {};

function Sunburst(props) {
  var getAngle = props.getAngle,
      getAngle0 = props.getAngle0,
      animation = props.animation,
      className = props.className,
      children = props.children,
      data = props.data,
      height = props.height,
      hideRootNode = props.hideRootNode,
      getLabel = props.getLabel,
      width = props.width,
      getSize = props.getSize,
      colorType = props.colorType;
  var mappedData = getNodesToRender({
    data: data,
    height: height,
    hideRootNode: hideRootNode,
    width: width,
    getSize: getSize
  });
  var radialDomain = getRadialDomain(mappedData);
  var margin = getRadialLayoutMargin(width, height, radialDomain);
  var labelData = buildLabels(mappedData, {
    getAngle: getAngle,
    getAngle0: getAngle0,
    getLabel: getLabel,
    getRadius0: function getRadius0(d) {
      return d.radius0;
    }
  });

  var hofBuilder = function hofBuilder(f) {
    return function (e, i) {
      return f ? f(mappedData[e.index], i) : NOOP$2;
    };
  };

  return React.createElement(XYPlot, {
    height: height,
    hasTreeStructure: true,
    width: width,
    className: predefinedClassName$j + ' ' + className,
    margin: margin,
    xDomain: [-radialDomain, radialDomain],
    yDomain: [-radialDomain, radialDomain]
  }, React.createElement(ArcSeries, _extends$X({
    colorType: colorType
  }, props, {
    animation: animation,
    radiusDomain: [0, radialDomain],
    // need to present a stripped down version for interpolation
    data: animation ? mappedData.map(function (row, index) {
      return _extends$X({}, row, {
        parent: null,
        children: null,
        index: index
      });
    }) : mappedData,
    _data: animation ? mappedData : null,
    arcClassName: predefinedClassName$j + '__series--radial__arc'
  }, LISTENERS_TO_OVERWRITE.reduce(function (acc, propName) {
    var prop = props[propName];
    acc[propName] = animation ? hofBuilder(prop) : prop;
    return acc;
  }, {}))), labelData.length > 0 && React.createElement(LabelSeries, {
    data: labelData,
    getLabel: getLabel
  }), children);
}

Sunburst.displayName = 'Sunburst';
Sunburst.propTypes = {
  animation: AnimationPropType,
  getAngle: PropTypes.func,
  getAngle0: PropTypes.func,
  className: PropTypes.string,
  colorType: PropTypes.string,
  data: PropTypes.object.isRequired,
  height: PropTypes.number.isRequired,
  hideRootNode: PropTypes.bool,
  getLabel: PropTypes.func,
  onValueClick: PropTypes.func,
  onValueMouseOver: PropTypes.func,
  onValueMouseOut: PropTypes.func,
  getSize: PropTypes.func,
  width: PropTypes.number.isRequired,
  padAngle: PropTypes.oneOfType([PropTypes.func, PropTypes.number])
};
Sunburst.defaultProps = {
  getAngle: function getAngle(d) {
    return d.angle;
  },
  getAngle0: function getAngle0(d) {
    return d.angle0;
  },
  className: '',
  colorType: 'literal',
  getColor: function getColor(d) {
    return d.color;
  },
  hideRootNode: false,
  getLabel: function getLabel(d) {
    return d.label;
  },
  getSize: function getSize(d) {
    return d.size;
  },
  padAngle: 0
};

var _extends$Y = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var ANIMATED_PROPS = ['colorRange', 'colorDomain', 'color', 'opacityRange', 'opacityDomain', 'opacity', 'x0', 'x1', 'y0', 'y1', 'r'];

function TreemapLeaf(props) {
  var animation = props.animation,
      getLabel = props.getLabel,
      mode = props.mode,
      node = props.node,
      onLeafClick = props.onLeafClick,
      onLeafMouseOver = props.onLeafMouseOver,
      onLeafMouseOut = props.onLeafMouseOut,
      r = props.r,
      scales = props.scales,
      x0 = props.x0,
      x1 = props.x1,
      y0 = props.y0,
      y1 = props.y1,
      style = props.style;

  if (animation) {
    return React.createElement(Animation, _extends$Y({}, props, {
      animatedProps: ANIMATED_PROPS
    }), React.createElement(TreemapLeaf, _extends$Y({}, props, {
      animation: null
    })));
  }

  var useCirclePacking = mode === 'circlePack';
  var background = scales.color(node);
  var opacity = scales.opacity(node);
  var color = getFontColorFromBackground(background);
  var data = node.data;
  var title = getLabel(data);

  var leafStyle = _extends$Y({
    top: useCirclePacking ? y0 - r : y0,
    left: useCirclePacking ? x0 - r : x0,
    width: useCirclePacking ? r * 2 : x1 - x0,
    height: useCirclePacking ? r * 2 : y1 - y0,
    background: background,
    opacity: opacity,
    color: color
  }, style, node.data.style);

  return React.createElement('div', {
    className: 'rv-treemap__leaf ' + (useCirclePacking ? 'rv-treemap__leaf--circle' : ''),
    onMouseEnter: function onMouseEnter(event) {
      return onLeafMouseOver(node, event);
    },
    onMouseLeave: function onMouseLeave(event) {
      return onLeafMouseOut(node, event);
    },
    onClick: function onClick(event) {
      return onLeafClick(node, event);
    },
    style: leafStyle
  }, React.createElement('div', {
    className: 'rv-treemap__leaf__content'
  }, title));
}

TreemapLeaf.propTypes = {
  animation: AnimationPropType,
  height: PropTypes.number.isRequired,
  mode: PropTypes.string,
  node: PropTypes.object.isRequired,
  onLeafClick: PropTypes.func,
  onLeafMouseOver: PropTypes.func,
  onLeafMouseOut: PropTypes.func,
  scales: PropTypes.object.isRequired,
  width: PropTypes.number.isRequired,
  r: PropTypes.number.isRequired,
  x0: PropTypes.number.isRequired,
  x1: PropTypes.number.isRequired,
  y0: PropTypes.number.isRequired,
  y1: PropTypes.number.isRequired
};

var _extends$Z = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function TreemapDOM(props) {
  var animation = props.animation,
      className = props.className,
      height = props.height,
      hideRootNode = props.hideRootNode,
      getLabel = props.getLabel,
      mode = props.mode,
      nodes = props.nodes,
      width = props.width,
      scales = props.scales,
      style = props.style;
  var useCirclePacking = mode === 'circlePack';
  return React.createElement('div', {
    className: 'rv-treemap ' + (useCirclePacking ? 'rv-treemap-circle-packed' : '') + ' ' + className,
    style: {
      height: height,
      width: width
    }
  }, nodes.map(function (node, index) {
    // throw out the rootest node
    if (hideRootNode && !index) {
      return null;
    }

    var nodeProps = _extends$Z({
      animation: animation,
      node: node,
      getLabel: getLabel
    }, props, {
      x0: useCirclePacking ? node.x : node.x0,
      x1: useCirclePacking ? node.x : node.x1,
      y0: useCirclePacking ? node.y : node.y0,
      y1: useCirclePacking ? node.y : node.y1,
      r: useCirclePacking ? node.r : 1,
      scales: scales,
      style: style
    });

    return React.createElement(TreemapLeaf, _extends$Z({}, nodeProps, {
      key: 'leaf-' + index
    }));
  }));
}

TreemapDOM.displayName = 'TreemapDOM';

var _extends$_ = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$F = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _classCallCheck$F(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$F(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$F(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var MARGIN_ADJUST = 1.2;

var TreemapSVG = function (_React$Component) {
  _inherits$F(TreemapSVG, _React$Component);

  function TreemapSVG() {
    _classCallCheck$F(this, TreemapSVG);

    return _possibleConstructorReturn$F(this, (TreemapSVG.__proto__ || Object.getPrototypeOf(TreemapSVG)).apply(this, arguments));
  }

  _createClass$F(TreemapSVG, [{
    key: 'getCircularNodes',
    value: function getCircularNodes() {
      var _props = this.props,
          animation = _props.animation,
          hideRootNode = _props.hideRootNode,
          nodes = _props.nodes,
          onLeafMouseOver = _props.onLeafMouseOver,
          onLeafMouseOut = _props.onLeafMouseOut,
          onLeafClick = _props.onLeafClick,
          scales = _props.scales,
          style = _props.style;

      var _nodes$reduce = nodes.reduce(function (acc, node, index) {
        if (!index && hideRootNode) {
          return acc;
        }

        var x = node.x,
            y = node.y,
            r = node.r;
        return {
          maxY: Math.max(y + r, acc.maxY),
          minY: Math.min(y - r, acc.minY),
          maxX: Math.max(x + MARGIN_ADJUST * r, acc.maxX),
          minX: Math.min(x - MARGIN_ADJUST * r, acc.minX),
          rows: acc.rows.concat([{
            x: x,
            y: y,
            size: r,
            color: scales.color(node)
          }])
        };
      }, {
        rows: [],
        maxY: -Infinity,
        minY: Infinity,
        maxX: -Infinity,
        minX: Infinity
      }),
          rows = _nodes$reduce.rows,
          minY = _nodes$reduce.minY,
          maxY = _nodes$reduce.maxY,
          minX = _nodes$reduce.minX,
          maxX = _nodes$reduce.maxX;

      return {
        updatedNodes: React.createElement(MarkSeries, {
          animation: animation,
          className: 'rv-treemap__leaf rv-treemap__leaf--circle',
          onSeriesMouseEnter: onLeafMouseOver,
          onSeriesMouseLeave: onLeafMouseOut,
          onSeriesClick: onLeafClick,
          data: rows,
          colorType: 'literal',
          getColor: function getColor(d) {
            return d.color;
          },
          sizeType: 'literal',
          getSize: function getSize(d) {
            return d.size;
          },
          style: style
        }),
        minY: minY,
        maxY: maxY,
        minX: minX,
        maxX: maxX
      };
    }
  }, {
    key: 'getNonCircularNodes',
    value: function getNonCircularNodes() {
      var _props2 = this.props,
          animation = _props2.animation,
          hideRootNode = _props2.hideRootNode,
          nodes = _props2.nodes,
          onLeafMouseOver = _props2.onLeafMouseOver,
          onLeafMouseOut = _props2.onLeafMouseOut,
          onLeafClick = _props2.onLeafClick,
          scales = _props2.scales,
          style = _props2.style;
      var color = scales.color;
      return nodes.reduce(function (acc, node, index) {
        if (!index && hideRootNode) {
          return acc;
        }

        var x0 = node.x0,
            x1 = node.x1,
            y1 = node.y1,
            y0 = node.y0;
        var x = x0;
        var y = y0;
        var nodeHeight = y1 - y0;
        var nodeWidth = x1 - x0;
        acc.maxY = Math.max(y + nodeHeight, acc.maxY);
        acc.minY = Math.min(y, acc.minY);
        acc.maxX = Math.max(x + nodeWidth, acc.maxX);
        acc.minX = Math.min(x, acc.minX);
        var data = [{
          x: x,
          y: y
        }, {
          x: x,
          y: y + nodeHeight
        }, {
          x: x + nodeWidth,
          y: y + nodeHeight
        }, {
          x: x + nodeWidth,
          y: y
        }];
        acc.updatedNodes = acc.updatedNodes.concat([React.createElement(PolygonSeries, {
          animation: animation,
          className: 'rv-treemap__leaf',
          key: index,
          color: color(node),
          type: 'literal',
          onSeriesMouseEnter: onLeafMouseOver,
          onSeriesMouseLeave: onLeafMouseOut,
          onSeriesClick: onLeafClick,
          data: data,
          style: _extends$_({}, style, node.style)
        })]);
        return acc;
      }, {
        updatedNodes: [],
        maxY: -Infinity,
        minY: Infinity,
        maxX: -Infinity,
        minX: Infinity
      });
    }
  }, {
    key: 'render',
    value: function render() {
      var _props3 = this.props,
          className = _props3.className,
          height = _props3.height,
          mode = _props3.mode,
          nodes = _props3.nodes,
          width = _props3.width;
      var useCirclePacking = mode === 'circlePack';

      var _ref = useCirclePacking ? this.getCircularNodes() : this.getNonCircularNodes(),
          minY = _ref.minY,
          maxY = _ref.maxY,
          minX = _ref.minX,
          maxX = _ref.maxX,
          updatedNodes = _ref.updatedNodes;

      var labels = nodes.reduce(function (acc, node) {
        if (!node.data.title) {
          return acc;
        }

        return acc.concat(_extends$_({}, node.data, {
          x: node.x0 || node.x,
          y: node.y0 || node.y,
          label: '' + node.data.title
        }));
      }, []);
      return React.createElement(XYPlot, _extends$_({
        className: 'rv-treemap ' + (useCirclePacking ? 'rv-treemap-circle-packed' : '') + ' ' + className,
        width: width,
        height: height,
        yDomain: [maxY, minY],
        xDomain: [minX, maxX],
        colorType: 'literal',
        hasTreeStructure: true
      }, this.props), updatedNodes, React.createElement(LabelSeries, {
        data: labels
      }));
    }
  }]);

  return TreemapSVG;
}(React.Component);

TreemapSVG.displayName = 'TreemapSVG';

var _createClass$G = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

var _extends$$ = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

function _classCallCheck$G(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$G(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$G(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var TREEMAP_TILE_MODES = {
  squarify: treemapSquarify,
  resquarify: treemapResquarify,
  slice: treemapSlice,
  dice: treemapDice,
  slicedice: treemapSliceDice,
  binary: treemapBinary
};
var TREEMAP_LAYOUT_MODES = ['circlePack', 'partition', 'partition-pivot'];

var NOOP$3 = function NOOP(d) {
  return d;
};

var ATTRIBUTES$2 = ['opacity', 'color'];
var DEFAULT_MARGINS$2 = {
  left: 40,
  right: 10,
  top: 10,
  bottom: 40
};
/**
 * Get the map of scale functions from the given props.
 * @param {Object} props Props for the component.
 * @returns {Object} Map of scale functions.
 * @private
 */

function _getScaleFns(props) {
  var data = props.data;
  var allData = data.children || []; // Adding _allData property to the object to reuse the existing
  // getAttributeFunctor function.

  var compatibleProps = _extends$$({}, props, getMissingScaleProps(props, allData, ATTRIBUTES$2), {
    _allData: allData
  });

  return {
    opacity: getAttributeFunctor(compatibleProps, 'opacity'),
    color: getAttributeFunctor(compatibleProps, 'color')
  };
}

var Treemap = function (_React$Component) {
  _inherits$G(Treemap, _React$Component);

  function Treemap(props) {
    _classCallCheck$G(this, Treemap);

    var _this = _possibleConstructorReturn$G(this, (Treemap.__proto__ || Object.getPrototypeOf(Treemap)).call(this, props));

    _this.state = _extends$$({
      scales: _getScaleFns(props)
    }, getInnerDimensions(props, props.margin));
    return _this;
  }

  _createClass$G(Treemap, [{
    key: 'componentWillReceiveProps',
    value: function componentWillReceiveProps(props) {
      this.setState(_extends$$({
        scales: _getScaleFns(props)
      }, getInnerDimensions(props, props.margin)));
    }
    /**
     * Create the list of nodes to render.
     * @returns {Array} Array of nodes.
     * @private
     */

  }, {
    key: '_getNodesToRender',
    value: function _getNodesToRender() {
      var _state = this.state,
          innerWidth = _state.innerWidth,
          innerHeight = _state.innerHeight;
      var _props = this.props,
          data = _props.data,
          mode = _props.mode,
          padding = _props.padding,
          sortFunction = _props.sortFunction,
          getSize = _props.getSize;

      if (!data) {
        return [];
      }

      if (mode === 'partition' || mode === 'partition-pivot') {
        var partitionFunction = partition().size(mode === 'partition-pivot' ? [innerHeight, innerWidth] : [innerWidth, innerHeight]).padding(padding);

        var _structuredInput = hierarchy(data).sum(getSize).sort(function (a, b) {
          return sortFunction(a, b, getSize);
        });

        var mappedNodes = partitionFunction(_structuredInput).descendants();

        if (mode === 'partition-pivot') {
          return mappedNodes.map(function (node) {
            return _extends$$({}, node, {
              x0: node.y0,
              x1: node.y1,
              y0: node.x0,
              y1: node.x1
            });
          });
        }

        return mappedNodes;
      }

      if (mode === 'circlePack') {
        var packingFunction = pack().size([innerWidth, innerHeight]).padding(padding);

        var _structuredInput2 = hierarchy(data).sum(getSize).sort(function (a, b) {
          return sortFunction(a, b, getSize);
        });

        return packingFunction(_structuredInput2).descendants();
      }

      var tileFn = TREEMAP_TILE_MODES[mode];
      var treemapingFunction = treemap(tileFn).tile(tileFn).size([innerWidth, innerHeight]).padding(padding);
      var structuredInput = hierarchy(data).sum(getSize).sort(function (a, b) {
        return sortFunction(a, b, getSize);
      });
      return treemapingFunction(structuredInput).descendants();
    }
  }, {
    key: 'render',
    value: function render() {
      var renderMode = this.props.renderMode;
      var scales = this.state.scales;

      var nodes = this._getNodesToRender();

      var TreemapElement = renderMode === 'SVG' ? TreemapSVG : TreemapDOM;
      return React.createElement(TreemapElement, _extends$$({}, this.props, {
        nodes: nodes,
        scales: scales
      }));
    }
  }]);

  return Treemap;
}(React.Component);

Treemap.displayName = 'Treemap';
Treemap.propTypes = {
  animation: AnimationPropType,
  className: PropTypes.string,
  data: PropTypes.object.isRequired,
  height: PropTypes.number.isRequired,
  hideRootNode: PropTypes.bool,
  margin: MarginPropType,
  mode: PropTypes.oneOf(Object.keys(TREEMAP_TILE_MODES).concat(TREEMAP_LAYOUT_MODES)),
  onLeafClick: PropTypes.func,
  onLeafMouseOver: PropTypes.func,
  onLeafMouseOut: PropTypes.func,
  useCirclePacking: PropTypes.bool,
  padding: PropTypes.number.isRequired,
  sortFunction: PropTypes.func,
  width: PropTypes.number.isRequired,
  getSize: PropTypes.func,
  getColor: PropTypes.func
};
Treemap.defaultProps = {
  className: '',
  colorRange: CONTINUOUS_COLOR_RANGE,
  _colorValue: DEFAULT_COLOR,
  data: {
    children: []
  },
  hideRootNode: false,
  margin: DEFAULT_MARGINS$2,
  mode: 'squarify',
  onLeafClick: NOOP$3,
  onLeafMouseOver: NOOP$3,
  onLeafMouseOut: NOOP$3,
  opacityType: OPACITY_TYPE,
  _opacityValue: DEFAULT_OPACITY,
  padding: 1,
  sortFunction: function sortFunction(a, b, accessor) {
    if (!accessor) {
      return 0;
    }

    return accessor(a) - accessor(b);
  },
  getSize: function getSize(d) {
    return d.size;
  },
  getColor: function getColor(d) {
    return d.color;
  },
  getLabel: function getLabel(d) {
    return d.title;
  }
};
var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};
var win;

if (typeof window !== "undefined") {
  win = window;
} else if (typeof commonjsGlobal !== "undefined") {
  win = commonjsGlobal;
} else if (typeof self !== "undefined") {
  win = self;
} else {
  win = {};
}

var window_1 = win;

var _extends$10 = Object.assign || function (target) {
  for (var i = 1; i < arguments.length; i++) {
    var source = arguments[i];

    for (var key in source) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        target[key] = source[key];
      }
    }
  }

  return target;
};

var _createClass$H = function () {
  function defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }

  return function (Constructor, protoProps, staticProps) {
    if (protoProps) defineProperties(Constructor.prototype, protoProps);
    if (staticProps) defineProperties(Constructor, staticProps);
    return Constructor;
  };
}();

function _objectWithoutProperties$1(obj, keys) {
  var target = {};

  for (var i in obj) {
    if (keys.indexOf(i) >= 0) continue;
    if (!Object.prototype.hasOwnProperty.call(obj, i)) continue;
    target[i] = obj[i];
  }

  return target;
}

function _classCallCheck$H(instance, Constructor) {
  if (!(instance instanceof Constructor)) {
    throw new TypeError("Cannot call a class as a function");
  }
}

function _possibleConstructorReturn$H(self, call) {
  if (!self) {
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  }

  return call && (typeof call === "object" || typeof call === "function") ? call : self;
}

function _inherits$H(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });
  if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass;
}

var CONTAINER_REF = 'container'; // As a performance enhancement, we want to only listen once

var resizeSubscribers = [];
var DEBOUNCE_DURATION = 100;
var timeoutId = null;
/**
 * Calls each subscriber, debounced to the
 */

function debounceEmitResize() {
  window_1.clearTimeout(timeoutId);
  timeoutId = window_1.setTimeout(emitResize, DEBOUNCE_DURATION);
}
/**
 * Calls each subscriber once syncronously.
 */


function emitResize() {
  resizeSubscribers.forEach(function (cb) {
    return cb();
  });
}
/**
 * Add the given callback to the list of subscribers to be caled when the
 * window resizes. Returns a function that, when called, removes the given
 * callback from the list of subscribers. This function is also resposible for
 * adding and removing the resize listener on `window`.
 *
 * @param {Function} cb - Subscriber callback function
 * @returns {Function} Unsubscribe function
 */


function subscribeToDebouncedResize(cb) {
  resizeSubscribers.push(cb); // if we go from zero to one Flexible components instances, add the listener

  if (resizeSubscribers.length === 1) {
    window_1.addEventListener('resize', debounceEmitResize);
  }

  return function unsubscribe() {
    removeSubscriber(cb); // if we have no Flexible components, remove the listener

    if (resizeSubscribers.length === 0) {
      window_1.clearTimeout(timeoutId);
      window_1.removeEventListener('resize', debounceEmitResize);
    }
  };
}
/**
 * Helper for removing the given callback from the list of subscribers.
 *
 * @param {Function} cb - Subscriber callback function
 */


function removeSubscriber(cb) {
  var index = resizeSubscribers.indexOf(cb);

  if (index > -1) {
    resizeSubscribers.splice(index, 1);
  }
}
/**
 * Helper for getting a display name for the child component
 * @param {*} Component React class for the child component.
 * @returns {String} The child components name
 */


function getDisplayName(Component) {
  return Component.displayName || Component.name || 'Component';
}
/**
 * Add the ability to stretch the visualization on window resize.
 * @param {*} Component React class for the child component.
 * @returns {*} Flexible component.
 */


function makeFlexible(Component, isWidthFlexible, isHeightFlexible) {
  var ResultClass = function (_React$Component) {
    _inherits$H(ResultClass, _React$Component);

    _createClass$H(ResultClass, null, [{
      key: 'propTypes',
      get: function get() {
        var _Component$propTypes = Component.propTypes,
            height = _Component$propTypes.height,
            width = _Component$propTypes.width,
            otherPropTypes = _objectWithoutProperties$1(_Component$propTypes, ['height', 'width']); // eslint-disable-line no-unused-vars


        return otherPropTypes;
      }
    }]);

    function ResultClass(props) {
      _classCallCheck$H(this, ResultClass);

      var _this = _possibleConstructorReturn$H(this, (ResultClass.__proto__ || Object.getPrototypeOf(ResultClass)).call(this, props));

      _this._onResize = function () {
        var containerElement = getDOMNode(_this[CONTAINER_REF]);
        var offsetHeight = containerElement.offsetHeight,
            offsetWidth = containerElement.offsetWidth;
        var newHeight = _this.state.height === offsetHeight ? {} : {
          height: offsetHeight
        };
        var newWidth = _this.state.width === offsetWidth ? {} : {
          width: offsetWidth
        };

        _this.setState(_extends$10({}, newHeight, newWidth));
      };

      _this.state = {
        height: 0,
        width: 0
      };
      return _this;
    }
    /**
     * Get the width of the container and assign the width.
     * @private
     */


    _createClass$H(ResultClass, [{
      key: 'componentDidMount',
      value: function componentDidMount() {
        this._onResize();

        this.cancelSubscription = subscribeToDebouncedResize(this._onResize);
      }
    }, {
      key: 'componentWillReceiveProps',
      value: function componentWillReceiveProps() {
        this._onResize();
      }
    }, {
      key: 'componentWillUnmount',
      value: function componentWillUnmount() {
        this.cancelSubscription();
      }
    }, {
      key: 'render',
      value: function render() {
        var _this2 = this;

        var _state = this.state,
            height = _state.height,
            width = _state.width;

        var props = _extends$10({}, this.props, {
          animation: height === 0 && width === 0 ? null : this.props.animation
        });

        var updatedDimensions = _extends$10({}, isHeightFlexible ? {
          height: height
        } : {}, isWidthFlexible ? {
          width: width
        } : {});

        return React.createElement('div', {
          ref: function ref(_ref) {
            return _this2[CONTAINER_REF] = _ref;
          },
          style: {
            width: '100%',
            height: '100%'
          }
        }, React.createElement(Component, _extends$10({}, updatedDimensions, props)));
      }
    }]);

    return ResultClass;
  }(React.Component);

  ResultClass.displayName = 'Flexible' + getDisplayName(Component);
  return ResultClass;
}

function makeHeightFlexible(component) {
  return makeFlexible(component, false, true);
}

function makeVisFlexible(component) {
  return makeFlexible(component, true, true);
}

function makeWidthFlexible(component) {
  return makeFlexible(component, true, false);
}

var FlexibleWidthXYPlot = makeWidthFlexible(XYPlot);
var FlexibleHeightXYPlot = makeHeightFlexible(XYPlot);
var FlexibleXYPlot = makeVisFlexible(XYPlot);
export { AbstractSeries, ArcSeries, AreaSeries, axisUtils as AxisUtils, Borders, ChartLabel, CircularGridLines, ContinuousColorLegend, ContinuousSizeLegend, ContourSeries, Crosshair, CustomSVGSeries, DecorativeAxis, DiscreteColorLegend, FlexibleHeightXYPlot, FlexibleWidthXYPlot, FlexibleXYPlot, GradientDefs, GridLines, HeatmapSeries, HexbinSeries, Highlight, Hint, HorizontalBarSeries, HorizontalBarSeriesCanvas, HorizontalGridLines, HorizontalRectSeries, HorizontalRectSeriesCanvas, LabelSeries, LineMarkSeries, LineMarkSeriesCanvas, LineSeries, LineSeriesCanvas, MarkSeries, MarkSeriesCanvas, ParallelCoordinates, PolygonSeries, RadarChart, RadialChart, RectSeries, RectSeriesCanvas, Sankey, scalesUtils as ScaleUtils, SearchableDiscreteColorLegend, Sunburst, Treemap, VerticalBarSeries, HorizontalBarSeriesCanvas$1 as VerticalBarSeriesCanvas, VerticalGridLines, VerticalRectSeries, HorizontalRectSeriesCanvas$1 as VerticalRectSeriesCanvas, Voronoi, WhiskerSeries, XAxis, XYPlot, YAxis, makeHeightFlexible, makeVisFlexible, makeWidthFlexible };
export default null;