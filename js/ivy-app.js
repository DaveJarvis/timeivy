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

  let timesheet = '#ivy tbody';

  $(".ivy-export").csv({
    data_table: timesheet,
    filename: 'timesheet.csv'
  });

  var ivy = $(timesheet).ivy({
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
    refreshCells: function() {
      let plugin = this.ivy;
      let MAX_ROWS = plugin.getMaxRows();

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
        let plugin = this.ivy;
        let began = this.updateCellTime( row, COL_BEGAN );
        let ended = this.updateCellTime( row, COL_ENDED, began, 60 );

        let delta = moment.duration( ended.diff( began ) );
        let hours = delta.asHours();

        if( hours.toFixed ) {
          hours = Math.abs( hours ).toFixed( FORMAT_PREC );
        }

        // Careful that this doesn't go recursive.
        $(plugin.getCell( row, COL_SHIFT )).text( hours );

        let indexes = this.findConsecutive( row, 0 );
        let sum = this.sumConsecutive( indexes );

        // Set the total for the day.
        $(plugin.getCell( indexes[0], COL_TOTAL )).text( sum );
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
      let plugin = this.ivy;
      let ended = $clone.find( 'td:eq(' + COL_ENDED + ')' ).text();

      $clone.find( 'td:not(:first-child)' ).empty();

      let row = $clone.index();
      let col = COL_BEGAN;

      plugin.setCellValue( ended, row, col );

      // Sometimes setting the cell value doesn't refresh the daily
      // total. Calling refresh here has a slight performance hit, but
      // it ensures the correct daily total.
      plugin.refreshCells();
    },
    /**
     * Called after a row is appended. This increments the day of the
     * month, if possible.
     *
     * @param {object} $row The row used as the template for the clone.
     * @param {object} $clone The clone appended to the table.
     */
    onRowAppendAfter: function( $row, $clone ) {
      let plugin = this.ivy;
      let $date = $clone.find( 'td:first' );

      let today = moment( $date.text() );
      let tomorrow = today.clone().add( 1, 'day' );

      let m1 = today.get( 'month' );
      let m2 = tomorrow.get( 'month' );

      // Only insert tomorrow's date if within the same month.
      if( m1 === m2 ) {
        $date.text( tomorrow.format( "YYYY-MM-DD" ) );
      }

      plugin.refreshCells();
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
      let plugin = this.ivy;
      let $cell = $(plugin.getCell( row, col ));
      let time = $cell.text();

      if( time == '' ) {
        // Clone because moments are mutable.
        time = moment( defaultTime ).add( defaultIncrement, 'minutes' )
        time = time.format( FORMAT_TIME );
        $cell.text( time );
      }

      return moment.utc( time, FORMAT_TIME );
    },
    /**
     * Returns the first and last row for a consecutive series of equal values.
     */
    findConsecutive: function( row, col ) {
      let plugin = this.ivy;
      let iterator = row;
      let comparator = $(plugin.getCell( row, col )).text();
      let comparand = comparator;

      // Search backwards from the active row until a non-matching value.
      while( comparator == comparand && --iterator >= 0 ) {
        comparand = $(plugin.getCell( iterator, col )).text();
      }

      let beginIndex = iterator + 1;
      let MAX_ROWS = plugin.getMaxRows();

      iterator = row;
      comparand = comparator;

      // Search forewards from the active row until a non-matching value.
      while( comparator == comparand && ++iterator < MAX_ROWS ) {
        comparand = $(plugin.getCell( iterator, col )).text();
      }

      let endedIndex = iterator - 1;

      return [ beginIndex, endedIndex ];
    },
    /**
     * Given a start and end index, this computes the total number of hours
     * over all shifts in each day.
     */
    sumConsecutive: function( indexes ) {
      let plugin = this.ivy;
      let sum = 0;

      // Sum shift times within the same day.
      for( let i = indexes[0]; i <= indexes[1]; i++ ) {
        sum += parseFloat( $(plugin.getCell( i, COL_SHIFT )).text(), 10 )||0;
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

  $('.app-edit-undo').on( 'click', function( e ) {
    ivy.editUndo();
  });

  $('.app-edit-redo').on( 'click', function( e ) {
    ivy.editRedo();
  });

  $('.app-insert-shift').on( 'click', function( e ) {
    ivy.editInsertRow();
  });

  $('.app-delete-row').on( 'click', function( e ) {
    ivy.editDeleteRow();
  });

  $('.app-append-day').on( 'click', function( e ) {
    ivy.editAppendRow();
  });

  $('.app-settings-timesheet').on( 'click', function( e ) {
    $("#timesheet").dialog('open');
  });
});

