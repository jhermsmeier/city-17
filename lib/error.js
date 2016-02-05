module.exports = function getExitError( code, signal ) {
  
  var error = null
  
  if( code !== 0 ) {
    error = new Error( 'Unknown Error' )
    switch( code ) {
      case  1: error.message = 'Uncaught Fatal Exception'; break
      case  2: error.message = 'Bash: builtin misuse'; break
      case  3: error.message = 'Internal JavaScript Parse Error'; break
      case  4: error.message = 'Internal JavaScript Evaluation Failure'; break
      case  5: error.message = 'Fatal Error'; break
      case  6: error.message = 'Non-function Internal Exception Handler'; break
      case  7: error.message = 'Internal Exception Handler Run-Time Failure'; break
      case  8: error.message = 'Uncaught Exception'; break
      case  9: error.message = 'Invalid Argument'; break
      case 10: error.message = 'Internal JavaScript Run-Time Failure'; break
      case 12: error.message = 'Invalid Debug Argument'; break
      default:
        error.message = `Signal ${signal} (${ code - 128 })`
        error.signal = signal
        error.code = code
        break
    }
  }
  
  return error
  
}
