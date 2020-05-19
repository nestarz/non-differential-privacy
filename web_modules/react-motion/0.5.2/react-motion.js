import performanceNow from 'performance-now';
import raf from 'raf';
import react from 'react';
import propTypes from 'prop-types';

function unwrapExports(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
}

function createCommonjsModule(fn, module) {
  return module = {
    exports: {}
  }, fn(module, module.exports), module.exports;
}

var mapToZero_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;
  exports['default'] = mapToZero;

  function mapToZero(obj) {
    var ret = {};

    for (var key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        ret[key] = 0;
      }
    }

    return ret;
  }

  module.exports = exports['default'];
});
unwrapExports(mapToZero_1);
var stripStyle_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;
  exports['default'] = stripStyle;

  function stripStyle(style) {
    var ret = {};

    for (var key in style) {
      if (!Object.prototype.hasOwnProperty.call(style, key)) {
        continue;
      }

      ret[key] = typeof style[key] === 'number' ? style[key] : style[key].val;
    }

    return ret;
  }

  module.exports = exports['default'];
});
unwrapExports(stripStyle_1);
var stepper_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;
  exports["default"] = stepper;
  var reusedTuple = [0, 0];

  function stepper(secondPerFrame, x, v, destX, k, b, precision) {
    // Spring stiffness, in kg / s^2
    // for animations, destX is really spring length (spring at rest). initial
    // position is considered as the stretched/compressed position of a spring
    var Fspring = -k * (x - destX); // Damping, in kg / s

    var Fdamper = -b * v; // usually we put mass here, but for animation purposes, specifying mass is a
    // bit redundant. you could simply adjust k and b accordingly
    // let a = (Fspring + Fdamper) / mass;

    var a = Fspring + Fdamper;
    var newV = v + a * secondPerFrame;
    var newX = x + newV * secondPerFrame;

    if (Math.abs(newV) < precision && Math.abs(newX - destX) < precision) {
      reusedTuple[0] = destX;
      reusedTuple[1] = 0;
      return reusedTuple;
    }

    reusedTuple[0] = newX;
    reusedTuple[1] = newV;
    return reusedTuple;
  }

  module.exports = exports["default"]; // array reference around.
});
unwrapExports(stepper_1);
var shouldStopAnimation_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;
  exports['default'] = shouldStopAnimation;

  function shouldStopAnimation(currentStyle, style, currentVelocity) {
    for (var key in style) {
      if (!Object.prototype.hasOwnProperty.call(style, key)) {
        continue;
      }

      if (currentVelocity[key] !== 0) {
        return false;
      }

      var styleValue = typeof style[key] === 'number' ? style[key] : style[key].val; // stepper will have already taken care of rounding precision errors, so
      // won't have such thing as 0.9999 !=== 1

      if (currentStyle[key] !== styleValue) {
        return false;
      }
    }

    return true;
  }

  module.exports = exports['default'];
});
unwrapExports(shouldStopAnimation_1);
var Motion_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;

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

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      'default': obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== 'function' && superClass !== null) {
      throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass);
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

  var _mapToZero2 = _interopRequireDefault(mapToZero_1);

  var _stripStyle2 = _interopRequireDefault(stripStyle_1);

  var _stepper4 = _interopRequireDefault(stepper_1);

  var _performanceNow2 = _interopRequireDefault(performanceNow);

  var _raf2 = _interopRequireDefault(raf);

  var _shouldStopAnimation2 = _interopRequireDefault(shouldStopAnimation_1);

  var _react2 = _interopRequireDefault(react);

  var _propTypes2 = _interopRequireDefault(propTypes);

  var msPerFrame = 1000 / 60;

  var Motion = function (_React$Component) {
    _inherits(Motion, _React$Component);

    _createClass(Motion, null, [{
      key: 'propTypes',
      value: {
        // TOOD: warn against putting a config in here
        defaultStyle: _propTypes2['default'].objectOf(_propTypes2['default'].number),
        style: _propTypes2['default'].objectOf(_propTypes2['default'].oneOfType([_propTypes2['default'].number, _propTypes2['default'].object])).isRequired,
        children: _propTypes2['default'].func.isRequired,
        onRest: _propTypes2['default'].func
      },
      enumerable: true
    }]);

    function Motion(props) {
      var _this = this;

      _classCallCheck(this, Motion);

      _React$Component.call(this, props);

      this.wasAnimating = false;
      this.animationID = null;
      this.prevTime = 0;
      this.accumulatedTime = 0;
      this.unreadPropStyle = null;

      this.clearUnreadPropStyle = function (destStyle) {
        var dirty = false;
        var _state = _this.state;
        var currentStyle = _state.currentStyle;
        var currentVelocity = _state.currentVelocity;
        var lastIdealStyle = _state.lastIdealStyle;
        var lastIdealVelocity = _state.lastIdealVelocity;

        for (var key in destStyle) {
          if (!Object.prototype.hasOwnProperty.call(destStyle, key)) {
            continue;
          }

          var styleValue = destStyle[key];

          if (typeof styleValue === 'number') {
            if (!dirty) {
              dirty = true;
              currentStyle = _extends({}, currentStyle);
              currentVelocity = _extends({}, currentVelocity);
              lastIdealStyle = _extends({}, lastIdealStyle);
              lastIdealVelocity = _extends({}, lastIdealVelocity);
            }

            currentStyle[key] = styleValue;
            currentVelocity[key] = 0;
            lastIdealStyle[key] = styleValue;
            lastIdealVelocity[key] = 0;
          }
        }

        if (dirty) {
          _this.setState({
            currentStyle: currentStyle,
            currentVelocity: currentVelocity,
            lastIdealStyle: lastIdealStyle,
            lastIdealVelocity: lastIdealVelocity
          });
        }
      };

      this.startAnimationIfNecessary = function () {
        // TODO: when config is {a: 10} and dest is {a: 10} do we raf once and
        // call cb? No, otherwise accidental parent rerender causes cb trigger
        _this.animationID = _raf2['default'](function (timestamp) {
          // check if we need to animate in the first place
          var propsStyle = _this.props.style;

          if (_shouldStopAnimation2['default'](_this.state.currentStyle, propsStyle, _this.state.currentVelocity)) {
            if (_this.wasAnimating && _this.props.onRest) {
              _this.props.onRest();
            } // no need to cancel animationID here; shouldn't have any in flight


            _this.animationID = null;
            _this.wasAnimating = false;
            _this.accumulatedTime = 0;
            return;
          }

          _this.wasAnimating = true;

          var currentTime = timestamp || _performanceNow2['default']();

          var timeDelta = currentTime - _this.prevTime;
          _this.prevTime = currentTime;
          _this.accumulatedTime = _this.accumulatedTime + timeDelta; // more than 10 frames? prolly switched browser tab. Restart

          if (_this.accumulatedTime > msPerFrame * 10) {
            _this.accumulatedTime = 0;
          }

          if (_this.accumulatedTime === 0) {
            // no need to cancel animationID here; shouldn't have any in flight
            _this.animationID = null;

            _this.startAnimationIfNecessary();

            return;
          }

          var currentFrameCompletion = (_this.accumulatedTime - Math.floor(_this.accumulatedTime / msPerFrame) * msPerFrame) / msPerFrame;
          var framesToCatchUp = Math.floor(_this.accumulatedTime / msPerFrame);
          var newLastIdealStyle = {};
          var newLastIdealVelocity = {};
          var newCurrentStyle = {};
          var newCurrentVelocity = {};

          for (var key in propsStyle) {
            if (!Object.prototype.hasOwnProperty.call(propsStyle, key)) {
              continue;
            }

            var styleValue = propsStyle[key];

            if (typeof styleValue === 'number') {
              newCurrentStyle[key] = styleValue;
              newCurrentVelocity[key] = 0;
              newLastIdealStyle[key] = styleValue;
              newLastIdealVelocity[key] = 0;
            } else {
              var newLastIdealStyleValue = _this.state.lastIdealStyle[key];
              var newLastIdealVelocityValue = _this.state.lastIdealVelocity[key];

              for (var i = 0; i < framesToCatchUp; i++) {
                var _stepper = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

                newLastIdealStyleValue = _stepper[0];
                newLastIdealVelocityValue = _stepper[1];
              }

              var _stepper2 = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

              var nextIdealX = _stepper2[0];
              var nextIdealV = _stepper2[1];
              newCurrentStyle[key] = newLastIdealStyleValue + (nextIdealX - newLastIdealStyleValue) * currentFrameCompletion;
              newCurrentVelocity[key] = newLastIdealVelocityValue + (nextIdealV - newLastIdealVelocityValue) * currentFrameCompletion;
              newLastIdealStyle[key] = newLastIdealStyleValue;
              newLastIdealVelocity[key] = newLastIdealVelocityValue;
            }
          }

          _this.animationID = null; // the amount we're looped over above

          _this.accumulatedTime -= framesToCatchUp * msPerFrame;

          _this.setState({
            currentStyle: newCurrentStyle,
            currentVelocity: newCurrentVelocity,
            lastIdealStyle: newLastIdealStyle,
            lastIdealVelocity: newLastIdealVelocity
          });

          _this.unreadPropStyle = null;

          _this.startAnimationIfNecessary();
        });
      };

      this.state = this.defaultState();
    }

    Motion.prototype.defaultState = function defaultState() {
      var _props = this.props;
      var defaultStyle = _props.defaultStyle;
      var style = _props.style;

      var currentStyle = defaultStyle || _stripStyle2['default'](style);

      var currentVelocity = _mapToZero2['default'](currentStyle);

      return {
        currentStyle: currentStyle,
        currentVelocity: currentVelocity,
        lastIdealStyle: currentStyle,
        lastIdealVelocity: currentVelocity
      };
    }; // it's possible that currentStyle's value is stale: if props is immediately
    // changed from 0 to 400 to spring(0) again, the async currentStyle is still
    // at 0 (didn't have time to tick and interpolate even once). If we naively
    // compare currentStyle with destVal it'll be 0 === 0 (no animation, stop).
    // In reality currentStyle should be 400


    Motion.prototype.componentDidMount = function componentDidMount() {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    };

    Motion.prototype.componentWillReceiveProps = function componentWillReceiveProps(props) {
      if (this.unreadPropStyle != null) {
        // previous props haven't had the chance to be set yet; set them here
        this.clearUnreadPropStyle(this.unreadPropStyle);
      }

      this.unreadPropStyle = props.style;

      if (this.animationID == null) {
        this.prevTime = _performanceNow2['default']();
        this.startAnimationIfNecessary();
      }
    };

    Motion.prototype.componentWillUnmount = function componentWillUnmount() {
      if (this.animationID != null) {
        _raf2['default'].cancel(this.animationID);

        this.animationID = null;
      }
    };

    Motion.prototype.render = function render() {
      var renderedChildren = this.props.children(this.state.currentStyle);
      return renderedChildren && _react2['default'].Children.only(renderedChildren);
    };

    return Motion;
  }(_react2['default'].Component);

  exports['default'] = Motion;
  module.exports = exports['default']; // after checking for unreadPropStyle != null, we manually go set the
  // non-interpolating values (those that are a number, without a spring
  // config)
});
unwrapExports(Motion_1);
var StaggeredMotion_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;

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

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      'default': obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== 'function' && superClass !== null) {
      throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass);
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

  var _mapToZero2 = _interopRequireDefault(mapToZero_1);

  var _stripStyle2 = _interopRequireDefault(stripStyle_1);

  var _stepper4 = _interopRequireDefault(stepper_1);

  var _performanceNow2 = _interopRequireDefault(performanceNow);

  var _raf2 = _interopRequireDefault(raf);

  var _shouldStopAnimation2 = _interopRequireDefault(shouldStopAnimation_1);

  var _react2 = _interopRequireDefault(react);

  var _propTypes2 = _interopRequireDefault(propTypes);

  var msPerFrame = 1000 / 60;

  function shouldStopAnimationAll(currentStyles, styles, currentVelocities) {
    for (var i = 0; i < currentStyles.length; i++) {
      if (!_shouldStopAnimation2['default'](currentStyles[i], styles[i], currentVelocities[i])) {
        return false;
      }
    }

    return true;
  }

  var StaggeredMotion = function (_React$Component) {
    _inherits(StaggeredMotion, _React$Component);

    _createClass(StaggeredMotion, null, [{
      key: 'propTypes',
      value: {
        // TOOD: warn against putting a config in here
        defaultStyles: _propTypes2['default'].arrayOf(_propTypes2['default'].objectOf(_propTypes2['default'].number)),
        styles: _propTypes2['default'].func.isRequired,
        children: _propTypes2['default'].func.isRequired
      },
      enumerable: true
    }]);

    function StaggeredMotion(props) {
      var _this = this;

      _classCallCheck(this, StaggeredMotion);

      _React$Component.call(this, props);

      this.animationID = null;
      this.prevTime = 0;
      this.accumulatedTime = 0;
      this.unreadPropStyles = null;

      this.clearUnreadPropStyle = function (unreadPropStyles) {
        var _state = _this.state;
        var currentStyles = _state.currentStyles;
        var currentVelocities = _state.currentVelocities;
        var lastIdealStyles = _state.lastIdealStyles;
        var lastIdealVelocities = _state.lastIdealVelocities;
        var someDirty = false;

        for (var i = 0; i < unreadPropStyles.length; i++) {
          var unreadPropStyle = unreadPropStyles[i];
          var dirty = false;

          for (var key in unreadPropStyle) {
            if (!Object.prototype.hasOwnProperty.call(unreadPropStyle, key)) {
              continue;
            }

            var styleValue = unreadPropStyle[key];

            if (typeof styleValue === 'number') {
              if (!dirty) {
                dirty = true;
                someDirty = true;
                currentStyles[i] = _extends({}, currentStyles[i]);
                currentVelocities[i] = _extends({}, currentVelocities[i]);
                lastIdealStyles[i] = _extends({}, lastIdealStyles[i]);
                lastIdealVelocities[i] = _extends({}, lastIdealVelocities[i]);
              }

              currentStyles[i][key] = styleValue;
              currentVelocities[i][key] = 0;
              lastIdealStyles[i][key] = styleValue;
              lastIdealVelocities[i][key] = 0;
            }
          }
        }

        if (someDirty) {
          _this.setState({
            currentStyles: currentStyles,
            currentVelocities: currentVelocities,
            lastIdealStyles: lastIdealStyles,
            lastIdealVelocities: lastIdealVelocities
          });
        }
      };

      this.startAnimationIfNecessary = function () {
        // TODO: when config is {a: 10} and dest is {a: 10} do we raf once and
        // call cb? No, otherwise accidental parent rerender causes cb trigger
        _this.animationID = _raf2['default'](function (timestamp) {
          var destStyles = _this.props.styles(_this.state.lastIdealStyles); // check if we need to animate in the first place


          if (shouldStopAnimationAll(_this.state.currentStyles, destStyles, _this.state.currentVelocities)) {
            // no need to cancel animationID here; shouldn't have any in flight
            _this.animationID = null;
            _this.accumulatedTime = 0;
            return;
          }

          var currentTime = timestamp || _performanceNow2['default']();

          var timeDelta = currentTime - _this.prevTime;
          _this.prevTime = currentTime;
          _this.accumulatedTime = _this.accumulatedTime + timeDelta; // more than 10 frames? prolly switched browser tab. Restart

          if (_this.accumulatedTime > msPerFrame * 10) {
            _this.accumulatedTime = 0;
          }

          if (_this.accumulatedTime === 0) {
            // no need to cancel animationID here; shouldn't have any in flight
            _this.animationID = null;

            _this.startAnimationIfNecessary();

            return;
          }

          var currentFrameCompletion = (_this.accumulatedTime - Math.floor(_this.accumulatedTime / msPerFrame) * msPerFrame) / msPerFrame;
          var framesToCatchUp = Math.floor(_this.accumulatedTime / msPerFrame);
          var newLastIdealStyles = [];
          var newLastIdealVelocities = [];
          var newCurrentStyles = [];
          var newCurrentVelocities = [];

          for (var i = 0; i < destStyles.length; i++) {
            var destStyle = destStyles[i];
            var newCurrentStyle = {};
            var newCurrentVelocity = {};
            var newLastIdealStyle = {};
            var newLastIdealVelocity = {};

            for (var key in destStyle) {
              if (!Object.prototype.hasOwnProperty.call(destStyle, key)) {
                continue;
              }

              var styleValue = destStyle[key];

              if (typeof styleValue === 'number') {
                newCurrentStyle[key] = styleValue;
                newCurrentVelocity[key] = 0;
                newLastIdealStyle[key] = styleValue;
                newLastIdealVelocity[key] = 0;
              } else {
                var newLastIdealStyleValue = _this.state.lastIdealStyles[i][key];
                var newLastIdealVelocityValue = _this.state.lastIdealVelocities[i][key];

                for (var j = 0; j < framesToCatchUp; j++) {
                  var _stepper = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

                  newLastIdealStyleValue = _stepper[0];
                  newLastIdealVelocityValue = _stepper[1];
                }

                var _stepper2 = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

                var nextIdealX = _stepper2[0];
                var nextIdealV = _stepper2[1];
                newCurrentStyle[key] = newLastIdealStyleValue + (nextIdealX - newLastIdealStyleValue) * currentFrameCompletion;
                newCurrentVelocity[key] = newLastIdealVelocityValue + (nextIdealV - newLastIdealVelocityValue) * currentFrameCompletion;
                newLastIdealStyle[key] = newLastIdealStyleValue;
                newLastIdealVelocity[key] = newLastIdealVelocityValue;
              }
            }

            newCurrentStyles[i] = newCurrentStyle;
            newCurrentVelocities[i] = newCurrentVelocity;
            newLastIdealStyles[i] = newLastIdealStyle;
            newLastIdealVelocities[i] = newLastIdealVelocity;
          }

          _this.animationID = null; // the amount we're looped over above

          _this.accumulatedTime -= framesToCatchUp * msPerFrame;

          _this.setState({
            currentStyles: newCurrentStyles,
            currentVelocities: newCurrentVelocities,
            lastIdealStyles: newLastIdealStyles,
            lastIdealVelocities: newLastIdealVelocities
          });

          _this.unreadPropStyles = null;

          _this.startAnimationIfNecessary();
        });
      };

      this.state = this.defaultState();
    }

    StaggeredMotion.prototype.defaultState = function defaultState() {
      var _props = this.props;
      var defaultStyles = _props.defaultStyles;
      var styles = _props.styles;
      var currentStyles = defaultStyles || styles().map(_stripStyle2['default']);
      var currentVelocities = currentStyles.map(function (currentStyle) {
        return _mapToZero2['default'](currentStyle);
      });
      return {
        currentStyles: currentStyles,
        currentVelocities: currentVelocities,
        lastIdealStyles: currentStyles,
        lastIdealVelocities: currentVelocities
      };
    };

    StaggeredMotion.prototype.componentDidMount = function componentDidMount() {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    };

    StaggeredMotion.prototype.componentWillReceiveProps = function componentWillReceiveProps(props) {
      if (this.unreadPropStyles != null) {
        // previous props haven't had the chance to be set yet; set them here
        this.clearUnreadPropStyle(this.unreadPropStyles);
      }

      this.unreadPropStyles = props.styles(this.state.lastIdealStyles);

      if (this.animationID == null) {
        this.prevTime = _performanceNow2['default']();
        this.startAnimationIfNecessary();
      }
    };

    StaggeredMotion.prototype.componentWillUnmount = function componentWillUnmount() {
      if (this.animationID != null) {
        _raf2['default'].cancel(this.animationID);

        this.animationID = null;
      }
    };

    StaggeredMotion.prototype.render = function render() {
      var renderedChildren = this.props.children(this.state.currentStyles);
      return renderedChildren && _react2['default'].Children.only(renderedChildren);
    };

    return StaggeredMotion;
  }(_react2['default'].Component);

  exports['default'] = StaggeredMotion;
  module.exports = exports['default']; // it's possible that currentStyle's value is stale: if props is immediately
  // changed from 0 to 400 to spring(0) again, the async currentStyle is still
  // at 0 (didn't have time to tick and interpolate even once). If we naively
  // compare currentStyle with destVal it'll be 0 === 0 (no animation, stop).
  // In reality currentStyle should be 400
  // after checking for unreadPropStyles != null, we manually go set the
  // non-interpolating values (those that are a number, without a spring
  // config)
});
unwrapExports(StaggeredMotion_1);
var mergeDiff_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;
  exports['default'] = mergeDiff;

  function mergeDiff(prev, next, onRemove) {
    // bookkeeping for easier access of a key's index below. This is 2 allocations +
    // potentially triggering chrome hash map mode for objs (so it might be faster
    var prevKeyIndex = {};

    for (var i = 0; i < prev.length; i++) {
      prevKeyIndex[prev[i].key] = i;
    }

    var nextKeyIndex = {};

    for (var i = 0; i < next.length; i++) {
      nextKeyIndex[next[i].key] = i;
    } // first, an overly elaborate way of merging prev and next, eliminating
    // duplicates (in terms of keys). If there's dupe, keep the item in next).
    // This way of writing it saves allocations


    var ret = [];

    for (var i = 0; i < next.length; i++) {
      ret[i] = next[i];
    }

    for (var i = 0; i < prev.length; i++) {
      if (!Object.prototype.hasOwnProperty.call(nextKeyIndex, prev[i].key)) {
        // this is called my TM's `mergeAndSync`, which calls willLeave. We don't
        // merge in keys that the user desires to kill
        var fill = onRemove(i, prev[i]);

        if (fill != null) {
          ret.push(fill);
        }
      }
    } // now all the items all present. Core sorting logic to have the right order


    return ret.sort(function (a, b) {
      var nextOrderA = nextKeyIndex[a.key];
      var nextOrderB = nextKeyIndex[b.key];
      var prevOrderA = prevKeyIndex[a.key];
      var prevOrderB = prevKeyIndex[b.key];

      if (nextOrderA != null && nextOrderB != null) {
        // both keys in next
        return nextKeyIndex[a.key] - nextKeyIndex[b.key];
      } else if (prevOrderA != null && prevOrderB != null) {
        // both keys in prev
        return prevKeyIndex[a.key] - prevKeyIndex[b.key];
      } else if (nextOrderA != null) {
        // key a in next, key b in prev
        // how to determine the order between a and b? We find a "pivot" (term
        // abuse), a key present in both prev and next, that is sandwiched between
        // a and b. In the context of our above example, if we're comparing a and
        // d, b's (the only) pivot
        for (var i = 0; i < next.length; i++) {
          var pivot = next[i].key;

          if (!Object.prototype.hasOwnProperty.call(prevKeyIndex, pivot)) {
            continue;
          }

          if (nextOrderA < nextKeyIndex[pivot] && prevOrderB > prevKeyIndex[pivot]) {
            return -1;
          } else if (nextOrderA > nextKeyIndex[pivot] && prevOrderB < prevKeyIndex[pivot]) {
            return 1;
          }
        } // pluggable. default to: next bigger than prev


        return 1;
      } // prevOrderA, nextOrderB


      for (var i = 0; i < next.length; i++) {
        var pivot = next[i].key;

        if (!Object.prototype.hasOwnProperty.call(prevKeyIndex, pivot)) {
          continue;
        }

        if (nextOrderB < nextKeyIndex[pivot] && prevOrderA > prevKeyIndex[pivot]) {
          return 1;
        } else if (nextOrderB > nextKeyIndex[pivot] && prevOrderA < prevKeyIndex[pivot]) {
          return -1;
        }
      } // pluggable. default to: next bigger than prev


      return -1;
    });
  }

  module.exports = exports['default']; // to loop through and find a key's index each time), but I no longer care
});
unwrapExports(mergeDiff_1);
var TransitionMotion_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;

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

  var _createClass = function () {
    function defineProperties(target, props) {
      for (var i = 0; i < props.length; i++) {
        var descriptor = props[i];
        descriptor.enumerable = descriptor.enumerable || false;
        descriptor.configurable = true;
        if ('value' in descriptor) descriptor.writable = true;
        Object.defineProperty(target, descriptor.key, descriptor);
      }
    }

    return function (Constructor, protoProps, staticProps) {
      if (protoProps) defineProperties(Constructor.prototype, protoProps);
      if (staticProps) defineProperties(Constructor, staticProps);
      return Constructor;
    };
  }();

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      'default': obj
    };
  }

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError('Cannot call a class as a function');
    }
  }

  function _inherits(subClass, superClass) {
    if (typeof superClass !== 'function' && superClass !== null) {
      throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass);
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

  var _mapToZero2 = _interopRequireDefault(mapToZero_1);

  var _stripStyle2 = _interopRequireDefault(stripStyle_1);

  var _stepper4 = _interopRequireDefault(stepper_1);

  var _mergeDiff2 = _interopRequireDefault(mergeDiff_1);

  var _performanceNow2 = _interopRequireDefault(performanceNow);

  var _raf2 = _interopRequireDefault(raf);

  var _shouldStopAnimation2 = _interopRequireDefault(shouldStopAnimation_1);

  var _react2 = _interopRequireDefault(react);

  var _propTypes2 = _interopRequireDefault(propTypes);

  var msPerFrame = 1000 / 60; // the children function & (potential) styles function asks as param an
  // Array<TransitionPlainStyle>, where each TransitionPlainStyle is of the format
  // {key: string, data?: any, style: PlainStyle}. However, the way we keep
  // internal states doesn't contain such a data structure (check the state and
  // TransitionMotionState). So when children function and others ask for such
  // data we need to generate them on the fly by combining mergedPropsStyles and
  // currentStyles/lastIdealStyles

  function rehydrateStyles(mergedPropsStyles, unreadPropStyles, plainStyles) {
    // Copy the value to a `const` so that Flow understands that the const won't
    // change and will be non-nullable in the callback below.
    var cUnreadPropStyles = unreadPropStyles;

    if (cUnreadPropStyles == null) {
      return mergedPropsStyles.map(function (mergedPropsStyle, i) {
        return {
          key: mergedPropsStyle.key,
          data: mergedPropsStyle.data,
          style: plainStyles[i]
        };
      });
    }

    return mergedPropsStyles.map(function (mergedPropsStyle, i) {
      for (var j = 0; j < cUnreadPropStyles.length; j++) {
        if (cUnreadPropStyles[j].key === mergedPropsStyle.key) {
          return {
            key: cUnreadPropStyles[j].key,
            data: cUnreadPropStyles[j].data,
            style: plainStyles[i]
          };
        }
      }

      return {
        key: mergedPropsStyle.key,
        data: mergedPropsStyle.data,
        style: plainStyles[i]
      };
    });
  }

  function shouldStopAnimationAll(currentStyles, destStyles, currentVelocities, mergedPropsStyles) {
    if (mergedPropsStyles.length !== destStyles.length) {
      return false;
    }

    for (var i = 0; i < mergedPropsStyles.length; i++) {
      if (mergedPropsStyles[i].key !== destStyles[i].key) {
        return false;
      }
    } // we have the invariant that mergedPropsStyles and
    // currentStyles/currentVelocities/last* are synced in terms of cells, see
    // mergeAndSync comment for more info


    for (var i = 0; i < mergedPropsStyles.length; i++) {
      if (!_shouldStopAnimation2['default'](currentStyles[i], destStyles[i].style, currentVelocities[i])) {
        return false;
      }
    }

    return true;
  } // core key merging logic
  // things to do: say previously merged style is {a, b}, dest style (prop) is {b,
  // c}, previous current (interpolating) style is {a, b}
  // **invariant**: current[i] corresponds to merged[i] in terms of key
  // steps:
  // turn merged style into {a?, b, c}
  //    add c, value of c is destStyles.c
  //    maybe remove a, aka call willLeave(a), then merged is either {b, c} or {a, b, c}
  // turn current (interpolating) style from {a, b} into {a?, b, c}
  //    maybe remove a
  //    certainly add c, value of c is willEnter(c)
  // loop over merged and construct new current
  // dest doesn't change, that's owner's


  function mergeAndSync(willEnter, willLeave, didLeave, oldMergedPropsStyles, destStyles, oldCurrentStyles, oldCurrentVelocities, oldLastIdealStyles, oldLastIdealVelocities) {
    var newMergedPropsStyles = _mergeDiff2['default'](oldMergedPropsStyles, destStyles, function (oldIndex, oldMergedPropsStyle) {
      var leavingStyle = willLeave(oldMergedPropsStyle);

      if (leavingStyle == null) {
        didLeave({
          key: oldMergedPropsStyle.key,
          data: oldMergedPropsStyle.data
        });
        return null;
      }

      if (_shouldStopAnimation2['default'](oldCurrentStyles[oldIndex], leavingStyle, oldCurrentVelocities[oldIndex])) {
        didLeave({
          key: oldMergedPropsStyle.key,
          data: oldMergedPropsStyle.data
        });
        return null;
      }

      return {
        key: oldMergedPropsStyle.key,
        data: oldMergedPropsStyle.data,
        style: leavingStyle
      };
    });

    var newCurrentStyles = [];
    var newCurrentVelocities = [];
    var newLastIdealStyles = [];
    var newLastIdealVelocities = [];

    for (var i = 0; i < newMergedPropsStyles.length; i++) {
      var newMergedPropsStyleCell = newMergedPropsStyles[i];
      var foundOldIndex = null;

      for (var j = 0; j < oldMergedPropsStyles.length; j++) {
        if (oldMergedPropsStyles[j].key === newMergedPropsStyleCell.key) {
          foundOldIndex = j;
          break;
        }
      } // TODO: key search code


      if (foundOldIndex == null) {
        var plainStyle = willEnter(newMergedPropsStyleCell);
        newCurrentStyles[i] = plainStyle;
        newLastIdealStyles[i] = plainStyle;

        var velocity = _mapToZero2['default'](newMergedPropsStyleCell.style);

        newCurrentVelocities[i] = velocity;
        newLastIdealVelocities[i] = velocity;
      } else {
        newCurrentStyles[i] = oldCurrentStyles[foundOldIndex];
        newLastIdealStyles[i] = oldLastIdealStyles[foundOldIndex];
        newCurrentVelocities[i] = oldCurrentVelocities[foundOldIndex];
        newLastIdealVelocities[i] = oldLastIdealVelocities[foundOldIndex];
      }
    }

    return [newMergedPropsStyles, newCurrentStyles, newCurrentVelocities, newLastIdealStyles, newLastIdealVelocities];
  }

  var TransitionMotion = function (_React$Component) {
    _inherits(TransitionMotion, _React$Component);

    _createClass(TransitionMotion, null, [{
      key: 'propTypes',
      value: {
        defaultStyles: _propTypes2['default'].arrayOf(_propTypes2['default'].shape({
          key: _propTypes2['default'].string.isRequired,
          data: _propTypes2['default'].any,
          style: _propTypes2['default'].objectOf(_propTypes2['default'].number).isRequired
        })),
        styles: _propTypes2['default'].oneOfType([_propTypes2['default'].func, _propTypes2['default'].arrayOf(_propTypes2['default'].shape({
          key: _propTypes2['default'].string.isRequired,
          data: _propTypes2['default'].any,
          style: _propTypes2['default'].objectOf(_propTypes2['default'].oneOfType([_propTypes2['default'].number, _propTypes2['default'].object])).isRequired
        }))]).isRequired,
        children: _propTypes2['default'].func.isRequired,
        willEnter: _propTypes2['default'].func,
        willLeave: _propTypes2['default'].func,
        didLeave: _propTypes2['default'].func
      },
      enumerable: true
    }, {
      key: 'defaultProps',
      value: {
        willEnter: function willEnter(styleThatEntered) {
          return _stripStyle2['default'](styleThatEntered.style);
        },
        // recall: returning null makes the current unmounting TransitionStyle
        // disappear immediately
        willLeave: function willLeave() {
          return null;
        },
        didLeave: function didLeave() {}
      },
      enumerable: true
    }]);

    function TransitionMotion(props) {
      var _this = this;

      _classCallCheck(this, TransitionMotion);

      _React$Component.call(this, props);

      this.unmounting = false;
      this.animationID = null;
      this.prevTime = 0;
      this.accumulatedTime = 0;
      this.unreadPropStyles = null;

      this.clearUnreadPropStyle = function (unreadPropStyles) {
        var _mergeAndSync = mergeAndSync(_this.props.willEnter, _this.props.willLeave, _this.props.didLeave, _this.state.mergedPropsStyles, unreadPropStyles, _this.state.currentStyles, _this.state.currentVelocities, _this.state.lastIdealStyles, _this.state.lastIdealVelocities);

        var mergedPropsStyles = _mergeAndSync[0];
        var currentStyles = _mergeAndSync[1];
        var currentVelocities = _mergeAndSync[2];
        var lastIdealStyles = _mergeAndSync[3];
        var lastIdealVelocities = _mergeAndSync[4];

        for (var i = 0; i < unreadPropStyles.length; i++) {
          var unreadPropStyle = unreadPropStyles[i].style;
          var dirty = false;

          for (var key in unreadPropStyle) {
            if (!Object.prototype.hasOwnProperty.call(unreadPropStyle, key)) {
              continue;
            }

            var styleValue = unreadPropStyle[key];

            if (typeof styleValue === 'number') {
              if (!dirty) {
                dirty = true;
                currentStyles[i] = _extends({}, currentStyles[i]);
                currentVelocities[i] = _extends({}, currentVelocities[i]);
                lastIdealStyles[i] = _extends({}, lastIdealStyles[i]);
                lastIdealVelocities[i] = _extends({}, lastIdealVelocities[i]);
                mergedPropsStyles[i] = {
                  key: mergedPropsStyles[i].key,
                  data: mergedPropsStyles[i].data,
                  style: _extends({}, mergedPropsStyles[i].style)
                };
              }

              currentStyles[i][key] = styleValue;
              currentVelocities[i][key] = 0;
              lastIdealStyles[i][key] = styleValue;
              lastIdealVelocities[i][key] = 0;
              mergedPropsStyles[i].style[key] = styleValue;
            }
          }
        } // unlike the other 2 components, we can't detect staleness and optionally
        // opt out of setState here. each style object's data might contain new
        // stuff we're not/cannot compare


        _this.setState({
          currentStyles: currentStyles,
          currentVelocities: currentVelocities,
          mergedPropsStyles: mergedPropsStyles,
          lastIdealStyles: lastIdealStyles,
          lastIdealVelocities: lastIdealVelocities
        });
      };

      this.startAnimationIfNecessary = function () {
        if (_this.unmounting) {
          return;
        } // TODO: when config is {a: 10} and dest is {a: 10} do we raf once and
        // call cb? No, otherwise accidental parent rerender causes cb trigger


        _this.animationID = _raf2['default'](function (timestamp) {
          // https://github.com/chenglou/react-motion/pull/420
          // > if execution passes the conditional if (this.unmounting), then
          // executes async defaultRaf and after that component unmounts and after
          // that the callback of defaultRaf is called, then setState will be called
          // on unmounted component.
          if (_this.unmounting) {
            return;
          }

          var propStyles = _this.props.styles;
          var destStyles = typeof propStyles === 'function' ? propStyles(rehydrateStyles(_this.state.mergedPropsStyles, _this.unreadPropStyles, _this.state.lastIdealStyles)) : propStyles; // check if we need to animate in the first place

          if (shouldStopAnimationAll(_this.state.currentStyles, destStyles, _this.state.currentVelocities, _this.state.mergedPropsStyles)) {
            // no need to cancel animationID here; shouldn't have any in flight
            _this.animationID = null;
            _this.accumulatedTime = 0;
            return;
          }

          var currentTime = timestamp || _performanceNow2['default']();

          var timeDelta = currentTime - _this.prevTime;
          _this.prevTime = currentTime;
          _this.accumulatedTime = _this.accumulatedTime + timeDelta; // more than 10 frames? prolly switched browser tab. Restart

          if (_this.accumulatedTime > msPerFrame * 10) {
            _this.accumulatedTime = 0;
          }

          if (_this.accumulatedTime === 0) {
            // no need to cancel animationID here; shouldn't have any in flight
            _this.animationID = null;

            _this.startAnimationIfNecessary();

            return;
          }

          var currentFrameCompletion = (_this.accumulatedTime - Math.floor(_this.accumulatedTime / msPerFrame) * msPerFrame) / msPerFrame;
          var framesToCatchUp = Math.floor(_this.accumulatedTime / msPerFrame);

          var _mergeAndSync2 = mergeAndSync(_this.props.willEnter, _this.props.willLeave, _this.props.didLeave, _this.state.mergedPropsStyles, destStyles, _this.state.currentStyles, _this.state.currentVelocities, _this.state.lastIdealStyles, _this.state.lastIdealVelocities);

          var newMergedPropsStyles = _mergeAndSync2[0];
          var newCurrentStyles = _mergeAndSync2[1];
          var newCurrentVelocities = _mergeAndSync2[2];
          var newLastIdealStyles = _mergeAndSync2[3];
          var newLastIdealVelocities = _mergeAndSync2[4];

          for (var i = 0; i < newMergedPropsStyles.length; i++) {
            var newMergedPropsStyle = newMergedPropsStyles[i].style;
            var newCurrentStyle = {};
            var newCurrentVelocity = {};
            var newLastIdealStyle = {};
            var newLastIdealVelocity = {};

            for (var key in newMergedPropsStyle) {
              if (!Object.prototype.hasOwnProperty.call(newMergedPropsStyle, key)) {
                continue;
              }

              var styleValue = newMergedPropsStyle[key];

              if (typeof styleValue === 'number') {
                newCurrentStyle[key] = styleValue;
                newCurrentVelocity[key] = 0;
                newLastIdealStyle[key] = styleValue;
                newLastIdealVelocity[key] = 0;
              } else {
                var newLastIdealStyleValue = newLastIdealStyles[i][key];
                var newLastIdealVelocityValue = newLastIdealVelocities[i][key];

                for (var j = 0; j < framesToCatchUp; j++) {
                  var _stepper = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

                  newLastIdealStyleValue = _stepper[0];
                  newLastIdealVelocityValue = _stepper[1];
                }

                var _stepper2 = _stepper4['default'](msPerFrame / 1000, newLastIdealStyleValue, newLastIdealVelocityValue, styleValue.val, styleValue.stiffness, styleValue.damping, styleValue.precision);

                var nextIdealX = _stepper2[0];
                var nextIdealV = _stepper2[1];
                newCurrentStyle[key] = newLastIdealStyleValue + (nextIdealX - newLastIdealStyleValue) * currentFrameCompletion;
                newCurrentVelocity[key] = newLastIdealVelocityValue + (nextIdealV - newLastIdealVelocityValue) * currentFrameCompletion;
                newLastIdealStyle[key] = newLastIdealStyleValue;
                newLastIdealVelocity[key] = newLastIdealVelocityValue;
              }
            }

            newLastIdealStyles[i] = newLastIdealStyle;
            newLastIdealVelocities[i] = newLastIdealVelocity;
            newCurrentStyles[i] = newCurrentStyle;
            newCurrentVelocities[i] = newCurrentVelocity;
          }

          _this.animationID = null; // the amount we're looped over above

          _this.accumulatedTime -= framesToCatchUp * msPerFrame;

          _this.setState({
            currentStyles: newCurrentStyles,
            currentVelocities: newCurrentVelocities,
            lastIdealStyles: newLastIdealStyles,
            lastIdealVelocities: newLastIdealVelocities,
            mergedPropsStyles: newMergedPropsStyles
          });

          _this.unreadPropStyles = null;

          _this.startAnimationIfNecessary();
        });
      };

      this.state = this.defaultState();
    }

    TransitionMotion.prototype.defaultState = function defaultState() {
      var _props = this.props;
      var defaultStyles = _props.defaultStyles;
      var styles = _props.styles;
      var willEnter = _props.willEnter;
      var willLeave = _props.willLeave;
      var didLeave = _props.didLeave;
      var destStyles = typeof styles === 'function' ? styles(defaultStyles) : styles; // this is special. for the first time around, we don't have a comparison
      // between last (no last) and current merged props. we'll compute last so:
      // say default is {a, b} and styles (dest style) is {b, c}, we'll
      // fabricate last as {a, b}

      var oldMergedPropsStyles = undefined;

      if (defaultStyles == null) {
        oldMergedPropsStyles = destStyles;
      } else {
        oldMergedPropsStyles = defaultStyles.map(function (defaultStyleCell) {
          // TODO: key search code
          for (var i = 0; i < destStyles.length; i++) {
            if (destStyles[i].key === defaultStyleCell.key) {
              return destStyles[i];
            }
          }

          return defaultStyleCell;
        });
      }

      var oldCurrentStyles = defaultStyles == null ? destStyles.map(function (s) {
        return _stripStyle2['default'](s.style);
      }) : defaultStyles.map(function (s) {
        return _stripStyle2['default'](s.style);
      });
      var oldCurrentVelocities = defaultStyles == null ? destStyles.map(function (s) {
        return _mapToZero2['default'](s.style);
      }) : defaultStyles.map(function (s) {
        return _mapToZero2['default'](s.style);
      });

      var _mergeAndSync3 = mergeAndSync( // Because this is an old-style createReactClass component, Flow doesn't
      // understand that the willEnter and willLeave props have default values
      // and will always be present.
      willEnter, willLeave, didLeave, oldMergedPropsStyles, destStyles, oldCurrentStyles, oldCurrentVelocities, oldCurrentStyles, // oldLastIdealStyles really
      oldCurrentVelocities);

      var mergedPropsStyles = _mergeAndSync3[0];
      var currentStyles = _mergeAndSync3[1];
      var currentVelocities = _mergeAndSync3[2];
      var lastIdealStyles = _mergeAndSync3[3];
      var lastIdealVelocities = _mergeAndSync3[4]; // oldLastIdealVelocities really

      return {
        currentStyles: currentStyles,
        currentVelocities: currentVelocities,
        lastIdealStyles: lastIdealStyles,
        lastIdealVelocities: lastIdealVelocities,
        mergedPropsStyles: mergedPropsStyles
      };
    }; // after checking for unreadPropStyles != null, we manually go set the
    // non-interpolating values (those that are a number, without a spring
    // config)


    TransitionMotion.prototype.componentDidMount = function componentDidMount() {
      this.prevTime = _performanceNow2['default']();
      this.startAnimationIfNecessary();
    };

    TransitionMotion.prototype.componentWillReceiveProps = function componentWillReceiveProps(props) {
      if (this.unreadPropStyles) {
        // previous props haven't had the chance to be set yet; set them here
        this.clearUnreadPropStyle(this.unreadPropStyles);
      }

      var styles = props.styles;

      if (typeof styles === 'function') {
        this.unreadPropStyles = styles(rehydrateStyles(this.state.mergedPropsStyles, this.unreadPropStyles, this.state.lastIdealStyles));
      } else {
        this.unreadPropStyles = styles;
      }

      if (this.animationID == null) {
        this.prevTime = _performanceNow2['default']();
        this.startAnimationIfNecessary();
      }
    };

    TransitionMotion.prototype.componentWillUnmount = function componentWillUnmount() {
      this.unmounting = true;

      if (this.animationID != null) {
        _raf2['default'].cancel(this.animationID);

        this.animationID = null;
      }
    };

    TransitionMotion.prototype.render = function render() {
      var hydratedStyles = rehydrateStyles(this.state.mergedPropsStyles, this.unreadPropStyles, this.state.currentStyles);
      var renderedChildren = this.props.children(hydratedStyles);
      return renderedChildren && _react2['default'].Children.only(renderedChildren);
    };

    return TransitionMotion;
  }(_react2['default'].Component);

  exports['default'] = TransitionMotion;
  module.exports = exports['default']; // list of styles, each containing interpolating values. Part of what's passed
  // to children function. Notice that this is
  // Array<ActualInterpolatingStyleObject>, without the wrapper that is {key: ...,
  // data: ... style: ActualInterpolatingStyleObject}. Only mergedPropsStyles
  // contains the key & data info (so that we only have a single source of truth
  // for these, and to save space). Check the comment for `rehydrateStyles` to
  // see how we regenerate the entirety of what's passed to children function
  // the array that keeps track of currently rendered stuff! Including stuff
  // that you've unmounted but that's still animating. This is where it lives
  // it's possible that currentStyle's value is stale: if props is immediately
  // changed from 0 to 400 to spring(0) again, the async currentStyle is still
  // at 0 (didn't have time to tick and interpolate even once). If we naively
  // compare currentStyle with destVal it'll be 0 === 0 (no animation, stop).
  // In reality currentStyle should be 400
});
unwrapExports(TransitionMotion_1);
var presets = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;
  exports["default"] = {
    noWobble: {
      stiffness: 170,
      damping: 26
    },
    // the default, if nothing provided
    gentle: {
      stiffness: 120,
      damping: 14
    },
    wobbly: {
      stiffness: 180,
      damping: 12
    },
    stiff: {
      stiffness: 210,
      damping: 20
    }
  };
  module.exports = exports["default"];
});
unwrapExports(presets);
var spring_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;

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

  exports['default'] = spring;

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      'default': obj
    };
  }

  var _presets2 = _interopRequireDefault(presets);

  var defaultConfig = _extends({}, _presets2['default'].noWobble, {
    precision: 0.01
  });

  function spring(val, config) {
    return _extends({}, defaultConfig, config, {
      val: val
    });
  }

  module.exports = exports['default'];
});
unwrapExports(spring_1);
var reorderKeys_1 = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;
  exports['default'] = reorderKeys;
  var hasWarned = false;

  function reorderKeys() {
    {
      if (!hasWarned) {
        hasWarned = true;
        console.error('`reorderKeys` has been removed, since it is no longer needed for TransitionMotion\'s new styles array API.');
      }
    }
  }

  module.exports = exports['default'];
});
unwrapExports(reorderKeys_1);
var reactMotion = createCommonjsModule(function (module, exports) {
  exports.__esModule = true;

  function _interopRequire(obj) {
    return obj && obj.__esModule ? obj['default'] : obj;
  }

  exports.Motion = _interopRequire(Motion_1);
  exports.StaggeredMotion = _interopRequire(StaggeredMotion_1);
  exports.TransitionMotion = _interopRequire(TransitionMotion_1);
  exports.spring = _interopRequire(spring_1);
  exports.presets = _interopRequire(presets);
  exports.stripStyle = _interopRequire(stripStyle_1); // deprecated, dummy warning function

  exports.reorderKeys = _interopRequire(reorderKeys_1);
});
var reactMotion$1 = unwrapExports(reactMotion);
var reactMotion_1 = reactMotion.Motion;
var reactMotion_2 = reactMotion.StaggeredMotion;
var reactMotion_3 = reactMotion.TransitionMotion;
var reactMotion_4 = reactMotion.spring;
var reactMotion_5 = reactMotion.presets;
var reactMotion_6 = reactMotion.stripStyle;
var reactMotion_7 = reactMotion.reorderKeys;
export default reactMotion$1;
export { reactMotion_1 as Motion, reactMotion_2 as StaggeredMotion, reactMotion_3 as TransitionMotion, reactMotion_5 as presets, reactMotion_7 as reorderKeys, reactMotion_4 as spring, reactMotion_6 as stripStyle };