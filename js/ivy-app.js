/**
 * The timesheet app must be applied to table bodies. This ensures that the
 * row and column calculations can leverage the rows and columns of the table
 * cells.
 */
$(document).ready( function() {
  $('#ivy tbody').ivy({
    onCellValueChangeBefore: function( cellValue, row, col ) {
      if( col === 1 || col === 2 ) {
        cellValue = cellValue.toTime();
      }

      return cellValue;
    },
    onCellValueChangeAfter: function( row, col ) {
      if( col === 1 || col === 2 ) {
        let timeBegan = $(this.ivy.getCellValue( row, 1 )).text();
        let timeEnded = $(this.ivy.getCellValue( row, 2 )).text();
        let TIME_FORMAT = this.ivy.settings.formatTime;

        let began = moment.utc( timeBegan, TIME_FORMAT );
        let ended = moment.utc( timeEnded, TIME_FORMAT );

        let delta = moment.duration( ended.diff( began ) );
        let hours = delta.asHours();

        if( hours.toFixed ) {
          hours = Math.abs( hours ).toFixed( 2 );
        }

        // Careful that this doesn't go recursive.
        this.ivy.setCellValue( hours, row, 3 );

        let sumStartRow = this.findGroup( row, 0, -1 );
      }

      // Sum shift times within the same day.
    },
    /**
     * Returns the first and last row for a consecutive series of equal values.
     */
    findGroup: function( row, col, direction ) {
      let currVal = null;
      let prevVal = null;

      return row;
    },
    sum: function( row ) {
    }
  });
} );
