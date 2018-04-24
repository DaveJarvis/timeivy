/**
 * The timesheet app must be applied to table bodies. This ensures that the
 * row and column calculations can leverage the rows and columns of the table
 * cells.
 */
;$(document).ready( function() {
  /** @const */
  const COL_DATED = 0;
  /** @const */
  const COL_BEGAN = 1;
  /** @const */
  const COL_ENDED = 2;
  /** @const */
  const COL_SHIFT = 3;
  /** @const */
  const COL_TOTAL = 4;

  let timesheet = '#ivy tbody';

  $(".ivy-export-csv").exportable({
    data_table: timesheet,
    filename: 'timesheet.csv'
  });

  $(".ivy-export-json").exportable({
    data_table: timesheet,
    filename: 'timesheet.json'
  });

  var ivy = $(timesheet).ivy({
    /**
     * Defines application preferences.
     */
    preferences: {
      format_time: 'hh:mm A',
			format_date: 'YYYY-MM-DD',
      format_prec: 2,
      insert_rows: [
        {
          began: '7:45',
          ended: '9:30'
        },
        {
          began: '9:30',
          ended: '10:00'
        },
        {
          began: '10:00',
          ended: '3:45p'
        },
      ],
			weekends: false
    },
    /**
     * Called when the Ivy Plugin is initialized.
     */
    init: function() {
      let self = this;
      let plugin = this.ivy;
      let prefs = this.preferences;
      let classReadOnly = plugin.settings.classCellReadOnly;
			let $table = $(plugin.getTableBodyElement());
			let $headers = $table.prev( 'thead' ).find( 'tr:first th' );
			let html = '<tr>';

			$headers.each( function( index ) {
        html += '<td';

        if( [COL_DATED, COL_SHIFT, COL_TOTAL].includes( index ) ) {
          html += ' class="' + classReadOnly + '">';

          if( index === COL_DATED ) {
            let day = moment().startOf( 'month' ).subtract( 1, 'day' );
            day = self.getNextWorkDay( day );

            html += day.format( prefs.format_date );
          }
        }
        else {
          html += '>';
        }

        html += '</td>';
			});

			html += '</tr>';

			$table.append( html );
    },
    /**
     * Returns the day after the given day, taking into consideration
     * the user's proferences for including weekends. This does not
     * mutate the given day, but returns a new day that will be advanced
     * by 1, 2, or 3 days depending on weekend preferences.
     *
     * @param {Object} day The momentjs date to advance by 1 day.
     * @return {Object} A momentjs date instance advanced by n days.
     */
    getNextWorkDay: function( day ) {
      let prefs = this.preferences;
      let d = day.clone();

      // Weekends don't last forever. Skipping two days would work, but
      // eventually we'll want configurable weekends. (Some people work
      // Tue through Sat, with Sun/Mon as weekends.)
      do {
        d.add( 1, 'day' );
      }
      while( (!prefs.weekends) && d.toDate().isWeekend() );

      return d;
    },
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
        let prefs = this.preferences;
        let began = this.updateCellTime( row, COL_BEGAN );
        let ended = this.updateCellTime( row, COL_ENDED, began, 60 );
        let delta = moment.duration( ended.diff( began ) );
        let hours = delta.asHours();

        if( hours.toFixed ) {
          hours = Math.abs( hours ).toFixed( prefs.format_prec );
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
      let day = moment( $date.text() );
      let m1 = day.month();

      day = this.getNextWorkDay( day );

      let m2 = day.month();

      // Refresh the date if within the same month.
      if( m1 === m2 ) {
        let prefs = this.preferences;
        $date.text( day.format( prefs.format_date ) );
      }
      else {
        // Remove the row because an attempt was made to insert
        // a day beyond the end of the month.
        $row.remove();
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
      let prefs = this.preferences;
      let $cell = $(plugin.getCell( row, col ));
      let time = $cell.text();

      if( time == '' ) {
        // Clone because moments are mutable.
        time = moment( defaultTime ).add( defaultIncrement, 'minutes' )
        time = time.format( prefs.format_time );
        $cell.text( time );
      }

      return moment.utc( time, prefs.format_time );
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
      let prefs = this.preferences;
      let sum = 0;

      // Sum shift times within the same day.
      for( let i = indexes[0]; i <= indexes[1]; i++ ) {
        sum += parseFloat( $(plugin.getCell( i, COL_SHIFT )).text(), 10 )||0;
      }

      if( sum.toFixed ) {
        sum = sum.toFixed( prefs.format_prec );
      }

      return sum;
    },
  });

  var extensions = {
    /**
     * Appends the remaining days of the week in the month.
     */
    editAppendMonth: function() {
      let plugin = this;
      let rowIndex = plugin.getMaxRows();
      let $cell = $(plugin.getCell( rowIndex, COL_DATED ));
      let day = moment( $cell.text() );
      let curr_month = day.month();

      // Add append days until the month flips. Adding 1 day mutates the
      // day instance.
      while( curr_month === day.add( 1, 'day' ).month() ) {
        // Kicks off the weekend discriminator magic.
        plugin.editAppendRow();

        $cell = $(plugin.getCellLastRow( COL_DATED ));
        day = moment( $cell.text() );
      }
    },
  };

  $.extend( true, ivy, extensions );

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

  $('.app-append-days').on( 'click', function( e ) {
    ivy.editAppendMonth();
  });

  $('.app-settings-timesheet').on( 'click', function( e ) {
    $("#timesheet").dialog('open');
  });
});

