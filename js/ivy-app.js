/**
 * The timesheet app must be applied to table bodies. This ensures that the
 * row and column calculations can leverage the rows and columns of the table
 * cells.
 */
$(document).ready( function() {
  /** @const */
  const FORMAT_TIME = 'HH:mm a';
  /** @const */
  const FORMAT_PREC = 2;
  /** @const */
  const COL_BEGAN = 1;
  /** @const */
  const COL_ENDED = 2;
  /** @const */
  const COL_SHIFT = 3;
  /** @const */
  const COL_TOTAL = 4;

  $('#ivy tbody').ivy({
    onInit: function() {
      let MAX_ROWS = this.ivy.getMaxRows();
    },
    onCellValueChangeBefore: function( cellValue, row, col ) {
      if( col === COL_BEGAN || col === COL_ENDED ) {
        cellValue = cellValue.toTime();
      }

      return cellValue;
    },
    onCellValueChangeAfter: function( row, col ) {
      if( col === COL_BEGAN || col === COL_ENDED ) {
        let timeBegan = $(this.ivy.getCell( row, COL_BEGAN )).text();
        let timeEnded = $(this.ivy.getCell( row, COL_ENDED )).text();

        let began = moment.utc( timeBegan, FORMAT_TIME );
        let ended = moment.utc( timeEnded, FORMAT_TIME );

        let delta = moment.duration( ended.diff( began ) );
        let hours = delta.asHours();

        if( hours.toFixed ) {
          hours = Math.abs( hours ).toFixed( FORMAT_PREC );
        }

        // Careful that this doesn't go recursive.
        $(this.ivy.getCell( row, COL_SHIFT )).text( hours );

        let indexes = this.findConsecutive( row, 0 );
        let sum = 0;

        // Sum shift times within the same day.
        for( let i = indexes[0]; i <= indexes[1]; i++ ) {
          sum += parseFloat( $(this.ivy.getCell( i, COL_SHIFT )).text(), 10 );
        }

        if( sum.toFixed ) {
          sum = sum.toFixed( FORMAT_PREC );
        }

        // Set the total for the day.
        $(this.ivy.getCell( indexes[0], COL_TOTAL )).text( sum );
      }
    },
    onRowInsertAfter: function( $row, $clone ) {
      // Only insert for the same day.
      $clone.find( 'td:not(:first-child)' ).empty();
    },
    /**
     * Returns the first and last row for a consecutive series of equal values.
     */
    findConsecutive: function( row, col ) {
      let iterator = row;
      let comparator = $(this.ivy.getCell( row, col )).text();
      let comparand = comparator;

      // Search backwards from the active row until a non-matching value.
      while( comparator == comparand && --iterator >= 0 ) {
        comparand = $(this.ivy.getCell( iterator, col )).text();
      }

      let beginIndex = iterator + 1;
      let MAX_ROWS = this.ivy.getMaxRows();

      iterator = row;
      comparand = comparator;

      // Search forewards from the active row until a non-matching value.
      while( comparator == comparand && ++iterator < MAX_ROWS ) {
        comparand = $(this.ivy.getCell( iterator, col )).text();
      }

      let endedIndex = iterator - 1;

      return [ beginIndex, endedIndex ];
    },
    sum: function( row ) {
    }
  });
} );

