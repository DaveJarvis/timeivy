/**
 * The timesheet app must be applied to table bodies. This ensures that the
 * row and column calculations can leverage the rows and columns of the table
 * cells.
 */
;$(document).ready( function() {
  /** @const */
  const COL_DATED = 0;
  /** @const */
  const COL_TOTAL = 1;
  /** @const */
  const COL_SHIFT = 2;
  /** @const */
  const COL_BEGAN = 3;
  /** @const */
  const COL_ENDED = 4;

  /** @const */
  const APP_PREFERENCES = "ivy.preferences";

  /** @const */
  const APP_DATE_FORMAT_ACTIVE = "YYYY-MM-DD";

  /** @const */
  const APP_DATE_FORMAT_FIRST = "YYYY-MM-01";

  // Schema editor: https://github.com/json-editor/json-editor
  let user_preferences_schema = {
    "description": "Control application behaviour.",
    "title": "Preferences",
    "type": "object",
    "properties": {
      "active": {
        "description": "Edit timesheet data for this month.",
        "type": "string",
        "format": "date",
        "title": "Active Month",
      },
      "weekdays": {
        "description": "Predefine daily timeslots.",
        "type": "array",
        "title": "Weekdays",
        "format": "table",
        "uniqueItems": true,
        "items": {
          "type": "object",
          "required": "weekday",
          "properties": {
            "weekday": {
              "title": "Weekday",
              "type": "string",
              "enum": [0, 1, 2, 3, 4, 5, 6],
              "options": {
                "enum_titles": [
                  "Sunday",
                  "Monday",
                  "Tuesday",
                  "Wednesday",
                  "Thursday",
                  "Friday",
                  "Saturday",
                ],
              },
            },
            "times": {
              "title": "Times",
              "type": "array",
              "format": "table",
              "items": {
                "type": "object",
                "properties": {
                  "began": {
                    "type": "string",
                    "title": "Began",
                  },
                  "ended": {
                    "type": "string",
                    "title": "Ended",
                  },
                },
              },
            },
          },
        },
      },
      "inclusion": {
        "description": "Change what types of days are included.",
        "type": "object",
        "title": "Include",
        "properties": {
          "weekends": {
            "type": "boolean",
            "title": "Weekends",
            "format": "checkbox",
          },
          "holidays": {
            "type": "boolean",
            "title": "Holidays",
            "format": "checkbox",
          },
        },
      },
      "saving": {
        "description": "Change timesheet persistence behaviour.",
        "type": "object",
        "title": "Saving",
        "properties": {
          "timeout": {
            "description": "Time between autosaves, in seconds.",
            "type": "integer",
            "title": "Autosave",
            "format": "number",
          },
        },
      },
      "columns": {
        "description": "Columns for custom purposes (e.g. ticket number).",
        "type": "array",
        "title": "Columns",
        "format": "tabs",
        "maxItems": 3,
        "items": {
          "type": "string",
          "title": "Column",
        },
      },
      "formats": {
        "description": "Timesheet data formats; changing these can break the application.",
        "title": "Format",
        "type": "object",
        "properties": {
          "format_date": {
            "description": "Format for timesheet day cells.",
            "type": "string",
            "title": "Date",
            "default": APP_DATE_FORMAT_ACTIVE,
          },
          "format_time": {
            "description": "Format for timesheet time cells.",
            "type": "string",
            "title": "Time",
            "default": "HH:mm A",
          },
          "format_prec": {
            "description": "Decimal places to show for time calculations.",
            "type": "integer",
            "title": "Precision",
            "default": 2,
          },
          "format_keys": {
            "description": "Internal format used as timesheet key index for local data storage.",
            "type": "string",
            "title": "Primary Key",
            "default": "YYYYMM",
          },
        },
      },
    },
  };

  /**
   * Main application entry point.
   *
   * User-defined application preferences, including day templates.
   */
  let ivy = $("#ivy tbody").ivy({
    /**
     * Called when Ivy is initialized.
     */
    init: function() {
      this.initMenu();
      this.initHeadings();
      this.initTimesheet();
      this.initPreferencesDialog();
      this.initPreferencesEditor();
      this.initSuperhero();
      this.setChanged( false );
    },
    /**
     * Maps user-interface menu items to ivy function calls.
     */
    initMenu: function() {
      let plugin = this.getPlugin();

      let ui = [
        { a: "edit-cut",     f: "Cut" },
        { a: "edit-copy",    f: "Copy" },
        { a: "edit-undo",    f: "Undo" },
        { a: "edit-redo",    f: "Redo" },
        { a: "insert-shift", f: "DuplicateRow" },
        { a: "delete-row",   f: "DeleteRow" },
        { a: "append-day",   f: "AppendRow" },
      ];

      let len = ui.length;

      for( let i = 0; i < len; i++ ) {
        $( ".app-" + ui[i].a ).on( "click", function( e ) {
          ivy[ "edit" + ui[i].f ]();
        });
      }

      this._exporter_csv = $(".ivy-export-csv").exportable({
        source: plugin.element,
        filename: "timesheet.csv"
      });

      this._exporter_json = $(".ivy-export-json").exportable({
        source: plugin.element,
        filename: "timesheet.json"
      });
    },
    /**
     * Called to insert headings based on user's preferences.
     */
    initHeadings: function() {
      let plugin = this.getPlugin();
      let $table = $(plugin.getTableBodyElement());
      let $head = $table.prev( "thead" ).find( "tr:first" );

      let columns = this.getPreferences().columns;
      let len = columns.length;
      let html = "";

      for( let i = 0; i < len; i++ ) {
        html += ("<th>" + columns[i] + "</th>");
      }

      // Append the user-defined headings to the fixed application headings.
      $head.append( html );
    },
    /**
     * Reads data from local storage and drops in the information by month.
     */
    initTimesheet: function() {
      let self = this;
      let plugin = self.getPlugin();

      let cssTransient = plugin.settings.classCellTransient;
      let cssReadOnly = plugin.settings.classCellReadOnly;
      let timesheet = JSON.parse( this.loadTimesheet() );
      let css = [];

      $.each( timesheet, function() {
        let row = [];

        row.push( this.day );
        row.push( "" );
        row.push( "" );
        row.push( this.began.toTime() );
        row.push( this.ended.toTime() );

        // Prevent adding CSS for keys that have fixed styles.
        delete this.day;
        delete this.began;
        delete this.ended;

        // No need to recreate the CSS each time.
        if( css.length === 0 ) {
          css.push( cssReadOnly );
          css.push( cssTransient );
          css.push( cssTransient );

          // The following values have no styles:
          // * began (+1)
          // * ended (+1)
          // * all user-provided columns (+length)
          let len = Object.keys( this ).length + 2;

          for( let i = 0; i < len; i++ ) {
            css.push( "" );
          }
        }

        for( let k in this ) {
          if( this.hasOwnProperty( k ) ) {
            row.push( this[k] );
          }
        }

        plugin.editAppendRow( row, css );
      });

      self.fillTimesheet( css );
    },
    /**
     * Fills out the month's remaining days according to user preferences.
     */
    fillTimesheet: function( css ) {
      console.log( "fill timesheet" );

      let self = this;
      let plugin = self.getPlugin();
      let prefs = self.getPreferences();

      let date = $(plugin.getCellLastRow( COL_DATED )).text();
      let day = moment( date );
      let next = day.clone().add( 1, "month" );
      let date_format = prefs.formats.format_date;

      day.add( 1, "day" );

      while( day.month() < next.month() ) {
        if( !self.isWorkDay( day ) ) {
          day.add( 1, "day" );
          continue;
        }

        plugin.editAppendRow(
          [day.format(date_format), "", "", "8:00".toTime(), "9:00".toTime()],
          css
        );

        day = self.getNextWorkDay( day );
      }

      this.getPlugin().refreshCells();
    },
    /**
     * Initializes the UI dialog that contains the schema editor.
     */
    initPreferencesDialog: function() {
      $("#settings").dialog({
        dialogClass: "settings-dialog",
        autoOpen: false,
        maxHeight: $(window).height() * 0.75,
        height: "auto",
        width: "auto",
        closeOnEscape: true,
        position: {
          my: "right top",
          at: "right top",
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

      $(".app-settings-preferences").on( "click", function( e ) {
        $("#settings").dialog("open");
      });
    },
    /**
     * Call once to initialize the schema editor for user preferences.
     */
    initPreferencesEditor: function() {
      let self = this;
      let e = document.getElementById( "editor" );
      let editor = new JSONEditor( e, {
        theme: "jqueryui",
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
     * Saves changes and saves upon an unload event (tab close, window close,
     * navigate away, and such).
     */
    initSuperhero: function() {
      let self = this;
      let prefs = self.getPreferences();

      $(window).on( 'unload', function() {
        self.save();
      });

      // Save the application every so often.
      setInterval( function() { self.save(); }, 1000 * prefs.saving.timeout );
    },
    /**
     * Answers whether the given day is a work day.
     */
    isWorkDay: function( day ) {
      let prefs = this.getPreferences();

      return prefs.inclusion.weekends || (!day.toDate().isWeekend());
    },
    /**
     * Returns the day after the given day, taking into consideration
     * the user's proferences for including weekends. This does not
     * mutate the given day, but returns a new day that will be advanced
     * by 1, 2, or 3 days depending on weekend preferences.
     *
     * TODO: Take holidays into consideration.
     *
     * @param {object} day The momentjs date to advance by 1 day.
     * @return {object} A momentjs date instance advanced by n days.
     */
    getNextWorkDay: function( day ) {
      let prefs = this.getPreferences();
      let d = day.clone();

      // Weekends don't last forever. Skipping two days would work, but
      // eventually we'll want configurable weekends. (Some people work
      // Tue through Sat, with Sun/Mon as weekends.)
      do {
        d.add( 1, "day" );
      }
      while( !this.isWorkDay( d ) );

      return d;
    },
    /**
     * Calculates shifts and totals for each day.
     */
    refreshCells: function() {
      let plugin = this.getPlugin();
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
     *
     * @param {number} row The row value that changed.
     * @param {number} col The column value that changed.
     */
    onCellValueChangeAfter: function( row, col ) {
      // Trigger saving user-entered data.
      if( col !== COL_SHIFT || col !== COL_TOTAL || col !== COL_DATED ) {
        let plugin = this.getPlugin();
        let prefs = this.getPreferences();
        let began = this.updateCellTime( row, COL_BEGAN );

        // TODO: Use a preference for the time jump (60).
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

        // Enusre the changes are saved.
        this.setChanged( true );
      }
    },
    /**
     * Called after a row is inserted. This sets the begin time to the
     * end time of the previous row.
     *
     * @param {object} $clone The clone inserted after the given row.
     */
    onRowDuplicateAfter: function( $clone ) {
      let plugin = this.getPlugin();
      let ended = $clone.find( "td:eq(" + COL_ENDED + ")" ).text();

      $clone.find( "td:not(:first-child)" ).empty();

      let row = $clone.index();
      let col = COL_BEGAN;

      plugin.setCellValue( ended, row, col );

      // Sometimes setting the cell value doesn't refresh the daily
      // total. Calling refresh here has a slight performance hit, but
      // it ensures the correct daily total.
      plugin.refreshCells();
    },
    /**
     * After a row has been deleted, make sure that a row exists.
     *
     * @param {object} $row The row that was deleted.
     */
    onRowDeleteAfter: function( $row ) {
      let plugin = this.getPlugin();
      let rows = plugin.getRowCount();

      if( rows === 0 ) {
        let cssTransient = plugin.settings.classCellTransient;
        let cssReadOnly = plugin.settings.classCellReadOnly;
        let date = moment();
        let day = this.getNextWorkDay( date ).format( APP_DATE_FORMAT_FIRST );

        // TODO: Apply user preferences to fill in the new row.
        plugin.editAppendRow(
          [day, "", "", "8:00".toTime(), "9:00".toTime()],
          [cssReadOnly, cssTransient, cssTransient, "", ""]
        );
      }

      // Ensure the totals are updated.
      plugin.refreshCells();
    },
    /**
     * Called after a row is appended. This increments the day of the
     * month, if possible.
     *
     * @param {object} $row The row used as the template for the clone.
    onRowAppendAfter: function( $row ) {
      let $date = $row.find( "td:first" );
      let day = moment( $date.text() );
      let m1 = day.month();

      day = this.getNextWorkDay( day );

      let m2 = day.month();

      // Refresh the date if within the same month.
      if( m1 === m2 ) {
        let prefs = this.getPreferences();
        $date.text( day.format( prefs.formats.format_date ) );
      }

      this.getPlugin().refreshCells();
    },
     */
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
      let plugin = this.getPlugin();
      let prefs = this.getPreferences();
      let $cell = $(plugin.getCell( row, col ));
      let time = $cell.text();

      if( time == "" ) {
        // Clone because moments are mutable.
        time = moment( defaultTime ).add( defaultIncrement, "minutes" )
        time = time.format( prefs.formats.format_time );
        $cell.text( time );
      }

      return moment.utc( time, prefs.formats.format_time );
    },
    /**
     * Returns the first and last row for a consecutive series of equal values.
     */
    findConsecutive: function( row, col ) {
      let plugin = this.getPlugin();
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

      return [beginIndex, endedIndex];
    },
    /**
     * Given a start and end index, this computes the total number of hours
     * over all shifts in each day.
     */
    sumConsecutive: function( indexes ) {
      let plugin = this.getPlugin();
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
    /**
     * Called to set the state of the changed flag, which is used when saving
     * to determine if any action is required.
     *
     * @param {boolean} changed Set true when timesheet needs saving.
     * @private
     */
    setChanged: function( changed ) {
      this._changed = changed;
    },
    /**
     * Returns the changed state, which is used to determine whether saving
     * the timesheet is required.
     *
     * @return {boolean} Indicates whether the timesheet has been modified
     * by the user.
     * @private
     */
    getChanged: function() {
      return this._changed;
    },
    /**
     * Returns the storage facility for timesheets and preferences. Must
     * implement put and get methods to store and retrieve data.
     *
     * @return {object} A reference to the browser's local storage.
     * @protected
     */
    getDataStore: function() {
      return localStorage;
    },
    /**
     * Called to put a key/value pair into storage.
     *
     * @param {string} key The key to associate with the given value.
     * @param {object} value The value to associate with the given key.
     * @protected
     */
    put: function( key, value ) {
      this.getDataStore().put( key, value );
    },
    /**
     * Called to retrieve a value for a given key from storage.
     *
     * @param {string} key The key associated with the given value.
     * @param {object} value The value associated with the given key.
     * @protected
     */
    get: function( key, defaultValue ) {
      return this.getDataStore().get( key, defaultValue );
    },
    /**
     * Returns user-defined timesheet data from storage for the month being
     * edited (as set in the preferences).
     *
     * @public
     */
    loadTimesheet: function() {
      let month = this.getTimesheetKey();
      let timesheet = this.get( month );

      return timesheet;
    },
    /**
     * Saves a CSV file that represents user defined timesheets data to the
     * data store.
     *
     * @public
     */
    saveTimesheet: function() {
      let month = this.getTimesheetKey();
      let timesheet = this.getTimesheetData();

      this.put( month, timesheet );
    },
    /**
     * Returns the key that represents the month being edited. This value
     * is set in the prefereces.
     *
     * @return {object} The active year and month from user preferences.
     * @public
     */
    getTimesheetKey: function() {
      let prefs = this.getPreferences();
      let active = moment( prefs.active, APP_DATE_FORMAT_ACTIVE );
      let key = active.format( prefs.formats.format_keys );

      return key;
    },
    /**
     * Retrieves timesheet values from local storage.
     *
     * @return {object} The timesheet data stored against the month key,
     * @public
     */
    getTimesheetData: function() {
      let plugin = this.getPlugin();
      let cssClass = plugin.settings.classCellTransient;
      let exporter = this.getExporter();

      // Export the tabular data, excluding elements marked as protected.
      // When importing, all the table elements are refreshed.
      let exported = exporter.export_json( "." + cssClass );

      return exported;
    },
    /**
     * Returns the exporter used to slurp the table data.
     *
     * @return {object} The tabular data in a machine-readable format.
     * @public
     */
    getExporter: function() {
      return this._exporter_json;
    },
    /**
     * Called at regular intervals to save the timesheet.
     *
     * @public
     */
    save: function() {
      // TODO: Introspect the input field to get its value, if editing.
      // This will prevent the race-condition that isEditing() avoids.
      if( this.getChanged() && this.getPlugin().isEditing() === false ) {
        // Avoid concurrent saves by clearing the dirty flag first.
        this.setChanged( false );
        this.saveTimesheet();
      }
    },
    /**
     * @see user_preferences_schema
     */
    getDefaultPreferences: function() {
      return {
        "active": moment().format( APP_DATE_FORMAT_FIRST ),
        "formats": {
          "format_date": APP_DATE_FORMAT_ACTIVE,
          "format_time": "hh:mm A",
          "format_prec": 2,
          "format_keys": "YYYYMM",
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
        "saving": {
          "timeout": 5,
        },
        "inclusion": {
          "weekends": false,
          "holidays": false
        },
        "columns": ["Description"]
      };
    },
    getPreferences: function() {
      return this.get( APP_PREFERENCES, this.getDefaultPreferences() );
    },
    setPreferences: function( prefs ) {
      this.put( APP_PREFERENCES, prefs );
    },
    getPlugin: function() {
      return this.ivy;
    }
  });
});

