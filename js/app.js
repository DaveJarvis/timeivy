"use strict";

var TIMESHEET = '#timesheet';
var COLUMN_DATED = 'A';
var COLUMN_BEGAN = 'B';
var COLUMN_ENDED = 'C';
var COLUMN_SHIFT = 'D';
var COLUMN_TOTAL = 'E';

/**
 * Parses the given cell value into columns and rows.
 *
 * @return An integer array containing first the column [0] then the row [1].
 */
var get_coordinates = function( cell ) {
	var cr = $(cell).prop( 'id' ).split( '-' );
	cr[0] = parseInt( cr[0] );
	cr[1] = parseInt( cr[1] );

  return cr;
}

/**
 * Called whenever a cell in the table changes value.
 */
var timesheet_changed = function( obj, cell, value ) {
  var cr = get_coordinates( cell );

  // If the header is either Began or Ended, change the contents.
  var header = $(TIMESHEET).jexcel( 'getHeader', cr[0] );

  if( header.match( /began/i ) || header.match( /ended/i ) ) {
    // If the value has already been parsed, don't parse it again.
    if( value !== value.toTime() ) {
      $(TIMESHEET).jexcel( 'setValue', cell, value.toTime() );
    }

    // When the user issues an undo, the values will be the same,
    // but the shift and total times will be out of sync. So recalculate,
    // just in case.
    adjust_shift_time( cr[1] );
    adjust_total_time( cr[1] );
  }
}

/**
 * This will compute the shift time for the given row.
 */
var adjust_shift_time = function( row ) {
  row++;

  var shift_began = $(TIMESHEET).jexcel( 'getValue', COLUMN_BEGAN + row );
  var shift_ended = $(TIMESHEET).jexcel( 'getValue', COLUMN_ENDED + row );

  var moment_began = moment.utc( shift_began, 'hh:mm a' );
  var moment_ended = moment.utc( shift_ended, 'hh:mm a' );

  var duration = moment.duration( moment_ended.diff( moment_began ) );
  var hours = Math.abs( duration.asHours().toFixed( 2 ) );

  // Set the computed shift duration.
  $(TIMESHEET).jexcel( 'setValue', COLUMN_SHIFT + row, hours );
}

/**
 * This will compute the total time for the date of the current row by
 * summing the shift times for all contiguous dates found (in both
 * directions, forward and backward).
 */
var adjust_total_time = function( row ) {
  // Scan contiguously backwards while rows have the same date.
  var began_index = find_date_index( row, -1 );

  // Scan contiguously forwards while rows have the same date.
  var ended_index = find_date_index( row, 1 );

  var sum = 0;
  var index = began_index;

  do {
    sum += parseFloat( get_shift_value( index + 1 ) );
  }
  while( index < ended_index );

  set_daily_total( began_index + 1, sum );
}

/**
 * Returns the date for a given row.
 */
var get_timesheet_date = function( row ) {
  return get_cell_value( row, COLUMN_DATED );
}

/**
 * Returns the number of shift hours for a given row.
 */
var get_shift_value = function( row ) {
  return get_cell_value( row, COLUMN_SHIFT );
}

/**
 * Returns the cell value for a given row and column.
 */
var get_cell_value = function( row, col ) {
  return $(TIMESHEET).jexcel( 'getValue', col + row );
}

/**
 * Sets the total column for the given row.
 */
var set_daily_total = function( row, total ) {
  return set_cell_value( row, COLUMN_TOTAL, total );
}

/**
 * Sets the cell value for a given row and column.
 */
var set_cell_value = function( row, col, value ) {
  return $(TIMESHEET).jexcel( 'setValue', col + row, value );
}

/**
 * Returns the first or last date that matches the given row's date,
 * searching contiguously in the given direction.
 *
 * @param row The starting row to search (greater than or equal to 0).
 * @param direction 1 or -1 to search forward or backward, respectively.
 */
var find_date_index = function( row, direction ) {
  var this_date = '';
  var that_date = '';

  // 
  do {
    this_date = get_timesheet_date( row );
    row += direction;
    that_date = get_timesheet_date( row );
  }
  while( this_date === that_date && this_date !== 'undefined' );

  // Roll back one iteration.
  return row - direction;
}

/**
 * Called when the timesheet is loaded into the browser. This will compute
 * all the shift and total times.
 */
var timesheet_loaded = function( obj ) {
  console.log( obj );
}

/**
 * Called after a row has been inserted.
 */
var timesheet_insertion = function( obj ) {
  console.log( 'insert row' );
}

/**
 * Spreadsheet configuration.
 */
$(TIMESHEET).jexcel({
	about: 'Time Ivy\\n\\nWhite Magic Software, Ltd.',
	csv: 'timesheets/wms.csv',
	onload: timesheet_loaded,
	onchange: timesheet_changed,
  oninsertrow: timesheet_insertion,
	columnSorting: false,
	rowDrag: false,
	allowManualInsertRow: false,
	colHeaders: [ 'Day', 'Began', 'Ended', 'Shift', 'Total', 'Description' ],
	colWidths: [ 32, 80, 80, 48, 48, 384 ],
	colAlignments: [
		'center',
		'left',
		'left',
		'right',
		'right',
		'left'
	],
	columns: [
		{ type: 'calendar', options: { format: 'DD' }, readOnly: true },
		{ type: 'text' },
		{ type: 'text' },
		{ type: 'numeric', readOnly: false },
		{ type: 'numeric', readOnly: false },
		{ type: 'text' }
	]
});

/**
 * Allow inserting rows using the keyboard.
 */
document.addEventListener( "keyup", function( event ) {
	if( event.which === 45 ) {
		var cell = $.fn.jexcel.selectedCell;
		var cr = get_coordinates( cell );

		$(TIMESHEET).jexcel( 'insertRow', 1, cr[1] );
	}
});

