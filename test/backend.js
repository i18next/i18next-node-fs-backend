var mockery = require('mockery');
var expect = require('chai').expect;
var path = require('path');

var Interpolator = require('i18next/dist/commonjs/Interpolator').default;

var test3Save = 0;
var test4Save = 0;

var fsMock = {
  readFile: function (path, encoding, cb) {
    if (path.indexOf('test.json') > -1) return cb(null, '{"key": "passing"}');
    if (path.indexOf('test3.missing.json') > -1 && test3Save > 0) return cb(null, JSON.stringify({ key1: '1', key2: '2' }, null, 2));

    cb(null, '{}');
  },

  writeFile: function(path, data, cb) {
    if (path.indexOf('test.missing.json') > -1) {
      expect(data).to.be.eql(JSON.stringify({some: { key: 'myDefault' }}, null, 2));
    }
    else if (path.indexOf('test2.missing.json') > -1) {
      expect(data).to.be.eql(JSON.stringify({ key1: '1', key2: '2', key3: '3', key4: '4' }, null, 2));
    }
    else if (path.indexOf('test3.missing.json') > -1 && test3Save === 0) {
      test3Save = test3Save + 1;
      expect(data).to.be.eql(JSON.stringify({ key1: '1', key2: '2' }, null, 2));
    }
    else if (path.indexOf('test3.missing.json') > -1 && test3Save > 0) {
      expect(data).to.be.eql(JSON.stringify({ key1: '1', key2: '2', key3: '3', key4: '4' }, null, 2));
    }
    else if (path.indexOf('test4.missing.json') > -1) {
      test4Save = test4Save + 1;
      expect(data).to.be.eql(JSON.stringify({ key1: '1', key2: '2', key3: '3', key4: '4' }, null, 2));
    }

    cb(null);
  }
};


describe('backend', function() {
  var Backend;
  var backend;

  before(function() {
    mockery.enable();
    mockery.registerMock('fs', fsMock);

    Backend = require('../lib').default;
    backend = new Backend({
      interpolator: new Interpolator()
    }, {
      loadPath: __dirname + '/locales/{{lng}}/{{ns}}.json'
    });
  });

  after(function() {
    mockery.disable();
  });

  it('read', function(done) {
    backend.read('en', 'test', function(err, data) {
      expect(err).to.be.not.ok;
      expect(data).to.eql({key: 'passing'});
      done();
    });
  });

  it('read javascript files', function(done) {
    backend = new Backend({
      interpolator: new Interpolator()
    }, {
      loadPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}.js')
    });

    backend.read('en', 'test', function(err, data) {
      expect(err).to.be.not.ok;
      expect(data).to.eql({key: 'passing', evaluated: 2});
      done();
    });
  });

  it('fail if a bad js file is provided', function(done) {
    backend = new Backend({
      interpolator: new Interpolator()
    }, {
      loadPath: path.join(__dirname, '/locales/{{lng}}/{{ns}}.js')
    });

    backend.read('en', 'bad', function(err, data) {
      expect(err).to.be.ok;
      expect(data).to.eql(false);
      done();
    });
  });

  it('create simple', function(done) {
    backend.create('en', 'test', 'some.key', 'myDefault', function() {
      done();
    });
  });

  it('create multiple', function(done) {
    backend.create('en', 'test2', 'key1', '1')
    backend.create('en', 'test2', 'key2', '2')
    backend.create('en', 'test2', 'key3', '3')
    backend.create('en', 'test2', 'key4', '4', function() {
      done();
    });
  });

  it('create multiple - with pause', function(done) {
    backend.create('en', 'test3', 'key1', '1')
    backend.create('en', 'test3', 'key2', '2', function() {
      setTimeout(function () {
        backend.create('en', 'test3', 'key3', '3')
        backend.create('en', 'test3', 'key4', '4', function() {
          done();
        });
      }, 200);
    });
  });

  it('create multiple with multiple languages to write to (saveMissingTo=all)', function(done) {
    backend.create(['en', 'de'], 'test4', 'key1', '1')
    backend.create(['en', 'de'], 'test4', 'key2', '2')
    backend.create(['en', 'de'], 'test4', 'key3', '3')
    backend.create(['en', 'de'], 'test4', 'key4', '4', function() {
      expect(test4Save).to.equal(2);
      done();
    });
  });

});
