/**
 * Time tracking software for hourly billing.
 *
 * Copyright 2018 White Magic Software, Ltd.
 */
;(function( $, window, document, undefined ) {
  'use strict';

  /** @const */
  const PLUGIN_NAME = 'ivy';
  /** @const */
  const PLUGIN_KEY = 'plugin_' + PLUGIN_NAME;

  /**
   * Cells cannot be indexed to values less than MIN_INDEX.
   *
   * @const
   */
  const MIN_INDEX = 0;
  /**
   * Cells cannot be indexed to values greater than MAX_INDEX.
   *
   * @const
   */
  const MAX_INDEX = 1000;

  var defaults = {
    classActiveCell:      'active',
    classActiveCellInput: 'edit',
    classCellReadOnly:    'readonly',
    maxPageSize:          30,
    dispatchKeysNavigate: [
      { k: 'enter',        f: 'navigateDown' },
      { k: 'up',           f: 'navigateUp' },
      { k: 'down',         f: 'navigateDown' },
      { k: 'left',         f: 'navigateLeft' },
      { k: 'right',        f: 'navigateRight' },
      { k: 'ctrl+up',      f: 'navigateUpSkip' },
      { k: 'ctrl+down',    f: 'navigateDownSkip' },
      { k: 'ctrl+left',    f: 'navigateLeftSkip' },
      { k: 'ctrl+right',   f: 'navigateRightSkip' },
      { k: 'pageup',       f: 'navigatePageUp' },
      { k: 'pagedown',     f: 'navigatePageDown' },
      { k: 'home',         f: 'navigateRowHome' },
      { k: 'end',          f: 'navigateRowEnd' },
      { k: 'ctrl+home',    f: 'navigateHome' },
      { k: 'ctrl+end',     f: 'navigateEnd' },
      { k: 'shift+tab',    f: 'navigateLeft' },
      { k: 'tab',          f: 'navigateRight' },

      { k: 'f2',           f: 'editStart' },
      { k: 'ctrl+x',       f: 'editCut' },
      { k: 'ctrl+c',       f: 'editCopy' },
      { k: 'ctrl+ins',     f: 'editCopy' },
      { k: 'del',          f: 'editErase' },
      { k: 'shift+del',    f: 'editDeleteRow' },
      { k: 'ins',          f: 'editInsertRow' },
      { k: 'ctrl+i',       f: 'editInsertRow' },
      { k: 'command+i',    f: 'editInsertRow' },
      { k: 'shift+space',  f: 'editAppendRow' },

      { k: 'ctrl+s',       f: 'editSave' },
      { k: 'ctrl+z',       f: 'editUndo' },
      { k: 'command+z',    f: 'editUndo' },
      { k: 'ctrl+shift+z', f: 'editRedo' },
      { k: 'ctrl+y',       f: 'editRedo' },
      { k: 'command+y',    f: 'editRedo' },
    ],
    dispatchKeysEdit: [
      { k: 'up',           f: 'navigateUp' },
      { k: 'down',         f: 'navigateDown' },
      { k: 'shift+tab',    f: 'navigateLeft' },
      { k: 'tab',          f: 'navigateRight' },

      { k: 'enter',        f: 'editStop' },
      { k: 'esc',          f: 'editCancel' },
    ],
    /**
     * Called when the plugin is initialized.
     */
    init: function() {
    },
    /**
     * Called before users can edit the data.
     */
    refreshCells: function() {
    },
    /**
     * Called immediately before the active cell value changes.
     *
     * @param {string} cellValue The value for the new cell.
     * @param {number} row The cellValue row that has changed.
     * @param {number} col The cellValue column that has changed.
     * @return {string} Value to set at row and column.
     */
    onCellValueChangeBefore: function( cellValue, row, col ) {
      return cellValue;
    },
    /**
     * Called immediately after the given row and column cell value changes.
     *
     * @param {number} row The cellValue row that has changed.
     * @param {number} col The cellValue column that has changed.
     */
    onCellValueChangeAfter: function( row, col ) {
    },
    /**
     * Called immediately after the given row and column cell value changes.
     *
     * @param {object} $row The row used as the template for the clone.
     * @param {object} $clone The clone inserted after the given row.
     */
    onRowInsertAfter: function( $row, $clone ) {
    },
    /**
     * Called immediately after the given row and column cell value changes.
     *
     * @param {object} $row The row used as the template for the clone.
     * @param {object} $clone The clone appended to the last row.
     */
    onRowAppendAfter: function( $row, $clone ) {
    },
    /**
     * Called immediately after the given row is deleted.
     *
     * @param {object} $row The row that was deleted.
     */
    onRowDeleteAfter: function( $row ) {
    }
  };

  /**
   * Applies settings, initializes keyboard bindings.
   *
   * @constructor
   */
  function Plugin( element, options ) {
    this.element = element;

    this.settings = $.extend({}, defaults, options );
    this.settings.ivy = this;
    this._defaults = defaults;
    this._name = PLUGIN_NAME;
    this._cell = [MIN_INDEX, MIN_INDEX];
    this._$cellInput = false;
    this._commandExecutor = new CommandExecutor();
    this.init();
  }

  /**
   * Permit the plug-in to be extended.
   */
  $.extend( Plugin.prototype, {
    /**
     * Called during plugin construction to bind event handlers.
     *
     * @protected
     */
    init: function() {
      // Notify extensions that the plugin is ready.
      this.settings.init();

      // Notify extensions that cells must be refreshed.
      this.refreshCells();

      // Prevent keys from bubbling to the browser container.
      this.setup();

      // Start in navigation mode.
      this.bindNavigateMode();

      // Start edit mode when any non-navigable key is pressed.
      this.bindPrintableKeys();

      // Allow click (mouse, tap, etc.) navigation.
      this.bindNavigationClicks();

      // Trap pasting into the browser.
      this.bindPasteHandler();

      // Highlight the default cell location.
      this.activate();
    },
    /**
     * Delegates to the settings to inform the client that the cells need
     * to be refreshed.
     */
    refreshCells: function() {
      this.settings.refreshCells();
    },
    /**
     * Calls the key binding library to prevent keys from bubbling to the
     * browser itself.
     *
     * @private
     */
    setup: function() {
      Mousetrap.prototype.stopCallback = function( e, element, combo ) {
        e.preventDefault();
        return false;
      }
    },
    /**
     * Jumps to a given table cell. This is used upon receiving click,
     * double-click, tap, and double-tap events.
     *
     * @param {object} $cell The cell to activate.
     * @public
     */
    navigateTableCell: function( $cell ) {
      let col = $cell.parent().children().index( $cell );
      let row = $cell.parent().parent().children().index( $cell.parent() );

      // Navigating from the active cell to itself would undo issues,
      // so ensure that the click navigation can be undone by filtering
      // out clicks to the same cell.
      if( this.isActiveCell( row, col ) === false ) {
        this.navigate( row, col );
      }
    },
    /**
     * Binds single and double mouse clicks to navigation.
     *
     * @protected
     */
    bindNavigationClicks: function() {
      let plugin = this;
      let $table = $(plugin.getTableBodyElement());

      $table.on( 'click', 'td', function() {
        plugin.navigateTableCell( $(this) );
      });

      $table.on( 'dblclick doubletap', 'td', function() {
        plugin.navigateTableCell( $(this) );
        plugin.editStart();
      });
    },
    /**
     * Start cell editing when a printable character is typed.
     *
     * @protected
     */
    bindPrintableKeys: function() {
      let plugin = this;
      let $table = $(plugin.getTableBodyElement());

      $table.on( 'keypress', function( e ) {
        // If the character code is numeric, it is a non-printable char.
        var charCode = (typeof e.which === 'number') ? e.which : e.keyCode;

        // Control keys and meta keys (Mac Command ⌘) do not trigger edit mode.
        if( e.type === 'keypress' && charCode && !e.ctrlKey && !e.metaKey ) {
          plugin.editStart( String.fromCharCode( charCode ) );

          // Some browsers pass the pressed key into the input field... while
          // other browsers do not. This levels the playing field.
          e.stopPropagation();
          e.preventDefault();
        }
      });
    },
    /**
     * Stop cell editing when a printable character is typed.
     *
     * @protected
     */
    unbindPrintableKeys: function() {
      let plugin = this;
      let $table = $(plugin.getTableBodyElement());

      $table.off( 'keypress' );
    },
    /**
     * Resets the key bindings and injects a new mapping.
     *
     * @param {array} keymap The list of keyboard events to bind.
     * @private
     */
    _bindDispatchKeys: function( keymap ) {
      Mousetrap.reset();

      let plugin = this;

      // Apply configurable keyboard bindings.
      for( let i = 0; i < keymap.length; i++ ) {
        let k = keymap[i].k;
        let f = keymap[i].f;

        Mousetrap.bind( k, function( e ) {
          // Call the mapped function by its string name.
          plugin[ f ]();
        });
      }
    },
    /**
     * Binds the keyboard to cell model navigation.
     *
     * @protected
     */
    bindNavigateMode: function() {
      let plugin = this;
      plugin._bindDispatchKeys( this.settings.dispatchKeysNavigate );
    },
    /**
     * Binds the keyboard to cell edits.
     *
     * @protected
     */
    bindEditMode: function() {
      let plugin = this;
      plugin._bindDispatchKeys( this.settings.dispatchKeysEdit );
    },
    /**
     * Binds paste events to replace cell content.
     *
     * @protected
     */
    bindPasteHandler: function() {
      let plugin = this;

      $(document).on( 'paste', function( e ) {
        if( e.originalEvent ) {
          let buffer = e.originalEvent.clipboardData.getData( 'text' );
          plugin.cellUpdate( buffer );

          e.stopPropagation();
          e.preventDefault();
        }
      });
    },
    /**
     * Primitive to sanitize the row and column values. This will return
     * MIN_INDEX if index is less than MIN_INDEX, or max if index is
     * greater than max, otherwise this returns the index.
     *
     * @param {number} i The row or column index to sanitize.
     * @param {number} max The maximum extent allowed for the index value.
     * @return {number} Sanitized cell index number.
     * @private
     */
    _sanitizeCellIndex: function( i, max ) {
      return i = i > max ? max : (i < MIN_INDEX ? MIN_INDEX : i);
    },
    /**
     * Primitive to get the table body via jQuery.
     *
     * @return {object} An element that represents the tbody containing cells.
     * @public
     */
    getTableBodyElement: function() {
      return $(this.element)[ 0 ];
    },
    /**
     * Primitive to get the active cell row from the model.
     *
     * @return {number} The active cell row, 0-based.
     * @public
     */
    getCellRow: function() {
      return this._cell[ 0 ];
    },
    /**
     * Primitive to get the active cell column from the model.
     *
     * @return {number} The active cell column, 0-based.
     * @public
     */
    getCellCol: function() {
      return this._cell[ 1 ];
    },
    /**
     * Primitive to change the cell row without updating the user interface.
     * Any value that exceeds the table range is set to the extent of the
     * table range.
     *
     * @param {number} row The new value for the active cell row.
     * @postcondition The cell data model row is set to the given row.
     * @protected
     */
    setCellRow: function( row ) {
      this._cell[0] = this._sanitizeCellIndex( row, this.getMaxRows() );
    },
    /**
     * Primitive to change the cell column without updating the user interface.
     * Any value that exceeds the table range is set to the extent of the
     * table range.
     *
     * @param {number} col The new value for the active cell column.
     * @postcondition The cell data model column is set to the given column.
     * @protected
     */
    setCellCol: function( col ) {
      this._cell[1] = this._sanitizeCellIndex( col, this.getMaxCols() );
    },
    /**
     * Primitive to get the table cell at the given row and column. The row
     * and column values must be sanitized prior to calling.
     *
     * @param {number} row The cell value's row to retrieve.
     * @param {number} col The cell value's column to retrieve.
     * @return {string} The cell value at the given row and column.
     * @public
     */
    getCell: function( row, col ) {
      let plugin = this;
      let table = this.getTableBodyElement();

      return table.rows[ row ].cells[ col ];
    },
    /**
     * Primitive to get the last cell in the table for a column. The column
     * value must be sanitized prior to calling.
     *
     * @param {number} col The cell value's column to retrieve.
     * @return {string} The cell value at the last row and given column.
     * @public
     */
    getCellLastRow: function( col ) {
      let row = this.getMaxRows();

      return this.getCell( row, col );
    },
    /**
     * Primitive to get the active table cell element, which can be referenced
     * using jQuery.
     *
     * @return {object} This returns a td element that can be styled.
     * @public
     */
    getActiveCell: function() {
      let row = this.getCellRow();
      let col = this.getCellCol();

      return this.getCell( row, col );
    },
    /**
     * Primitive that returns the maximum number of table rows.
     *
     * @return {number} The last row index, 0-based.
     * @public
     */
    getMaxRows: function() {
      let table = this.getTableBodyElement();
      let max = table.rows.length - 1;

      return max;
    },
    /**
     * Primitive that returns the maximum number of table columns.
     *
     * @return {number} The last column index, 0-based.
     * @public
     */
    getMaxCols: function() {
      let table = this.getTableBodyElement();
      let max = table.rows[ MIN_INDEX ].cells.length - 1;

      return max;
    },
    isActiveCell: function( row, col ) {
      return this.isActiveCellRow( row ) && this.isActiveCellCol( col );
    },
    isActiveCellRow: function( row ) {
      return row === this.getCellRow();
    },
    isActiveCellCol: function( col ) {
      return col === this.getCellCol();
    },
    /**
     * Answers whether the active cell has a read-only class.
     *
     * @return {boolean} True means the active cell has a read-only class.
     */
    isActiveCellReadOnly: function() {
      let $cell = $(this.getActiveCell());
      return $cell.hasClass( this.settings.classCellReadOnly );
    },
    /**
     * Primitive to add the active class to the table cell represented by
     * the cell model.
     *
     * @postcondition The active cell has its active cell class added.
     * @protected
     */
    activate: function() {
      // Sanitize the row.
      this.setCellRow( this.getCellRow() );

      // Sanitize the column.
      this.setCellCol( this.getCellCol() );

      let $cell = $(this.getActiveCell());
      $cell.addClass( this.settings.classActiveCell );
    },
    /**
     * Primitive to remove the active class from the table cell represented by
     * the cell model.
     *
     * @postcondition The active cell has its active cell class removed.
     * @protected
     */
    deactivate: function() {
      let $cell = $(this.getActiveCell());
      $cell.removeClass( this.settings.classActiveCell );
    },
    /**
     * Returns the state of the plugin, which can be restored using the
     * restore state function.
     *
     * @return {object} The plugin's state.
     * @public
     */
    cellStateRetrieve: function() {
      let $cell = $(this.getActiveCell());
      let result = {
        cellRow: this.getCellRow(),
        cellCol: this.getCellCol(),
        cellValue: $cell.text()
      };

      return result;
    },
    /**
     * Reverts the state of the plugin from a previously retrieved state.
     *
     * @param {object} state A state object.
     * @private
     */
    cellStateRestore: function( state ) {
      this._navigate( state.cellRow, state.cellCol );
      this.setActiveCellValue( state.cellValue );
    },
    /**
     * @private
     */
    getCommandExecutor: function() {
      return this._commandExecutor;
    },
    /**
     * Delegates execution of a command to the command executor, which records
     * commands for undo and redo purposes.
     *
     * @private
     */
    execute: function( command ) {
      this.getCommandExecutor().execute( command );
    },
    /**
     * Ensure that the document body retains focus. This has the side
     * effect that when the table is loaded, the user can start typing
     * immediately.
     *
     * @public
     */
    focus: function() {
      $(this.getTableBodyElement()).focus();
    },
    /**
     * Navigates to the given row and column without storing the command
     * in the undo/redo history.
     *
     * @param {number} row The new row number for the active cell.
     * @param {number} col The new column number for the active cell.
     * @postcondition The previously activated cell is deactivated.
     * @postcondition The cell at (row, col) is activated.
     * @postcondition The table body has input focus.
     * @private
     */
    _navigate: function( row, col ) {
      this.deactivate();
      this.setCellRow( row );
      this.setCellCol( col );
      this.activate();
      this.focus();
    },
    /**
     * Changes the active cell. All other navigate functions call this
     * function to stop cell editing and navigate to another cell.
     *
     * @param {number} row The new row number for the active cell.
     * @param {number} col The new column number for the active cell.
     * @postcondition Cell editing has stopped.
     * @postcondition The previously activated cell is deactivated.
     * @postcondition The cell at (row, col) is activated.
     * @postcondition The undo buffer includes this navigate command.
     * @postcondition The table body has input focus.
     * @public
     */
    navigate: function( row, col ) {
      this.editStop();
      this.execute( new CommandNavigate( this, row, col ) );
    },
    /**
     * Helper method for navigating to a different row within the active
     * column.
     *
     * @param {number} skip The number of cells to move.
     * @protected
     */
    navigateRow: function( skip ) {
      this.navigate( this.getCellRow() + skip, this.getCellCol() );
    },
    /**
     * Helper method for navigating to a different column within the active
     * row.
     *
     * @param {number} skip The number of cells to move.
     * @protected
     */
    navigateCol: function( skip ) {
      this.navigate( this.getCellRow(), this.getCellCol() + skip );
    },
    /**
     * @public
     */
    navigatePageUp: function() {
      this.navigateRow( -this.settings.maxPageSize );
    },
    /**
     * @public
     */
    navigatePageDown: function() {
      this.navigateRow( +this.settings.maxPageSize );
    },
    /**
     * Changes the active cell location upwards one cell.
     *
     * @public
     */
    navigateUp: function() {
      this.navigateRow( -1 );
    },
    /**
     * Changes the active cell location downwards one cell.
     *
     * @public
     */
    navigateDown: function() {
      this.navigateRow( +1 );
    },
    /**
     * Changes the active cell location leftwards one cell.
     *
     * @public
     */
    navigateLeft: function() {
      this.navigateCol( -1 );
    },
    /**
     * Changes the active cell location rightwards one cell.
     *
     * @public
     */
    navigateRight: function() {
      this.navigateCol( +1 );
    },
    /**
     * Changes the active cell location upwards to the first non-empty cell.
     *
     * @public
     */
    navigateUpSkip: function() {
      console.log( 'Navigate up skip' );
      this.navigateRow( -1 );
    },
    /**
     * Changes the active cell location downwards to the first non-empty cell.
     *
     * @public
     */
    navigateDownSkip: function() {
      console.log( 'Navigate down skip' );
      this.navigateRow( +1 );
    },
    /**
     * Changes the active cell location leftwards to the first non-empty cell.
     *
     * @public
     */
    navigateLeftSkip: function() {
      console.log( 'Navigate left skip' );
      this.navigateCol( -1 );
    },
    /**
     * Changes the active cell location rightwards to the first non-empty cell.
     *
     * @public
     */
    navigateRightSkip: function() {
      console.log( 'Navigate right skip' );
      this.navigateCol( +1 );
    },
    /**
     * Changes the active cell location to the upper-left cell.
     *
     * @public
     */
    navigateHome: function() {
      this.navigate( MIN_INDEX, MIN_INDEX );
    },
    /**
     * Changes the active cell location to the lower-right cell.
     *
     * @public
     */
    navigateEnd: function() {
      this.navigate( MAX_INDEX, MAX_INDEX );
    },
    /**
     * Changes the active cell location to the left-most column.
     *
     * @public
     */
    navigateRowHome: function() {
      this.navigateCol( -MAX_INDEX );
    },
    /**
     * Changes the active cell location to the right-most column.
     *
     * @public
     */
    navigateRowEnd: function() {
      this.navigateCol( +MAX_INDEX );
    },
    /**
     * Copies the active cell's contents and then erases the contents.
     *
     * @public
     */
    editCut: function() {
      this.execute( new CommandCellCut( this ) );
    },
    /**
     * Copies the active cell's contents into the clipboard buffer.
     *
     * @private
     */
    editCopy: function() {
      let $temp = $('<input>');
      let $cell = $(this.getActiveCell());
      $('body').append( $temp );
      $temp.val( $cell.text() ).select();
      document.execCommand( 'copy' );
      $temp.remove();
    },
    /**
     * Erases the active cell's contents.
     *
     * @postcondition The update operation is added to the stack.
     * @postcondition The active cell is empty.
     * @postcondition The client is notified of the erase event.
     * @public
     */
    editErase: function() {
      this.cellUpdate( '' );
    },
    /**
     * Sets the active cell's contents so long as the cell is not read-only.
     *
     * @precondition The active cell is not read-only. 
     * @postcondition The active cell value is changed (if not read-only).
     * @param {string} cellValue The new cell value.
     * @public
     */
    cellUpdate: function( cellValue ) {
      let plugin = this;

      if( !plugin.isActiveCellReadOnly() ) {
        plugin.execute( new CommandCellUpdate( this, cellValue ) );
      }
    },
    /**
     * Creates an input field at the active table cell using the
     * given cell's dimensions.
     *
     * @param {object} $cell Contains the cell width and text value used
     * to create and populate the cell input field.
     * @private
     */
    cellInputCreate: function( $cell, charCode ) {
      $cell.addClass( this.settings.classActiveCellInput );

      let cellWidth = $cell.width();
      let cellValue = charCode ? charCode : $cell.text();
      let $input = $('<input>');

      $input.css({
        'width': cellWidth,
        'max-width': cellWidth,
      });

      $input.val( cellValue );

      return $input;
    },
    /**
     * Destroys the previously created input field.
     *
     * @return The input field value.
     * @private
     */
    cellInputDestroy: function() {
      let $input = this.getCellInput();
      let cellValue = $input.val();

      $input.remove();
      this.setCellInput( false );

      return cellValue;
    },
    /**
     * @protected
     */
    getCellInput: function() {
      return this._$cellInput;
    },
    /**
     * Sets the input field widget used for editing by the user.
     *
     * @param {object} $input The new value for the cell input field widget.
     * @protected
     */
    setCellInput: function( $input ) {
      this._$cellInput = $input;
    },
    /**
     * Enables cell editing for the active table cell, so long as the cell
     * is not marked as read-only.
     *
     * @param {string} charCode Set the initial value to this character.
     * @public
     */
    editStart: function( charCode ) {
      let plugin = this;

      if( !plugin.isActiveCellReadOnly() ) {
        plugin.execute( new CommandCellEditStart( plugin, charCode ) );
      }
    },
    /**
     * Disables cell editing for the active table cell. This must not add
     * the command to the undo/redo history. This ensures that the cell
     * is being edited prior to destroying it.
     *
     * @return {boolean} False means the cell was not being edited.
     * @public
     */
    editStop: function() {
      let $input = this.getCellInput();
      let edit = false;

      // Ensure edit mode is engaged before disabling edit mode.
      if( $input !== false ) {
        let plugin = this;
        let cellValue = plugin.cellInputDestroy();
        let $cell = $(plugin.getActiveCell());

        $cell.removeClass( plugin.settings.classActiveCellInput );

        plugin.setActiveCellValue( cellValue );
        plugin.focus();

        plugin.bindNavigateMode();
        plugin.bindPrintableKeys();

        edit = true;
      }

      return edit;
    },
    /**
     * Called when a new value is applied to the active cell.
     *
     * @postcondition The client callback onCellValueChanged is called.
     * @postcondition The cell value at the given row and column is changed
     * to the result from the callback (default is the given cell value).
     * @param {string} v The new active cell value.
     * @param {number} row The row for the value to change.
     * @param {number} col The columns for the value to change.
     * @public
     */
    setCellValue: function( v, row, col ) {
      let plugin = this;

      v = plugin.settings.onCellValueChangeBefore( v, row, col );
      $(plugin.getCell( row, col )).text( v );
      plugin.settings.onCellValueChangeAfter( row, col );
    },
    /**
     * Changes the active cell value to the given value.
     *
     * @param {string} cellValue The new active cell value.
     * @public
     */
    setActiveCellValue: function( cellValue ) {
      let plugin = this;
      let row = plugin.getCellRow();
      let col = plugin.getCellCol();

      plugin.setCellValue( cellValue, row, col );
    },
    /**
     * Sets the active cell's contents without notifying clients.
     *
     * @param {string} v The new active cell value.
     * @protected
     */
    setActiveCellValueSilent: function( v ) {
      console.log( 'setActiveCellValueSilent ' + v );

      if( v !== false ) {
        let plugin = this;
        let cell = plugin.getActiveCell();
        $(cell).text( v );
      }
    },
    /**
     * Reverts any edits to their previous value; if there are no edits in
     * progress, then this will do nothing.
     *
     * @protected
     */
    editCancel: function() {
      // Prevent multiple undo actions from consecutive Esc key presses.
      if( this.editStop() ) {
        this.editUndo();
      }
    },
    /**
     * @public
     */
    editSave: function() {
      console.log( 'Save cells' );
    },
    /**
     * Adds a new column to the end of columns.
     *
     * @public
     */
    editInsertColumn: function( name ) {
      this.execute( new CommandInsertColumn( this, name ) );
    },
    /**
     * Removes the column with the given name.
     *
     * @public
     */
    editDeleteColumn: function( name ) {
      this.execute( new CommandDeleteColumn( this, name ) );
    },
    /**
     * Inserts a new row before the active cell row.
     *
     * @public
     */
    editInsertRow: function() {
      this.execute( new CommandInsertRow( this ) );
    },
    /**
     * Removes the existing row for the active cell row.
     *
     * @public
     */
    editDeleteRow: function() {
      // Don't delete the last row.
      if( this.getMaxRows() > 0 ) {
        this.execute( new CommandDeleteRow( this ) );
      }
    },
    /**
     * Appends a new row to the end.
     *
     * @public
     */
    editAppendRow: function() {
      this.execute( new CommandAppendRow( this ) );
    },
    /**
     * Un-executes the previously executed command.
     *
     * @public
     */
    editUndo: function() {
      this.getCommandExecutor().undo();
    },
    /**
     * Re-executes the previously un-executed command.
     *
     * @public
     */
    editRedo: function() {
      this.getCommandExecutor().redo();
    }
  });

  /**
   * Tracks the list of commands that were executed so that they can be
   * undone or redone as desired. This uses a stack to track the commands.
   */
  class CommandExecutor {
    constructor() {
      this._undoStack = [];
      this._redoStack = [];
    }

    /**
     * Returns undo command stack.
     *
     * @return {array} Stack of commands.
     * @private
     */
    getUndoStack() {
      return this._undoStack;
    }

    /**
     * Returns redo command stack.
     *
     * @return {array} Stack of commands.
     * @private
     */
    getRedoStack() {
      return this._redoStack;
    }

    /**
     * Executes the given command and then adds the command to the stack
     * so that it can be undone at a later time.
     *
     * @param {object} command The command to execute and record.
     * @public
     */
    execute( command ) {
      command.execute();
      let stack = this.getUndoStack();
      let previous = stack.peek();

      if( !command.equals( previous ) ) {
        stack.push( command );
      }
    }

    /**
     * Pops the most recently executed command off the stack and calls the
     * command's routine to undo the command's changes to the data.
     *
     * @precondition None
     * @postcondition The most recent command is popped off the undo stack.
     * @postcondition The popped command is pushed onto the redo stack.
     * @public
     */
    undo() {
      let command = this.getUndoStack().pop();

      if( typeof command !== 'undefined' ) {
        command.undo();
        this.getRedoStack().push( command );
      }
    }

    /**
     * Pops a command off the redo stack and then executes the command, which
     * pushes it onto the undo stack.
     *
     * @precondition None
     * @postcondition The most recent redo operations is popped from its stack.
     * @postcondition The redo operation is performed.
     * @public
     */
    redo() {
      let command = this.getRedoStack().pop();

      if( typeof command !== 'undefined' ) {
        this.execute( command );
      }
    }
  }

  /**
   * Defines a general command with the ability to restore state.
   */
  class Command {
    constructor( plugin ) {
      this._plugin = plugin;
      this.saveState();
    }

    /**
     * All commands override this to expose a consistent interface.
     *
     * @protected
     */
    execute() { }

    /**
     * Answers whether the given command has the same state as this command.
     * This compares the command states to avoid edge cases whereby the
     * user navigates to the same cell using different key combinations.
     *
     * @return {boolean} True when the states are the same.
     */
    equals( that ) {
      return typeof that === 'undefined' ?
        false :
        Object.equals( this.getState(), that.getState() );
    }

    /**
     * Restore's the previously saved cell state.
     */
    undo() {
      let plugin = this.getPlugin();
      plugin.cellStateRestore( this.getState() );
      plugin.refreshCells();
    }

    /**
     * Returns a unique identifier for the command's state.
     */
    getId() {
      return (new Date()).getTime();
    }

    /**
     * Stashes the plugin's state so that undo can be called upon it later.
     */
    saveState() {
      this.setState( this.getPlugin().cellStateRetrieve() );
    }

    setState( state ) {
      this._state = state;
    }

    getState() {
      return this._state;
    }

    getPlugin() {
      return this._plugin;
    }
  }

  /**
   * Changes the active cell location.
   */
  class CommandNavigate extends Command {
    constructor( plugin, row, col ) {
      super( plugin );
      this._row = row;
      this._col = col;
    }

    execute() {
      let plugin = this.getPlugin();
      plugin._navigate( this._row, this._col );
    }
  }

  /**
   * Copies the active cell value into the paste buffer, then erases it.
   */
  class CommandCellCut extends Command {
    constructor( plugin ) { super( plugin ); }

    execute() {
      let plugin = this.getPlugin();
      plugin.editCopy();
      plugin.editErase();
    }
  }

  /**
   * Initiates cell editing, which records the active cell state immediately
   * prior to injecting an input field.
   */
  class CommandCellEditStart extends Command {
    constructor( plugin, charCode ) {
      super( plugin );
      this._charCode = charCode;
    }

    execute() {
      let plugin = this.getPlugin();
      plugin.bindEditMode();
      plugin.unbindPrintableKeys();

      let $cell = $(plugin.getActiveCell());
      let $input = plugin.cellInputCreate( $cell, this._charCode );

      console.log( $cell.html() );

      // Keep track of the input field editor.
      plugin.setCellInput( $input );

      // Replace the cell's HTML value with an input field.
      $cell.html( $input );
      $input.focus();

      $input.on( 'focusout', function() {
        plugin.editStop();
      });
    }
  }

  /**
   * Changes the active cell value.
   */
  class CommandCellUpdate extends Command {
    constructor( plugin, cellValue ) {
      super( plugin );
      this._cellValue = cellValue;
    }

    execute() {
      this.getPlugin().setActiveCellValue( this._cellValue );
    }
  }

  class CommandInsertColumn extends Command {
    constructor( plugin, name ) {
      super( plugin );

      this._columnName = name;
    }

    execute() {
      let plugin = this.getPlugin();
      plugin.deactivate();

      let $body = $(plugin.getTableBodyElement()).parent().find( 'thead' );

      plugin.activate();
    }
  }

  /**
   * Inserts the active row after cloning it.
   */
  class CommandInsertRow extends Command {
    constructor( plugin ) {
      super( plugin );
    }

    execute() {
      let plugin = this.getPlugin();
      plugin.deactivate();

      let $row = this.getRow();
      let $clone = $row.clone();

      // Uniquely identify the row so that multiple clones of the same row
      // will result in different states, and thereby join the undo stack.
      this.setState({ id: this.getId(), clone: $clone });
      this.inject( $clone );

      plugin.activate();
    }

    inject( $clone ) {
      let $row = this.getRow();
      
      $row.after( $clone );
      this.getPlugin().settings.onRowInsertAfter( $row, $clone );
    }

    /**
     * Removes the row that was previously inserted.
     */
    undo() {
      this.getState().clone.remove();
      this.getPlugin().refreshCells();
    }

    getRow() {
      let $cell = $(this.getPlugin().getActiveCell());
      return $cell.closest( 'tr' );
    }
  }

  /**
   * Clones and appends the last row to the table.
   */
  class CommandAppendRow extends CommandInsertRow {
    constructor( plugin ) {
      super( plugin );
    }

    inject( $clone ) {
      let $row = this.getRow();
      
      $row.after( $clone );
      this.getPlugin().settings.onRowAppendAfter( $row, $clone );
    }

    getRow() {
      let $body = $(this.getPlugin().getTableBodyElement());
      let $cell = $body.find( 'tr:last' );
      return $cell;
    }
  }

  /**
   * Deletes the active row.
   */
  class CommandDeleteRow extends Command {
    constructor( plugin ) {
      super( plugin );
    }

    execute() {
      let plugin = this.getPlugin();
      plugin.deactivate();

      let $cell = $(plugin.getActiveCell());
      let $row = $cell.closest( 'tr' );
      this.setState({ id: this.getId(), row: $row });

      $row.remove();

      plugin.settings.onRowDeleteAfter( $row );
      plugin.refreshCells();
      plugin.activate();
    }

    /**
     * Removes the row that was previously inserted.
     */
    undo() {
      let plugin = this.getPlugin();
      plugin.editInsertRow();
      plugin.refreshCells();
    }
  }

  $.fn[ PLUGIN_NAME ] = function( options ) {
    var plugin;

    this.each( function() {
      if( !$.data( this, PLUGIN_KEY ) ) {
        plugin = new Plugin( this, options );
        $.data( this, PLUGIN_KEY, plugin );
      }
    });

    return plugin;
  };

  window.Plugin = Plugin;
})(jQuery, window, document);

/**
 * Returns the next item that will be popped off the stack, or 'undefined' if
 * there are no items in the array.
 */
Array.prototype.peek = function() {
  return this[ this.length - 1 ];
};

/**
 * Ensures that two objects are equal.
 *
 * @param {object} x The main object to compare.
 * @param {object} y The object to check against x.
 */
Object.equals = function( x, y ) {
  // 'undefined' shall not pass.
  if( !(x instanceof Object) || !(y instanceof Object) ) return false;

  // Compare all properties from x to y, recursively for objects.
  for( let p in x ) {
    if( !x.hasOwnProperty( p ) ) continue;
    if( !y.hasOwnProperty( p ) ) return false;
    if( x[ p ] === y[ p ] ) continue;

    if( !Object.equals( x[ p ], y[ p ] ) ) return false;
  }

  return true;
};

