# Introduction

[![Travis](https://img.shields.io/travis/i18next/i18next-node-fs-backend/master.svg?style=flat-square)](https://travis-ci.org/i18next/i18next-node-fs-backend)
[![Coveralls](https://img.shields.io/coveralls/i18next/i18next-node-fs-backend/master.svg?style=flat-square)](https://coveralls.io/github/i18next/i18next-node-fs-backend)
[![npm version](https://img.shields.io/npm/v/i18next-node-fs-backend.svg?style=flat-square)](https://www.npmjs.com/package/i18next-node-fs-backend)
[![David](https://img.shields.io/david/i18next/i18next-node-fs-backend.svg?style=flat-square)](https://david-dm.org/i18next/i18next-node-fs-backend)

This is a i18next backend to be used node.js. It will load resources from filesystem. Right now it supports following filetypes:

- .json
- .json5
- .yml
- .cson

# Getting started

Source can be loaded via [npm](https://www.npmjs.com/package/i18next-node-fs-backend).

```
$ npm install i18next-node-fs-backend
```

Wiring up:

```js
var i18next = require("i18next");
var Backend = require("i18next-node-fs-backend");

i18next.use(Backend).init(i18nextOptions);
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
  jsonIndent: 2,

  // custom parser
  parse: function(data) { return data; }
}
```

**hint** {{lng}}, {{ns}} use the same prefix, suffix you define in interpolation for translations!!!

Options can be passed in:

**preferred** - by setting options.backend in i18next.init:

```js
var i18next = require("i18next");
var Backend = require("i18next-node-fs-backend");

i18next.use(Backend).init({
  backend: options
});
```

on construction:

```js
var Backend = require("i18next-node-fs-backend");
var backend = new Backend(null, options);
```

by calling init:

```js
var Backend = require("i18next-node-fs-backend");
var backend = new Backend();
backend.init(options);
```

---

<h3 align="center">Gold Sponsors</h3>

<p align="center">
  <a href="https://locize.com/" target="_blank">
    <img src="https://raw.githubusercontent.com/i18next/i18next/master/assets/locize_sponsor_240.gif" width="240px">
  </a>
</p>
