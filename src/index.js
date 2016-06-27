import * as utils from './utils';
import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';
import YAML from 'js-yaml';

function getDefaults() {
  return {
    loadPath: '/locales/{{lng}}/{{ns}}.json',
    addPath: '/locales/{{lng}}/{{ns}}.missing.json',
    jsonIndent: 2
  };
}

function readFile(filename, callback) {
  fs.readFile(filename, 'utf8', function(err, data) {
    if (err) {
      callback(err);
    } else {
      let result;
      try {
        data = data.replace(/^\uFEFF/, '');
        switch(path.extname(filename)) {
          case '.json5':
            result = JSON5.parse(data);
            break;
          case '.yml':
            result = YAML.safeLoad(data, { json: true });
            break;
          default:
            result = JSON.parse(data);
        }
      } catch (err) {
        err.message = 'error parsing ' + filename + ': ' + err.message;
        return callback(err);
      }
      callback(null, result);
    }
  });
}

class Backend {
  constructor(services, options = {}) {
    this.init(services, options);

    this.type = 'backend';
  }

  init(services, options = {}, coreOptions = {}) {
    this.services = services;
    this.options = this.options || {};
    this.options = {...getDefaults(), ...this.options, ...options};
    this.coreOptions = coreOptions;
    this.queuedWrites = {};

    this.debouncedWrite = utils.debounce(this.write, 250);
  }

  read(language, namespace, callback) {
    let filename = this.services.interpolator.interpolate(this.options.loadPath, { lng: language, ns: namespace });

    readFile(filename, (err, resources) => {
      if (err) return callback(err, false); // no retry
      callback(null, resources);
    });
  }

  create(languages, namespace, key, fallbackValue, callback) {
    if (!callback) callback = () => {};
    if (typeof languages === 'string') languages = [languages];

    let todo = languages.length;
    function done() {
      if (!--todo) callback && callback();
    }

    languages.forEach(lng => {
      this.queue.call(this, lng, namespace, key, fallbackValue, done);
    });
  }

  // write queue
  write() {
    for (let lng in this.queuedWrites) {
      const namespaces = this.queuedWrites[lng];
      if (lng !== 'locks') {
        for (let ns in namespaces) {
          this.writeFile(lng, ns);
        }
      }
    }
  }

  writeFile(lng, namespace) {
    let lock = utils.getPath(this.queuedWrites, ['locks', lng, namespace]);
    if (lock) return;

    let filename = this.services.interpolator.interpolate(this.options.addPath, { lng: lng, ns: namespace });

    let missings = utils.getPath(this.queuedWrites, [lng, namespace]);
    utils.setPath(this.queuedWrites, [lng, namespace], []);

    if (missings.length) {
      // lock
      utils.setPath(this.queuedWrites, ['locks', lng, namespace], true);

      readFile(filename, (err, resources) => {
        if (err) resources = {};

        missings.forEach((missing) => {
          utils.setPath(resources, missing.key.split(this.coreOptions.keySeparator || '.'), missing.fallbackValue);
        });

        fs.writeFile(filename, JSON.stringify(resources, null, this.options.jsonIndent), (err) => {
          // unlock
          utils.setPath(this.queuedWrites, ['locks', lng, namespace], false);

          missings.forEach((missing) => {
            if (missing.callback) missing.callback();
          });

          // rerun
          this.debouncedWrite();
        });
      });
    }
  }

  queue(lng, namespace, key, fallbackValue, callback) {
    utils.pushPath(this.queuedWrites, [lng, namespace], {key: key, fallbackValue: fallbackValue || '', callback: callback});

    this.debouncedWrite();
  }

}

Backend.type = 'backend';


export default Backend;
