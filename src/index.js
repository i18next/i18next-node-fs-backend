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
    this.options = utils.defaults(options, this.options || {}, getDefaults());
    this.coreOptions = coreOptions;
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

    let payload = {};
    payload[key] = fallbackValue || '';

    languages.forEach(lng => {
      let filename = this.services.interpolator.interpolate(this.options.addPath, { lng: lng, ns: namespace });

      readFile(filename, (err, resources) => {
        if (err) resources = {};

        utils.setPath(resources, key.split['.'], fallbackValue); // TODO: use this.coreOptions.keySeparator;

        fs.writeFile(filename, JSON.stringify(resources, null, this.options.jsonIndent), callback);
      });
    });
  }

}

Backend.type = 'backend';


export default Backend;
