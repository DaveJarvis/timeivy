"use strict";

var timesheetChanged = function( obj, cell, value ) {
  var rc = $(cell).prop('id').split( '-' );
  var col = rc[0];
  var row = rc[1];

  // If the header is either Began or Ended, change the contents.
  var header = $('#timesheet').jexcel('getHeader', col);

  if( header.match( /began/i ) || header.match( /ended/i ) ) {
    $('#timesheet').jexcel('setValue', cell, '42');
  }

  //console.log( value.toTime() );
}

var timesheetLoaded = function( obj ) {
  console.log( obj );
}

$(document).ready(function() {
  /**
   * Convert time to HH:MMa format when any time input value changes.
   */
  $(".time-entry").change( function() {
    var time = $(this).val();
    var thisTime = time.toTime();

    // Update the field with normalized time.
    $(this).val( thisTime );
  }).change( function() {
    // Get the name of the existing field to find its counterpart.
    var thisName = $(this).prop( 'name' );
    var began = thisName.match( /b/i ) !== null;
    var thisPrefix = began ? 'b' : 'e';
    var thatPrefix = began ? 'e' : 'b';

    // Sniff out the field index from the name.
    var fieldIndex = thisName.replace( /\D/g, '' );

    // Build up the time field names.
    var thisField = '#' + thisPrefix + fieldIndex;
    var thatField = '#' + thatPrefix + fieldIndex;

    var thisTimeField = $(thisField).val();
    var thatTimeField = $(thatField).val();

    var thisMoment = moment.utc( thisTimeField, 'hh:mm a' );
    var thatMoment = moment.utc( thatTimeField, 'hh:mm a' );

    var duration = moment.duration( thatMoment.diff( thisMoment ) );
    var shiftTimeField = '#s' + fieldIndex;

    // Update the amount of time worked for the shift.
    $(shiftTimeField).text( duration.asHours() );
  });
});

