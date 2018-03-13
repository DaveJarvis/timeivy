"use strict";

var preventRecursion = 0;

// Maximum number of attempts to set the time for a cell.
var MAX_RECURSION = 5;

/**
 * Called whenever a cell in the table changes value.
 */
var timesheetChanged = function( obj, cell, value ) {
  var rc = $(cell).prop('id').split( '-' );
  var col = rc[0];
  var row = rc[1];

  // If the header is either Began or Ended, change the contents.
  var header = $('#timesheet').jexcel('getHeader', col);

  if( header.match( /began/i ) || header.match( /ended/i ) ) {
    // If the value has already been parsed, don't parse it again.
    if( value !== value.toTime() && preventRecursion < MAX_RECURSION ) {
      $('#timesheet').jexcel( 'setValue', cell, value.toTime() );
      preventRecursion++;

      computeShiftTime( row );
      computeTotalTime( row );
    }
  }
}

/**
 * This will compute the shift time for the given row.
 */
var computeShiftTime = function( row ) {
  row = parseInt(row);
  row += 1;

  var shiftBegan = $('#timesheet').jexcel( 'getValue', 'B' + row );
  var shiftEnded = $('#timesheet').jexcel( 'getValue', 'C' + row );

  var momentBegan = moment.utc( shiftBegan, 'hh:mm a' );
  var momentEnded = moment.utc( shiftEnded, 'hh:mm a' );

  var duration = moment.duration( momentEnded.diff( momentBegan ) );

  // Update the amount of time worked for the shift.
  $('#timesheet').jexcel( 'setValue', 'D' + row, duration.asHours() );
}

/**
 * This will compute the total time starting from the first date that can
 *
 * the given row while the
 * date is the same day for all contiguous rows.
 */
var computeTotalTime = function( row ) {
  console.log( $.fn.jexcel.defaults.timesheet.colHeaders );
}

/**
 * Called when the timesheet is loaded into the browser. This will compute
 * all the shift and total times.
 */
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
