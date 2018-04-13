/**
 * The timesheet app must be applied to table bodies. This ensures that the
 * row and column calculations can leverage the rows and columns of the table
 * cells.
 */
;$(document).ready( function() {
  /** @const */
  const FORMAT_TIME = 'hh:mm A';
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

  var ivy = $('#ivy tbody').ivy({
		columns: [
      { name: 'wkday', f: 'formatDate' },
      { name: 'began', f: 'formatTime' },
      { name: 'ended', f: 'formatTime' },
      { name: 'shift' },
      { name: 'total' }
    ],

    /**
     * Calculates shifts and totals for each day.
     */
    onInit: function() {
      let MAX_ROWS = this.ivy.getMaxRows();

      for( let row = 0; row <= MAX_ROWS; row++ ) {
        this.onCellValueChangeAfter( row, COL_BEGAN );
      }
    },
    /**
     * Called before a cell value is changed. This sets the cell value
     * format to the standard time.
     */
    onCellValueChangeBefore: function( cellValue, row, col ) {
      if( col === COL_BEGAN || col === COL_ENDED ) {
        cellValue = cellValue.toTime();
      }

      return cellValue;
    },
    /**
     * Called after a cell value is changed. This computes the total number
     * of hours worked in a day.
     */
    onCellValueChangeAfter: function( row, col ) {
      if( col === COL_BEGAN || col === COL_ENDED ) {
        let began = this.updateCellTime( row, COL_BEGAN );
        let ended = this.updateCellTime( row, COL_ENDED, began, 60 );

        let delta = moment.duration( ended.diff( began ) );
        let hours = delta.asHours();

        if( hours.toFixed ) {
          hours = Math.abs( hours ).toFixed( FORMAT_PREC );
        }

        // Careful that this doesn't go recursive.
        $(this.ivy.getCell( row, COL_SHIFT )).text( hours );

        let indexes = this.findConsecutive( row, 0 );
        let sum = this.sumConsecutive( indexes );

        // Set the total for the day.
        $(this.ivy.getCell( indexes[0], COL_TOTAL )).text( sum );
      }
    },
    /**
     * Called after a row is inserted. This sets the begin time to the
     * end time of the previous row.
     *
     * @param {object} $row The row used as the template for the clone.
     * @param {object} $clone The clone inserted after the given row.
     */
    onRowInsertAfter: function( $row, $clone ) {
      console.log( $clone );
      $clone.find( 'td:not(:first-child)' ).empty();
    },
    /**
     * Called to ensure the cell at the given row and column has a valid
     * time.
     *
     * @param {number} row The cell row to update.
     * @param {number} col The cell column to update.
     * @param {defaultTime} The starting time for the cell value.
     * @param {defaultIncrement} Number of minutes to increment the cell by.
     * @return {object} The moment object for the time at the given cell.
     */
    updateCellTime: function( row, col, defaultTime, defaultIncrement ) {
			let cellTime = $(this.ivy.getCell( row, col ));
			let time = $(cellTime).text();

			if( time == '' ) {
        // Clone because moments are mutable.
				time = moment( defaultTime ).add( defaultIncrement, 'minutes' )
        time = time.format( FORMAT_TIME );
				$(cellTime).text( time );
			}

			return moment.utc( time, FORMAT_TIME );
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
    /**
     * Given a start and end index, this computes the total number of hours
     * over all shifts in each day.
     */
    sumConsecutive: function( indexes ) {
      let sum = 0;

      // Sum shift times within the same day.
      for( let i = indexes[0]; i <= indexes[1]; i++ ) {
        sum += parseFloat( $(this.ivy.getCell( i, COL_SHIFT )).text(), 10 )||0;
      }

      if( sum.toFixed ) {
        sum = sum.toFixed( FORMAT_PREC );
      }

      return sum;
    },
  });

	$("#timesheet").dialog({
    dialogClass: 'settings-dialog',
		position: {
			my: 'right bottom',
			at: 'right bottom',
			of: window
		}
  });

	$('a#app-edit-undo').on( 'click', function( e ) {
    ivy.editUndo();
  });

	$('a#app-edit-redo').on( 'click', function( e ) {
    ivy.editRedo();
  });

	$('a#app-insert-shift').on( 'click', function( e ) {
    ivy.editInsertRow();
  });

	$('a#app-delete-row').on( 'click', function( e ) {
    ivy.editDeleteRow();
  });

	$('a#app-append-day').on( 'click', function( e ) {
    ivy.editAppendRow();
  });

	$('a#app-settings-timesheet').on( 'click', function( e ) {
		$("#timesheet").dialog('open');
  });
});

