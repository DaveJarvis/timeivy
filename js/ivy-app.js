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

  /** @const */
  const APP_PREFERENCES = 'ivy.preferences';

  let user_preferences_schema = {
    'title': 'Preferences',
    'type': 'object',
    'properties': {
      'weekdays': {
        'type': 'array',
        'title': 'Weekdays',
        'format': 'table',
        'uniqueItems': true,
        'items': {
          'type': 'object',
          'required': 'weekday',
          'properties': {
            'weekday': {
              'title': 'Weekday',
              'type': 'string',
              'enum': [0, 1, 2, 3, 4, 5, 6],
              'options': {
                'enum_titles': [
                  'Sunday',
                  'Monday',
                  'Tuesday',
                  'Wednesday',
                  'Thursday',
                  'Friday',
                  'Saturday',
                ],
              },
            },
            'times': {
              'title': 'Times',
              'type': 'array',
              'format': 'table',
              'items': {
                'type': 'object',
                'properties': {
                  'began': {
                    'type': 'string',
                    'title': 'Began',
                    'default': '08:00 AM',
                  },
                  'ended': {
                    'type': 'string',
                    'title': 'Ended',
                    'default': '04:00 PM',
                  },
                },
              },
            },
          },
        },
      },
      'formats': {
        'title': 'Format',
        'type': 'object',
        'properties': {
          'format_time': {
            'type': 'string',
            'title': 'Time',
            'default': 'HH:mm A',
          },
          'format_date': {
            'type': 'string',
            'title': 'Date',
            'default': 'YYYY-MMM-DD',
          },
          'format_prec': {
            'type': 'integer',
            'title': 'Precision',
            'default': 2,
          },
        },
      },
      'inclusion': {
        'type': 'object',
        'title': 'Include',
        'properties': {
          'weekends': {
            'type': 'boolean',
            'title': 'Weekends',
            'format': 'checkbox',
            'default': false,
          },
          'holidays': {
            'type': 'boolean',
            'title': 'Holidays',
            'format': 'checkbox',
            'default': false,
          },
        },
      },
      'columns': {
        'type': 'array',
        'title': 'Columns',
        'format': 'tabs',
        'maxItems': 3,
        'items': {
          'type': 'string',
          'title': 'Column',
        },
      },
    },
  };

  /**
   * User-defined application preferences, including rows for daily
   * templates.
   *
   * @see user_preferences_schema
   */
  let ivy = $("#ivy tbody").ivy({
    getDefaults: function() {
      return {
        "formats": {
          "format_time": "hh:mm A",
          "format_date": "YYYY-MM-DD",
          "format_prec": 2
        },
        "weekdays": [{
          "weekday": 1,
          "times": [
            {
              "began": "745",
              "ended": "930"
            },
            {
              "began": "930",
              "ended": "1000"
            },
            {
              "began": "1000",
              "ended": "345p"
            }
          ]},
        ],
        "inclusion": {
          "weekends": false,
          "holidays": false
        },
        "columns": ["Description"]
      };
    },
    getPreferences: function() {
      return localStorage.get( APP_PREFERENCES, this.getDefaults() );
    },
    setPreferences: function( prefs ) {
      localStorage.put( APP_PREFERENCES, prefs );
    },
    /**
     * Called when the Ivy plugin is initialized.
     */
    init: function() {
      this.initMenu();
      this.initHeadings();
      this.initTimesheet();
      this.initPreferencesDialog();
      this.initPreferencesEditor();
    },
    /**
     * Maps user-interface menu items to ivy function calls.
     */
    initMenu: function() {
      let self = this;
      let plugin = self.ivy;

      let ui = [
        { a: 'edit-cut',     f: 'Cut' },
        { a: 'edit-copy',    f: 'Copy' },
        { a: 'edit-undo',    f: 'Undo' },
        { a: 'edit-redo',    f: 'Redo' },
        { a: 'insert-shift', f: 'InsertRow' },
        { a: 'delete-row',   f: 'DeleteRow' },
        { a: 'append-day',   f: 'AppendRow' },
        { a: 'append-days',  f: 'AppendMonth' },
      ];

      let len = ui.length;

      for( let i = 0; i < len; i++ ) {
        $( '.app-' + ui[i].a ).on( 'click', function( e ) {
          ivy[ 'edit' + ui[i].f ]();
        });
      }

      $(".ivy-export-csv").exportable({
        source: plugin.element,
        filename: 'timesheet.csv'
      });

      $(".ivy-export-json").exportable({
        source: plugin.element,
        filename: 'timesheet.json'
      });
    },
    /**
     * Called to insert headings based on user's preferences.
     */
    initHeadings: function() {
      let plugin = this.ivy;
      let classReadOnly = plugin.settings.classCellReadOnly;
      let $table = $(plugin.getTableBodyElement());
      let $head = $table.prev( 'thead' ).find( 'tr:first' );

      let columns = this.getPreferences().columns;
      let len = columns.length;
      let html = '';

      for( let i = 0; i < len; i++ ) {
        html += ('<th>' + columns[i] + '</th>');
      }

      $head.append( html );
    },
    initTimesheet: function() {
      let self = this;
      let plugin = self.ivy;
      let prefs = self.getPreferences();
      let classReadOnly = plugin.settings.classCellReadOnly;
      let $table = $(plugin.getTableBodyElement());
      let $headers = $table.prev( 'thead' ).find( 'tr:first > th' );

      let html = '<tr>';
      let date_format = prefs.formats.format_date;

      $headers.each( function( index ) {
        html += '<td';

        if( [COL_DATED, COL_SHIFT, COL_TOTAL].includes( index ) ) {
          html += ' class="' + classReadOnly + '">';

          if( index === COL_DATED ) {
            let day = moment().startOf( 'month' ).subtract( 1, 'day' );
            day = self.getNextWorkDay( day );

            html += day.format( date_format );
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
     * Initializes the UI dialog that contains the schema editor.
     */
    initPreferencesDialog: function() {
      $("#settings").dialog({
        dialogClass: 'settings-dialog',
        autoOpen: false,
        maxHeight: $(window).height() * 0.75,
        height: 'auto',
        width: 'auto',
        closeOnEscape: true,
        position: {
          my: 'right top',
          at: 'right top',
          of: window
        },
        buttons: {
          Ok: function() {
            $(this).dialog( "close" );
          },
          Cancel: function() {
            $(this).dialog( "close" );
          },
        },
      });

      $('.app-settings-preferences').on( 'click', function( e ) {
        $("#settings").dialog('open');
      });
    },
    /**
     * Call once to initialize the schema editor for user preferences.
     */
    initPreferencesEditor: function() {
      let self = this;
      let e = document.getElementById( 'editor' );
      let editor = new JSONEditor( e, {
        theme: 'jqueryui',
        disable_collapse: true,
        disable_edit_json: true,
        disable_properties: true,
        disable_array_reorder: true,
        disable_array_delete_all_rows: true,
        disable_array_delete_last_row: true,
        required_by_default: true,
        no_additional_properties: true,
        remove_empty_properties: true,
        schema: user_preferences_schema,
        startval: self.getPreferences(),
      });
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
      let prefs = this.getPreferences();
      let d = day.clone();

      // Weekends don't last forever. Skipping two days would work, but
      // eventually we'll want configurable weekends. (Some people work
      // Tue through Sat, with Sun/Mon as weekends.)
      do {
        d.add( 1, 'day' );
      }
      while( (!prefs.inclusion.weekends) && d.toDate().isWeekend() );

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
        let prefs = this.getPreferences();
        let began = this.updateCellTime( row, COL_BEGAN );
        let ended = this.updateCellTime( row, COL_ENDED, began, 60 );
        let delta = moment.duration( ended.diff( began ) );
        let hours = delta.asHours();

        if( hours.toFixed ) {
          hours = Math.abs( hours ).toFixed( prefs.formats.format_prec );
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
        let prefs = this.getPreferences();
        $date.text( day.format( prefs.formats.format_date ) );
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
      let prefs = this.getPreferences();
      let $cell = $(plugin.getCell( row, col ));
      let time = $cell.text();

      if( time == '' ) {
        // Clone because moments are mutable.
        time = moment( defaultTime ).add( defaultIncrement, 'minutes' )
        time = time.format( prefs.formats.format_time );
        $cell.text( time );
      }

      return moment.utc( time, prefs.formats.format_time );
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
      let prefs = this.getPreferences();
      let sum = 0;

      // Sum shift times within the same day.
      for( let i = indexes[0]; i <= indexes[1]; i++ ) {
        sum += parseFloat( $(plugin.getCell( i, COL_SHIFT )).text(), 10 )||0;
      }

      if( sum.toFixed ) {
        sum = sum.toFixed( prefs.formats.format_prec );
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
});

