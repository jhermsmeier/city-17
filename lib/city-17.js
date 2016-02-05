var Emitter = require( 'events' ).EventEmitter
var inherit = require( 'bloodline' )
var debug = require( 'debug' )( 'city17' )
var cluster = require( 'cluster' )
var os = require( 'os' )
var async = require( 'async' )

/**
 * City17
 * @constructor
 * @param {Object} options
 * @return {City17}
 */
function City17( options ) {
  
  if( !(this instanceof City17) )
    return new City17( options )
  
  this.options = Object.assign( {}, City17.defaults, options || {} )
  this.killTimeout = this.options.timeout || 5000
  this.clusterSize = this.options.clusterSize != null ?
    this.options.clusterSize : os.cpus().length
  
  Emitter.call( this, this.options )
  
  this.cluster = cluster
  this.cluster.setupMaster( this.options )
  
  // this._onError = this._onError.bind( this )
  this._onExit = this._onExit.bind( this )
  this._onListening = this._onListening.bind( this )
  this._onDisconnect = this._onDisconnect.bind( this )
  this._onOnline = this._onOnline.bind( this )
  this._onFork = this._onFork.bind( this )
  
  this._attachEvents()
  
  this._resizing = false
  this._exiting = false
  this._restarting = false
  
  this.resize()
  
  debug( 'pid', process.pid )
  
}

/**
 * [getExitError description]
 * @type {Function}
 */
City17.getExitError = require( './error' )

/**
 * City17 prototype
 * @type {Object}
 */
City17.prototype = {
  
  constructor: City17,
  
  _attachEvents: function() {
    
    var self = this
    
    debug( '_attachEvents' )
    
    cluster.on( 'exit', this._onExit )
    cluster.on( 'listening', this._onListening )
    cluster.on( 'disconnect', this._onDisconnect )
    cluster.on( 'online', this._onOnline )
    cluster.on( 'fork', this._onFork )
    
    process.on( 'SIGHUP', function() {
      debug( 'SIGHUP', 'restarting...' )
      self.restart()
    })
    
    process.on( 'SIGINT', function() {
      debug( 'SIGINT', 'stopping...' )
      self.stop( function() {
        debug( 'stopped' )
        process.exit()
      })
    })
    
    process.on( 'exit', function() {
      self.forceQuit()
    })
    
  },
  
  _onFork: function( worker ) {
    debug( 'worker:fork', worker.id )
    worker.birth = Date.now()
  },
  
  // TBD: Listen on worker `error` events
  // _onError: function( error ) {},
  
  _onExit: function( worker, code, signal ) {
    clearTimeout( worker._killTimer )
    var exitType = worker.suicide ? 'suicide' : 'exit'
    debug( 'worker:exit', worker.id, exitType, City17.getExitError( code, signal ) )
    if( !worker.suicide && !this._exiting && !this._restarting ) {
      debug( 'worker:exit', 'unexpected; resizing...' )
      this.resize()
    }
  },
  
  _onListening: function( worker, address) {
    debug( 'worker:listening', worker.id, address )
  },
  
  _onDisconnect: function( worker ) {
    
    debug( 'worker:disconnect', worker.id )
    
    worker._killTimer = setTimeout( function forceKill() {
      if( worker.process ) {
        debug( 'worker:exit:force', worker.id )
        worker.process.kill( 'SIGKILL' )
      }
    }, this.killTimeout )
    
    if( !worker.suicide && !this._restarting && !this._exiting ) {
      this.resize()
    }
    
  },
  
  _onOnline: function( worker ) {
    debug( 'worker:online', { id: worker.id, pid: worker.process.pid, })
  },
  
  get size() {
    return Object.keys( cluster.workers ).length
  },
  
  get workers() {
    return Object.keys( cluster.workers ).map( function( id ) {
      return cluster.workers[ id ]
    })
  },
  
  resize: function( n, callback ) {
    
    var self = this
    
    debug( 'resize' )
    
    if( n != null && typeof n !== 'function' ) {
      self.clusterSize = n
      debug( 'clustersize', self.clusterSize )
    }
    
    if( self._resizing === true ) {
      debug( 'resize', 'already in progress' )
      if( typeof callback === 'function' )
        this.once( 'resize:end', callback )
      return
    }
    
    self._resizing = true
    self.emit( 'resize', self.clusterSize )
    
    async.whilst(
      function condition() {
        return self.size !== self.clusterSize
      },
      function resize( next ) {
        if( self.size < self.clusterSize ) {
          // Resize up
          cluster.fork( self.options.env )
            .once( 'online', function() { next() })
        } else if( self.size > self.clusterSize ) {
          // Resize down
          self.workers[0]
            .once( 'exit', function() { next() })
            .disconnect()
        }
      },
      function done( error ) {
        self._resizing = false
        debug( 'resize:end', error )
        self.emit( 'resize:end', error )
        if( typeof callback === 'function' )
          callback.call( self, error )
      }
    )
    
  },
  
  restart: function( callback ) {
    
    var self = this
    var now = Date.now()
    
    debug( 'restart' )
    
    if( self._restarting === true ) {
      debug( 'restart', 'already in progress' )
      if( typeof callback === 'function' )
        this.once( 'restart:end', callback )
      return
    }
    
    self._restarting = true
    self.emit( 'restart' )
    
    async.whilst(
      function condition() {
        var oldworkers = self.workers.filter( function( worker ) {
          return worker.birth < now
        })
        return oldworkers.length > 0
      },
      function restart( next ) {
        cluster.fork( self.options.env ).once( 'online', function() {
          self.workers[0]
            .once( 'disconnect', function() { next() })
            .disconnect()
        })
      },
      function done( error ) {
        self._restarting = false
        debug( 'restart:end', error )
        self.emit( 'restart:end', error )
        if( typeof callback === 'function' )
          callback.call( self, error )
      }
    )
    
  },
  
  stop: function( callback ) {
    
    var self = this
    
    if( self._exiting )
      return this.forceQuit()
    
    self._exiting = true
    self.emit( 'stop' )
    
    self.resize( 0, function( error ) {
      self.emit( 'stop:end', error )
      if( typeof callback === 'function' )
        callback.call( self, error )
    })
    
  },
  
  forceQuit: function() {
    
    debug( 'forceQuit' )
    
    if( this.size ) {
      debug( 'forceQuit:kill', this.size )
    }
    
    Object.keys( cluster.workers ).forEach( function( id ) {
      var worker = cluster.workers[ id ]
      if( worker && worker.process )
        worker.process.kill( 'SIGKILL' )
    })
    
    process.exit( 1 )
    
  },
  
}

inherit( City17, Emitter )
// Exports
module.exports = City17
