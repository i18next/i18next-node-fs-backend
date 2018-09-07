'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _json = require('json5');

var _json2 = _interopRequireDefault(_json);

var _jsYaml = require('js-yaml');

var _jsYaml2 = _interopRequireDefault(_jsYaml);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function getDefaults() {
  return {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    addPath: '/locales/{{lng}}/{{ns}}.missing.json',
    jsonIndent: 2,
    parse: JSON.parse
  };
}

function readFile(filename, options, callback) {
  var extension = _path2.default.extname(filename);
  var result = void 0;

  if (/^\.(js|ts)$/.test(extension)) {
    try {
      var file = require(filename);
      result = file.default ? file.default : file;

      if ((typeof result === 'undefined' ? 'undefined' : _typeof(result)) !== 'object') {
        return callback(new Error('A resource file must export an object.'));
      }

      callback(null, result);
    } catch (err) {
      callback(err);
    }
  } else {
    _fs2.default.readFile(filename, 'utf8', function (err, data) {
      if (err) {
        callback(err);
      } else {
        try {
          data = data.replace(/^\uFEFF/, '');
          switch (extension) {
            case '.json5':
              result = _json2.default.parse(data);
              break;
            case '.yml':
            case '.yaml':
              result = _jsYaml2.default.safeLoad(data);
              break;
            default:
              result = options.parse(data);
          }
        } catch (err) {
          err.message = 'error parsing ' + filename + ': ' + err.message;
          return callback(err);
        }
        callback(null, result);
      }
    });
  }
}

var Backend = function () {
  function Backend(services) {
    var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

    _classCallCheck(this, Backend);

    this.init(services, options);

    this.type = 'backend';
  }

  _createClass(Backend, [{
    key: 'init',
    value: function init(services) {
      var options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      var coreOptions = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

      this.services = services;
      this.options = this.options || {};
      this.options = _extends({}, getDefaults(), this.options, options);
      this.coreOptions = coreOptions;
      this.queuedWrites = {};

      this.debouncedWrite = utils.debounce(this.write, 250);
    }
  }, {
    key: 'read',
    value: function read(language, namespace, callback) {
      var loadPath = this.options.loadPath;
      if (typeof this.options.loadPath === 'function') {
        loadPath = this.options.loadPath(language, namespace);
      }

      var filename = this.services.interpolator.interpolate(loadPath, { lng: language, ns: namespace });

      readFile(filename, this.options, function (err, resources) {
        if (err) return callback(err, false); // no retry
        callback(null, resources);
      });
    }
  }, {
    key: 'create',
    value: function create(languages, namespace, key, fallbackValue, callback) {
      var _this = this;

      if (!callback) callback = function callback() {};
      if (typeof languages === 'string') languages = [languages];

      var todo = languages.length;
      function done() {
        if (! --todo) callback && callback();
      }

      languages.forEach(function (lng) {
        _this.queue.call(_this, lng, namespace, key, fallbackValue, done);
      });
    }

    // write queue

  }, {
    key: 'write',
    value: function write() {
      for (var lng in this.queuedWrites) {
        var namespaces = this.queuedWrites[lng];
        if (lng !== 'locks') {
          for (var ns in namespaces) {
            this.writeFile(lng, ns);
          }
        }
      }
    }
  }, {
    key: 'writeFile',
    value: function writeFile(lng, namespace) {
      var _this2 = this;

      var lock = utils.getPath(this.queuedWrites, ['locks', lng, namespace]);
      if (lock) return;

      var addPath = this.options.addPath;
      if (typeof this.options.addPath === 'function') {
        addPath = this.options.addPath(language, namespace);
      }

      var filename = this.services.interpolator.interpolate(addPath, { lng: lng, ns: namespace });

      var missings = utils.getPath(this.queuedWrites, [lng, namespace]);
      utils.setPath(this.queuedWrites, [lng, namespace], []);

      if (missings.length) {
        // lock
        utils.setPath(this.queuedWrites, ['locks', lng, namespace], true);

        readFile(filename, this.options, function (err, resources) {
          if (err) resources = {};

          missings.forEach(function (missing) {
            var path = _this2.coreOptions.keySeparator === false ? [missing.key] : missing.key.split(_this2.coreOptions.keySeparator || '.');
            utils.setPath(resources, path, missing.fallbackValue);
          });

          _fs2.default.writeFile(filename, JSON.stringify(resources, null, _this2.options.jsonIndent), function (err) {
            // unlock
            utils.setPath(_this2.queuedWrites, ['locks', lng, namespace], false);

            missings.forEach(function (missing) {
              if (missing.callback) missing.callback();
            });

            // rerun
            _this2.debouncedWrite();
          });
        });
      }
    }
  }, {
    key: 'queue',
    value: function queue(lng, namespace, key, fallbackValue, callback) {
      utils.pushPath(this.queuedWrites, [lng, namespace], { key: key, fallbackValue: fallbackValue || '', callback: callback });

      this.debouncedWrite();
    }
  }]);

  return Backend;
}();

Backend.type = 'backend';

exports.default = Backend;