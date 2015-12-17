import * as utils from './utils';
import fs from 'fs';
import path from 'path';
import JSON5 from 'json5';

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
        result = path.extname(filename) === '.json5' ?
          JSON5.parse(data.replace(/^\uFEFF/, '')) :
          JSON.parse(data.replace(/^\uFEFF/, '')); // strip byte-order mark
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

    languages.forEach(lng => {
      this.queue.apply(this, arguments);
    });
  }

  // write queue

  write(lng, namespace) {
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
          this.debouncedWrite(lng, namespace);
        });
      });
    }
  }

  queue(lng, namespace, key, fallbackValue, callback) {
    utils.pushPath(this.queuedWrites, [lng, namespace], {key: key, fallbackValue: fallbackValue || '', callback: callback});

    this.debouncedWrite(lng, namespace);
  }

}

Backend.type = 'backend';


export default Backend;
