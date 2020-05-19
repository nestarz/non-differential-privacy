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

var SpeechRecognition = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });

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

  var _propTypes2 = _interopRequireDefault(propTypes);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var propTypes$1 = {
    children: _propTypes2.default.func.isRequired,
    onEnd: _propTypes2.default.func,
    onResult: _propTypes2.default.func,
    onError: _propTypes2.default.func
  };
  var defaultProps = {
    onEnd: function onEnd() {},
    onResult: function onResult() {},
    onError: function onError() {}
  };
  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  var SpeechRekognition = function SpeechRekognition(props) {
    var recognition = (0, react.useRef)(null);

    var _useState = (0, react.useState)(false),
        _useState2 = _slicedToArray(_useState, 2),
        listening = _useState2[0],
        setListening = _useState2[1];

    var supported = !!window.SpeechRecognition;
    var children = props.children,
        onEnd = props.onEnd,
        onResult = props.onResult,
        onError = props.onError;

    var processResult = function processResult(event) {
      var transcript = Array.from(event.results).map(function (result) {
        return result[0];
      }).map(function (result) {
        return result.transcript;
      }).join('');
      onResult(transcript);
    };

    var handleError = function handleError(event) {
      if (event.error === 'not-allowed') {
        recognition.current.onend = function () {};

        setListening(false);
      }

      onError(event);
    };

    var listen = function listen() {
      var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      if (listening) return;
      var _args$lang = args.lang,
          lang = _args$lang === undefined ? '' : _args$lang,
          _args$interimResults = args.interimResults,
          interimResults = _args$interimResults === undefined ? true : _args$interimResults;
      setListening(true);
      recognition.current.lang = lang;
      recognition.current.interimResults = interimResults;
      recognition.current.onresult = processResult;
      recognition.current.onerror = handleError; // SpeechRecognition stops automatically after inactivity
      // We want it to keep going until we tell it to stop

      recognition.current.onend = function () {
        return recognition.current.start();
      };

      recognition.current.start();
    };

    var stop = function stop() {
      if (!listening) return;
      setListening(false);

      recognition.current.onend = function () {};

      recognition.current.stop();
      onEnd();
    };

    (0, react.useEffect)(function () {
      if (!supported) return;
      recognition.current = new window.SpeechRecognition();
    }, []);
    return children({
      listen: listen,
      listening: listening,
      stop: stop,
      supported: supported
    });
  };

  SpeechRekognition.propTypes = propTypes$1;
  SpeechRekognition.defaultProps = defaultProps;
  exports.default = (0, react.memo)(SpeechRekognition);
});
unwrapExports(SpeechRecognition);
var SpeechSynthesis_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });

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

  var _propTypes2 = _interopRequireDefault(propTypes);

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }

  var propTypes$1 = {
    children: _propTypes2.default.func.isRequired,
    onEnd: _propTypes2.default.func
  };
  var defaultProps = {
    onEnd: function onEnd() {}
  };

  var SpeechSynthesis = function SpeechSynthesis(props) {
    var onEnd = props.onEnd,
        children = props.children;

    var _useState = (0, react.useState)([]),
        _useState2 = _slicedToArray(_useState, 2),
        voices = _useState2[0],
        setVoices = _useState2[1];

    var _useState3 = (0, react.useState)(false),
        _useState4 = _slicedToArray(_useState3, 2),
        speaking = _useState4[0],
        setSpeaking = _useState4[1];

    var supported = !!window.speechSynthesis;

    var processVoices = function processVoices(voiceOptions) {
      setVoices(voiceOptions);
    };

    var getVoices = function getVoices() {
      // Firefox seems to have voices upfront and never calls the
      // voiceschanged event
      var voiceOptions = window.speechSynthesis.getVoices();

      if (voiceOptions.length > 0) {
        processVoices(voiceOptions);
        return;
      }

      window.speechSynthesis.onvoiceschanged = function (event) {
        voiceOptions = event.target.getVoices();
        processVoices(voiceOptions);
      };
    };

    var handleEnd = function handleEnd() {
      setSpeaking(false);
      onEnd();
    };

    (0, react.useEffect)(function () {
      if (supported) {
        getVoices();
      }
    }, []);

    var speak = function speak() {
      var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _args$voice = args.voice,
          voice = _args$voice === undefined ? null : _args$voice,
          _args$text = args.text,
          text = _args$text === undefined ? '' : _args$text,
          _args$rate = args.rate,
          rate = _args$rate === undefined ? 1 : _args$rate,
          _args$pitch = args.pitch,
          pitch = _args$pitch === undefined ? 1 : _args$pitch;
      setSpeaking(true); // Firefox won't repeat an utterance that has been
      // spoken, so we need to create a new instance each time

      var utterance = new window.SpeechSynthesisUtterance();
      utterance.text = text;
      utterance.voice = voice;
      utterance.onend = handleEnd;
      utterance.rate = rate;
      utterance.pitch = pitch;
      window.speechSynthesis.speak(utterance);
    };

    var cancel = function cancel() {
      setSpeaking(false);
      window.speechSynthesis.cancel();
    };

    return children({
      supported: supported,
      speak: speak,
      speaking: speaking,
      cancel: cancel,
      voices: voices
    });
  };

  SpeechSynthesis.propTypes = propTypes$1;
  SpeechSynthesis.defaultProps = defaultProps;
  exports.default = (0, react.memo)(SpeechSynthesis);
});
unwrapExports(SpeechSynthesis_1);
var useSpeechRecognition_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });

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

  window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  var useSpeechRecognition = function useSpeechRecognition() {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var _props$onEnd = props.onEnd,
        onEnd = _props$onEnd === undefined ? function () {} : _props$onEnd,
        _props$onResult = props.onResult,
        onResult = _props$onResult === undefined ? function () {} : _props$onResult,
        _props$onError = props.onError,
        onError = _props$onError === undefined ? function () {} : _props$onError;
    var recognition = (0, react.useRef)(null);

    var _useState = (0, react.useState)(false),
        _useState2 = _slicedToArray(_useState, 2),
        listening = _useState2[0],
        setListening = _useState2[1];

    var supported = !!window.SpeechRecognition;

    var processResult = function processResult(event) {
      var transcript = Array.from(event.results).map(function (result) {
        return result[0];
      }).map(function (result) {
        return result.transcript;
      }).join('');
      onResult(transcript);
    };

    var handleError = function handleError(event) {
      if (event.error === 'not-allowed') {
        recognition.current.onend = function () {};

        setListening(false);
      }

      onError(event);
    };

    var listen = function listen() {
      var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      if (listening) return;
      var _args$lang = args.lang,
          lang = _args$lang === undefined ? '' : _args$lang,
          _args$interimResults = args.interimResults,
          interimResults = _args$interimResults === undefined ? true : _args$interimResults,
          _args$continuous = args.continuous,
          continuous = _args$continuous === undefined ? false : _args$continuous,
          _args$maxAlternatives = args.maxAlternatives,
          maxAlternatives = _args$maxAlternatives === undefined ? 1 : _args$maxAlternatives,
          grammars = args.grammars;
      setListening(true);
      recognition.current.lang = lang;
      recognition.current.interimResults = interimResults;
      recognition.current.onresult = processResult;
      recognition.current.onerror = handleError;
      recognition.current.continuous = continuous;
      recognition.current.maxAlternatives = maxAlternatives;

      if (grammars) {
        recognition.current.grammars = grammars;
      } // SpeechRecognition stops automatically after inactivity
      // We want it to keep going until we tell it to stop


      recognition.current.onend = function () {
        return recognition.current.start();
      };

      recognition.current.start();
    };

    var stop = function stop() {
      if (!listening) return;

      recognition.current.onresult = function () {};

      recognition.current.onend = function () {};

      recognition.current.onerror = function () {};

      setListening(false);
      recognition.current.stop();
      onEnd();
    };

    (0, react.useEffect)(function () {
      if (!supported) return;
      recognition.current = new window.SpeechRecognition();
    }, []);
    return {
      listen: listen,
      listening: listening,
      stop: stop,
      supported: supported
    };
  };

  exports.default = useSpeechRecognition;
});
unwrapExports(useSpeechRecognition_1);
var useSpeechSynthesis_1 = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });

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

  var useSpeechSynthesis = function useSpeechSynthesis() {
    var props = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
    var _props$onEnd = props.onEnd,
        onEnd = _props$onEnd === undefined ? function () {} : _props$onEnd;

    var _useState = (0, react.useState)([]),
        _useState2 = _slicedToArray(_useState, 2),
        voices = _useState2[0],
        setVoices = _useState2[1];

    var _useState3 = (0, react.useState)(false),
        _useState4 = _slicedToArray(_useState3, 2),
        speaking = _useState4[0],
        setSpeaking = _useState4[1];

    var supported = !!window.speechSynthesis;

    var processVoices = function processVoices(voiceOptions) {
      setVoices(voiceOptions);
    };

    var getVoices = function getVoices() {
      // Firefox seems to have voices upfront and never calls the
      // voiceschanged event
      var voiceOptions = window.speechSynthesis.getVoices();

      if (voiceOptions.length > 0) {
        processVoices(voiceOptions);
        return;
      }

      window.speechSynthesis.onvoiceschanged = function (event) {
        voiceOptions = event.target.getVoices();
        processVoices(voiceOptions);
      };
    };

    var handleEnd = function handleEnd() {
      setSpeaking(false);
      onEnd();
    };

    (0, react.useEffect)(function () {
      if (supported) {
        getVoices();
      }
    }, []);

    var speak = function speak() {
      var args = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};
      var _args$voice = args.voice,
          voice = _args$voice === undefined ? null : _args$voice,
          _args$text = args.text,
          text = _args$text === undefined ? '' : _args$text,
          _args$rate = args.rate,
          rate = _args$rate === undefined ? 1 : _args$rate,
          _args$pitch = args.pitch,
          pitch = _args$pitch === undefined ? 1 : _args$pitch;
      setSpeaking(true); // Firefox won't repeat an utterance that has been
      // spoken, so we need to create a new instance each time

      var utterance = new window.SpeechSynthesisUtterance();
      utterance.text = text;
      utterance.voice = voice;
      utterance.onend = handleEnd;
      utterance.rate = rate;
      utterance.pitch = pitch;
      window.speechSynthesis.speak(utterance);
    };

    var cancel = function cancel() {
      setSpeaking(false);
      window.speechSynthesis.cancel();
    };

    return {
      supported: supported,
      speak: speak,
      speaking: speaking,
      cancel: cancel,
      voices: voices
    };
  };

  exports.default = useSpeechSynthesis;
});
unwrapExports(useSpeechSynthesis_1);
var dist = createCommonjsModule(function (module, exports) {
  Object.defineProperty(exports, "__esModule", {
    value: true
  });
  Object.defineProperty(exports, 'SpeechRecognition', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(SpeechRecognition).default;
    }
  });
  Object.defineProperty(exports, 'SpeechSynthesis', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(SpeechSynthesis_1).default;
    }
  });
  Object.defineProperty(exports, 'useSpeechRecognition', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(useSpeechRecognition_1).default;
    }
  });
  Object.defineProperty(exports, 'useSpeechSynthesis', {
    enumerable: true,
    get: function get() {
      return _interopRequireDefault(useSpeechSynthesis_1).default;
    }
  });

  function _interopRequireDefault(obj) {
    return obj && obj.__esModule ? obj : {
      default: obj
    };
  }
});
var index = unwrapExports(dist);
export default index;