/**
 * The timesheet app must be applied to table bodies. This ensures that the
 * row and column calculations can leverage the rows and columns of the table
 * cells.
 */
$(document).ready( function() {
  $('#ivy tbody').ivy();
} );

