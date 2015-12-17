var mockery = require('mockery');
var expect = require('chai').expect;

var Interpolator = require('i18next/lib/Interpolator');

var test3Save = 0;

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

    cb(null);
  }
};


describe('backend', function() {
  var backend;

  before(function() {
    mockery.enable();
    mockery.registerMock('fs', fsMock);

    var Backend = require('../lib');
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

});
