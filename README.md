# City-17
[![npm](https://img.shields.io/npm/v/city-17.svg?style=flat-square)](https://npmjs.com/city-17)
[![npm](https://img.shields.io/npm/l/city-17.svg?style=flat-square)](https://npmjs.com/city-17)
[![npm downloads](https://img.shields.io/npm/dm/city-17.svg?style=flat-square)](https://npmjs.com/city-17)
[![build status](https://img.shields.io/travis/jhermsmeier/city-17.svg?style=flat-square)](https://travis-ci.org/jhermsmeier/city-17)

## Install via [npm](https://npmjs.com)

```sh
$ npm install --save city-17
```

## Usage

```js
var City17 = require( 'city-17' )
```

```js
var cluster = new City17({
  exec: require.resolve( './worker.js' ),
  argv: [ '--brutal' ],
  clusterSize: 4, // defaults to `os.cpus().length`
  killTimeout: 5000,
})
```

```js
cluster.size // -> worker count
cluster.workers // -> array of workers
```

```js
// n, callback are optional
cluster.resize( n, callback )
cluster.stop( callback )
cluster.forceQuit()
```
