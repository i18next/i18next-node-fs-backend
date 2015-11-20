# Introduction

This is a i18next backend to be used node.js. It will load resources from filesystem. Right now it supports following filetypes:

- .json
- .json5

# Getting started

Source can be loaded via [npm](https://www.npmjs.com/package/i18next-node-fs-backend).

```
$ npm install i18next-node-fs-backend
```

Wiring up:

```js
var i18next = require('i18next');
var Backend = require('i18next-node-fs-backend');

i18next
  .use(Backend)
  .init(i18nextOptions);
```

As with all modules you can either pass the constructor function (class) to the i18next.use or a concrete instance.

## Backend Options

```js
{
  // path where resources get loaded from
  loadPath: '/locales/{{lng}}/{{ns}}.json',

  // path to post missing resources
  addPath: '/locales/{{lng}}/{{ns}}.missing.json',

  // jsonIndent to use when storing json files
  jsonIndent: 2
}
```

Options can be passed in:

**preferred** - by setting options.backend in i18next.init:

```js
var i18next = require('i18next');
var Backend = require('i18next-node-fs-backend');

i18next
  .use(Backend)
  .init({
    backend: options
  });
```

on construction:

```js
var Backend = require('i18next-node-fs-backend');
var backend = new Backend(null, options);
```

by calling init:

```js
var Backend = require('i18next-node-fs-backend');
var backend = new Backend();
backend.init(options);
```
