'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

var _utils = require('./utils');

var utils = _interopRequireWildcard(_utils);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

var _json5 = require('json5');

var _json52 = _interopRequireDefault(_json5);

function getDefaults() {
  return {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    addPath: '/locales/{{lng}}/{{ns}}.missing.json',
    jsonIndent: 2
  };
}

function readFile(filename, callback) {
  _fs2['default'].readFile(filename, 'utf8', function (err, data) {
    if (err) {
      callback(err);
    } else {
      var result = undefined;
      try {
        result = _path2['default'].extname(filename) === '.json5' ? _json52['default'].parse(data.replace(/^\uFEFF/, '')) : JSON.parse(data.replace(/^\uFEFF/, '')); // strip byte-order mark
      } catch (err) {
        err.message = 'error parsing ' + filename + ': ' + err.message;
        return callback(err);
      }
      callback(null, result);
    }
  });
}

var Backend = (function () {
  function Backend(services) {
    var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];

    _classCallCheck(this, Backend);

    this.init(services, options);

    this.type = 'backend';
  }

  _createClass(Backend, [{
    key: 'init',
    value: function init(services) {
      var options = arguments.length <= 1 || arguments[1] === undefined ? {} : arguments[1];
      var coreOptions = arguments.length <= 2 || arguments[2] === undefined ? {} : arguments[2];

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
      var filename = this.services.interpolator.interpolate(this.options.loadPath, { lng: language, ns: namespace });

      readFile(filename, function (err, resources) {
        if (err) return callback(err, false); // no retry
        callback(null, resources);
      });
    }
  }, {
    key: 'create',
    value: function create(languages, namespace, key, fallbackValue, callback) {
      var _this = this,
          _arguments = arguments;

      if (!callback) callback = function () {};
      if (typeof languages === 'string') languages = [languages];

      languages.forEach(function (lng) {
        _this.queue.apply(_this, _arguments);
      });
    }

    // write queue

  }, {
    key: 'write',
    value: function write(lng, namespace) {
      var _this2 = this;

      var lock = utils.getPath(this.queuedWrites, ['locks', lng, namespace]);
      if (lock) return;

      var filename = this.services.interpolator.interpolate(this.options.addPath, { lng: lng, ns: namespace });

      var missings = utils.getPath(this.queuedWrites, [lng, namespace]);
      utils.setPath(this.queuedWrites, [lng, namespace], []);

      if (missings.length) {
        // lock
        utils.setPath(this.queuedWrites, ['locks', lng, namespace], true);

        readFile(filename, function (err, resources) {
          if (err) resources = {};

          missings.forEach(function (missing) {
            utils.setPath(resources, missing.key.split(_this2.coreOptions.keySeparator || '.'), missing.fallbackValue);
          });

          _fs2['default'].writeFile(filename, JSON.stringify(resources, null, _this2.options.jsonIndent), function (err) {
            // unlock
            utils.setPath(_this2.queuedWrites, ['locks', lng, namespace], false);

            missings.forEach(function (missing) {
              if (missing.callback) missing.callback();
            });

            // rerun
            _this2.debouncedWrite(lng, namespace);
          });
        });
      }
    }
  }, {
    key: 'queue',
    value: function queue(lng, namespace, key, fallbackValue, callback) {
      utils.pushPath(this.queuedWrites, [lng, namespace], { key: key, fallbackValue: fallbackValue || '', callback: callback });

      this.debouncedWrite(lng, namespace);
    }
  }]);

  return Backend;
})();

Backend.type = 'backend';

exports['default'] = Backend;
module.exports = exports['default'];