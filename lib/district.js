var Emitter = require( 'events' ).EventEmitter
var inherit = require( 'bloodline' )

/**
 * District
 * @constructor
 * @param {City17} city
 * @param {Object} options
 *   @see District.defaults
 * @return {District}
 */
function District( city, options ) {
  
  if( !(this instanceof District) )
    return new District( city, options )
  
  this.city = city
  this.options = options = Object.assign(
    {}, District.defaults, options || {}
  )
  
  Emitter.call( this, this.options )
  
  this.size = options.size
  this.killTimeout = options.timeout
  this.workers = {}
  
}

/**
 * District's default options
 * @type {Object}
 * @property {Number} size
 * @property {Number} timeout
 */
District.defaults = {
  size: 1,
  timeout: 5000,
}

/**
 * District prototype
 * @type {Object}
 */
District.prototype = {
  
  constructor: District,
  
  /**
   * Determines whether this district
   * has a worker with a given `id`
   * @param  {String} id
   * @return {Boolean}
   */
  has: function( id ) {
    return this.workers.hasOwnProperty( id )
  },
  
}

// Exports
inherit( District, Emitter )
module.exports = District
