/**
 * The timesheet app must be applied to table bodies. This ensures that the
 * row and column calculations can leverage the rows and columns of the table
 * cells.
 */
$(document).ready( function() {
  $('#ivy tbody').ivy({
    onCellValueChange: function( cellValue, row, col ) {
      if( col === 1 || col === 2 ) {
        cellValue = cellValue.toTime();

        let timeBegan = cellValue;
        let timeEnded = $(this.ivy.getCellValue( row, 2 )).text();

        let began = moment.utc( timeBegan, 'HH:mm a' );
        let ended = moment.utc( timeEnded, 'HH:mm a' );

        let delta = moment.duration( ended.diff( began ) );
        let hours = delta.asHours();

        if( hours.toFixed ) {
          hours = Math.abs( hours ).toFixed( 2 );
        }

        this.ivy.setCellValue( hours, row, 3 );
      }

      return cellValue;
    }
  });
} );
