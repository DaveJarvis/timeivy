/**
 * The Ivy plugin maps key bindings to editing input fields in
 * table cells.
 *
 * Edit Mode Key Bindings
 * ========================================================
 * Ctrl+a      - [select all text]
 * Ctrl+c      - [copy cell text]
 * Ctrl+Insert - [copy cell text]
 * Ctrl+x      - [cut cell text]
 * Ctrl+v      - [replace cell text]
 * Ctrl+z      - [undo edit]
 * Up Arrow    - [navigate mode] [save] [bubble keypress]
 * Down Arrow  - [navigate mode] [save] [bubble keypress]
 * ESC         - [navigate mode] [revert]
 * Tab         - [navigate mode] [save] [bubble keypress]
 * Shift+Tab   - [navigate mode] [save] [bubble keypress]
 *
 * Navigate Mode Key Bindings
 * ========================================================
 * Insert           - [insert row after]
 * Delete           - [delete cell contents]
 * F2               - [edit mode]
 * Enter            - [edit mode]
 * <any char>       - [edit mode] [bubble keypress]
 * Spacebar         - [edit mode] [clear text] [bubble keypress]
 * Up Arrow         - [active cell up]
 * Down Arrow       - [active cell down]
 * Left Arrow       - [active cell left]
 * Right Arrow      - [active cell right]
 * Page Up          - [active cell page up]
 * Page Down        - [active cell page down]
 * Tab              - [active cell right]
 * Shift+tab        - [active cell left]
 * Ctrl+d           - [duplicate cell above]
 * Ctrl+s           - [save timesheet]
 * Ctrl+Up Arrow    - [skip all empty cells up]
 * Ctrl+Down Arrow  - [skip all empty cells down down]
 * Ctrl+Left Arrow  - [active cell left]
 * Ctrl+Right Arrow - [active cell right]
 * Home             - [active cell first column, current row]
 * End              - [active cell last non-empty column, current row]
 * Ctrl+Home        - [active cell first column, first row]
 * Ctrl+End         - [active cell last non-empty column, last non-empty row]
 * Ctrl+Page Up     - [previous worksheet]
 * Ctrl+Page Down   - [next worksheet]
 *
 * Plugin Behaviours
 * ========================================================
 */
;(function( $, window, document, undefined ) {
  'use strict';

  /** @const */
  const MIN_INDEX = 0;
  /** @const */
  const MAX_INDEX = 1000;

  var pluginName = 'ivy';
  var pluginKey = 'plugin_' + pluginName;
  var defaults = {
    classActiveCell:      'active',
    classActiveCellInput: 'edit',
    pageSize: 30,
    modeNavigate: [
      { k: 'left',         f: 'navigateLeft' },
      { k: 'right',        f: 'navigateRight' },
      { k: 'up',           f: 'navigateUp' },
      { k: 'down',         f: 'navigateDown' },
      { k: 'ctrl+left',    f: 'navigateLeftSkip' },
      { k: 'ctrl+right',   f: 'navigateRightSkip' },
      { k: 'ctrl+up',      f: 'navigateUpSkip' },
      { k: 'ctrl+down',    f: 'navigateDownSkip' },
      { k: 'pageup',       f: 'navigatePageUp' },
      { k: 'pagedown',     f: 'navigatePageDown' },
      { k: 'ctrl+pageup',  f: 'navigateSheetFore' },
      { k: 'ctrl+pagedown',f: 'navigateSheetAnte' },
      { k: 'home',         f: 'navigateRowHome' },
      { k: 'end',          f: 'navigateRowEnd' },
      { k: 'ctrl+home',    f: 'navigateHome' },
      { k: 'ctrl+end',     f: 'navigateEnd' },
      { k: 'shift+tab',    f: 'navigateLeft' },
      { k: 'tab',          f: 'navigateRight' },

      { k: 'ctrl+x',       f: 'cellCut' },
      { k: 'ctrl+c',       f: 'cellCopy' },
      { k: 'ctrl+ins',     f: 'cellCopy' },
      { k: 'del',          f: 'cellErase' },

      { k: 'f2',           f: 'cellEditStart' },
      { k: 'enter',        f: 'cellEditStart' },
      { k: 'esc',          f: 'cellEditCancel' },

      { k: 'ins',          f: 'editInsertRowAfter' },
      { k: 'alt+ins',      f: 'editInsertRowBefore' },

      { k: 'ctrl+s',       f: 'editSave' },
      { k: 'ctrl+z',       f: 'editUndo' },
      { k: 'ctrl+shift+z', f: 'editRedo' },
    ],
    modeEdit: [
      { k: 'up',           f: 'navigateUp' },
      { k: 'down',         f: 'navigateDown' },
    ]
  };

  /**
   * The Ivy plug-in constructor.
   *
   * @constructor
   */
  function Plugin( element, options ) {
    this.element = element;

    this.settings = $.extend( {}, defaults, options );
    this._defaults = defaults;
    this._name = pluginName;
    this._cell = [MIN_INDEX, MIN_INDEX];
    this._$cellInput = false;
    this._navigationMode = true;
    this.init();
  }

  $.extend( Plugin.prototype, {
    /**
     * Called during plugin construction to initialize the timesheet.
     *
     * @protected
     */
    init: function() {
      // Start in navigation mode.
      this.bindNavigateMode();

      // Start edit mode when any non-navigable key is pressed.
      this.bindPrintableKeys();

      // Allow click (mouse, tap, etc.) navigation.
      this.bindNavigationClicks();

      // Handle paste events.
      this.bindPasteHandler();

      // Highlight the default cell location.
      this.activate();
    },
    /**
     * Jumps to a given table cell. This is used upon receiving a click or
     * double-click event.
     *
     * @param {object} $cell The cell to activate.
     * @public
     */
    navigateTableCell: function( $cell ) {
      let col = $cell.parent().children().index($cell);
      let row = $cell.parent().parent().children().index($cell.parent());

      this.navigate( row, col );
    },
    /**
     * Binds single mouse clicks to navigation.
     *
     * @protected
     */
    bindNavigationClicks: function() {
      let plugin = this;
      let $table = $(plugin.getTableBodyElement());

      $table.on( 'click', 'td', function() {
        plugin.navigateTableCell( $(this) );
      } );

      $table.on( 'dblclick', 'td', function() {
        plugin.navigateTableCell( $(this) );
        plugin.cellEditStart();
      } );
    },
    /**
     * Start cell editing when a printable character is typed.
     *
     * @protected
     */
    bindPrintableKeys: function() {
      let plugin = this;
      let $table = $(plugin.getTableBodyElement());

      $table.keypress( function( e ) {
        // If the character code is numeric, it is a non-printable char.
        var charCode = (typeof e.which === 'number') ? e.which : e.keyCode;

        if( e.type === 'keypress' && charCode && !e.ctrlKey ) {
          console.log( 'KEYPRESS WTF!' );
          //plugin.cellEditStart();
        }
      } );

      $table.focus();
    },
    /**
     * Binds the keyboard to cell model navigation.
     *
     * @protected
     */
    bindNavigateMode: function() {
      Mousetrap.reset();

      let plugin = this;
      let nav = this.settings.modeNavigate;

      // Apply configurable keyboard bindings.
      for( let i = 0; i < nav.length; i++ ) {
        let k = nav[i].k;
        let f = nav[i].f;

        Mousetrap.bind( k, function( e ) {
          eval( 'plugin.' + f ).call( plugin );
        });
      }
    },
    /**
     * Binds paste events to replace cell content.
     *
     * @protected
     */
    bindPasteHandler: function() {
      let plugin = this;
      let $table = $(plugin.getTableBodyElement());

      // This requires that the table body element retains focus.
      $table.on( 'paste', function( e ) {
        plugin.clipboardPaste( e );
      } );
    },
    /**
     * Primitive to sanitize the row and column values. This will return
     * 1 if index is less than 1, or max if index is greater than max,
     * otherwise this returns the index.
     *
     * @param {number} i The row or column index to sanitize.
     * @param {number} max The maximum extent allowed for the index value.
     *
     * @private
     */
    sanitizeCellIndex: function( i, max ) {
      return i = i > max ? max : (i < MIN_INDEX ? MIN_INDEX : i);
    },
    /**
     * Primitive to get the active cell row from the model.
     *
     * @return {number} The active cell row, 0-based.
     * @public
     */
    getCellRow: function() {
      return this._cell[0];
    },
    /**
     * Primitive to get the active cell column from the model.
     *
     * @return {number} The active cell column, 0-based.
     * @public
     */
    getCellCol: function() {
      return this._cell[1];
    },
    /**
     * Primitive to get the table body via jQuery.
     *
     * @return {object} An element that represents the tbody containing cells.
     * @public
     */
    getTableBodyElement: function() {
      return $(this.element)[0];
    },
    /**
     * Primitive to get the active table cell element, which can be referenced
     * using jQuery as $(this.getTableCell()).
     *
     * @return {object} This returns a td element that can be styled.
     * @public
     */
    getTableCell: function() {
      let table = this.getTableBodyElement();
      let row = this.getCellRow();
      let col = this.getCellCol();

      return table.rows[ row ].cells[ col ];
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
      let table = this.getTableBodyElement();
      let max = table.rows.length;

      this._cell[0] = this.sanitizeCellIndex( row, max );
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
      let table = this.getTableBodyElement();
      let row = this.getCellRow();
      let max = table.rows[ row ].cells.length;

      this._cell[1] = this.sanitizeCellIndex( col, max );
    },
    /**
     * Primitive to add the active class to the table cell represented by
     * the cell model.
     *
     * @postcondition The active cell has its active cell class added.
     * @protected
     */
    activate: function() {
      $(this.getTableCell()).addClass( this.settings.classActiveCell );
    },
    /**
     * Primitive to remove the active class from the table cell represented by
     * the cell model.
     *
     * @postcondition The active cell has its active cell class removed.
     * @protected
     */
    deactivate: function() {
      $(this.getTableCell()).removeClass( this.settings.classActiveCell );
    },
    /**
     * Changes the active cell. All other navigate functions call this
     * function to stop cell editing and navigate to another cell.
     *
     * @param {number} row The new row number for the active cell.
     * @param {number} col The new column number for the active cell.
     *
     * @postcondition Cell editing has stopped.
     * @postcondition The previously activate cell is deactivated.
     * @postcondition The cell at (row, col) is activated.
     *
     * @public
     */
    navigate: function( row, col ) {
      this.cellEditStop();
      this.deactivate();
      this.setCellRow( row );
      this.setCellCol( col );
      this.activate();
    },
    /**
     * Helper method for navigating to a different row within the active
     * column. This first stops edit mode before navigating away.
     *
     * @param {number} skip The number of cells to move.
     *
     * @public
     */
    navigateRow: function( skip ) {
      this.navigate( this.getCellRow() + skip, this.getCellCol() );
    },
    /**
     * @public
     */
    navigatePageUp: function() {
      this.navigateRow( -this.settings.pageSize );
    },
    /**
     * @public
     */
    navigatePageDown: function() {
      this.navigateRow( +this.settings.pageSize );
    },
    /**
     * @public
     */
    navigateUpSkip: function() {
      console.log( 'Navigate up skip' );
    },
    /**
     * @public
     */
    navigateDownSkip: function() {
      console.log( 'Navigate down skip' );
    },
    /**
     * @public
     */
    navigateUp: function() {
      this.navigateRow( -1 );
    },
    /**
     * @public
     */
    navigateDown: function() {
      this.navigateRow( +1 );
    },
    /**
     * @public
     */
    navigateLeft: function() {
      this.navigate( this.getCellRow(), this.getCellCol() - 1 );
    },
    /**
     * @public
     */
    navigateLeftSkip: function() {
      this.navigate( this.getCellRow(), this.getCellCol() - 1 );
    },
    /**
     * @public
     */
    navigateRight: function() {
      this.navigate( this.getCellRow(), this.getCellCol() + 1 );
    },
    /**
     * @public
     */
    navigateRightSkip: function() {
      this.navigate( this.getCellRow(), this.getCellCol() + 1 );
    },
    /**
     * @public
     */
    navigateHome: function() {
      this.navigate( MIN_INDEX, MIN_INDEX );
    },
    /**
     * @public
     */
    navigateEnd: function() {
      this.navigate( MAX_INDEX, MAX_INDEX );
    },
    /**
     * @public
     */
    navigateRowHome: function() {
      this.navigate( this.getCellRow(), MIN_INDEX );
    },
    /**
     * @public
     */
    navigateRowEnd: function() {
      this.navigate( this.getCellRow(), MAX_INDEX );
    },
    /**
     * @public
     */
    navigateSheetFore: function() {
      console.log( 'Navigate forward' );
    },
    /**
     * @public
     */
    navigateSheetAnte: function() {
      console.log( 'Navigate backward' );
    },
    /**
     * Copies the active cell's contents and then erases the contents.
     * @public
     */
    cellCut: function() {
      this.cellCopy();
      this.cellErase();
    },
    /**
     * Copies the active cell's contents into the clipboard buffer.
     * @public
     */
    cellCopy: function() {
      this.clipboardCopy( this.getTableCell() );
    },
    /**
     * Erases the active cell's contents.
     * @public
     */
    cellErase: function() {
      $(this.getTableCell()).text( '' );
    },
    /**
     * Creates an input field at the active table cell.
     *
     * @param {object} $tableCell Contains the cell width and text value used
     * to create and populate the cell input field.
     * @protected
     */
    cellInputCreate: function( $tableCell ) {
      $tableCell.addClass( this.settings.classActiveCellInput );

      let cellWidth = $tableCell.width();
      let cellValue = $tableCell.text();
      let $input = $('<input>');

      $input.prop({
        type: 'text',
        value: cellValue,
      });

      $input.css({
        'width': cellWidth,
        'max-width': cellWidth,
      });

      return $input;
    },
    /**
     * Destroys the previously created input field.
     *
     * @return The input field value.
     * @protected
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
     * Sets the input field used for editing by the user.
     *
     * @param {object} $input The new value for the cell input field widget.
     * @protected
     */
    setCellInput: function( $input ) {
      this._$cellInput = $input;
    },
    /**
     * Enables cell editing for the active table cell.
     *
     * @public
     */
    cellEditStart: function() {
      let $tableCell = $(this.getTableCell());
      let $input = this.cellInputCreate( $tableCell );
      this.setCellInput( $input );

      $input.on( 'focusout', function() {
        $tableCell.text( $input.val() );
      });

      $tableCell.html( $input );
      $input.focus();
    },
    /**
     * Disables cell editing for the active table cell.
     *
     * @public
     */
    cellEditStop: function() {
      if( this.getCellInput() !== false ) {
        let cellValue = this.cellInputDestroy();

        let $tableCell = $(this.getTableCell());
        $tableCell.removeClass( this.settings.classActiveCellInput );
        $tableCell.text( cellValue );
      }

      $(this.getTableBodyElement()).focus();
    },
    /**
     * Disables cell editing for the active table cell and reverts to its
     * previous value.
     *
     * @protected
     */
    cellEditCancel: function() {
      console.log( 'Edit cancel' );
      this.cellEditStop();
    },
    /**
     * @public
     */
    editSave: function() {
      console.log( 'Save timesheet' );
      this.cellEditStop();
    },
    /**
     * Inserts a new row before the active cell row.
     *
     * @public
     */
    editInsertRowBefore: function() {
      console.log( 'Insert row before' );
    },
    /**
     * Inserts a new row after the active cell row.
     *
     * @public
     */
    editInsertRowAfter: function() {
      console.log( 'Insert row after' );
    },
    /**
     * Un-executes the previously executed command.
     *
     * @public
     */
    editUndo: function() {
      console.log( 'Timesheet undo' );
    },
    /**
     * Re-executes the previously un-executed command.
     *
     * @public
     */
    editRedo: function() {
      console.log( 'Timesheet redo' );
    },
    /**
     * Called when the copy command is invoked to copy the contents of the
     * active cell into the system's copy buffer.
     *
     * @param {object} element The element contents to copy.
     * @protected
     */
    clipboardCopy: function( element ) {
      var $temp = $('<input>');
      $('body').append( $temp );
      $temp.val( $(element).text() ).select();
      document.execCommand( 'copy' );
      $temp.remove();
    },
    /**
     * Called when the paste command is invoked to replace the contents of the
     * active cell with the system's copy buffer.
     *
     * @param {object} e The paste event.
     * @protected
     */
    clipboardPaste: function( e ) {
      let buffer = e.originalEvent.clipboardData.getData('text');
      let $tableCell = $(this.getTableCell());

      $tableCell.text( buffer );
    }
  } );

  $.fn[ pluginName ] = function( options ) {
    return this.each( function() {
      if( !$.data( this, pluginKey ) ) {
        var plugin = new Plugin( this, options );
        $.data( this, pluginKey, plugin );
      }
    } );
  };

  window.Plugin = Plugin;
})(jQuery, window, document);

/**
 * Prevent the tab key from moving focus to the browser's widgets.
 */
Mousetrap.prototype.stopCallback = function(e, element, combo) {
  e.preventDefault();
  return false;
}
