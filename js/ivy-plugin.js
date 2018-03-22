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
      { k: 'ctrl+s',       f: 'timesheetSave' },
      { k: 'ctrl+z',       f: 'timesheetUndo' },
      { k: 'ctrl+shift+z', f: 'timesheetRedo' },
      { k: 'ctrl+x',       f: 'cellCut' },
      { k: 'ctrl+c',       f: 'cellCopy' },
      { k: 'ctrl+ins',     f: 'cellCopy' },
      { k: 'del',          f: 'cellErase' },
      { k: 'f2',           f: 'cellEditStart' },
      { k: 'enter',        f: 'cellEditStart' },
      { k: 'esc',          f: 'cellEditCancel' },
      { k: 'ins',          f: 'timesheetInsertRowAfter' },
      { k: 'alt+ins',      f: 'timesheetInsertRowBefore' },
    ],
    modeEdit: [
      { k: 'up',           f: 'editUp' },
      { k: 'down',         f: 'editDown' },
    ]
  };

  // This represents the data model for tracking the active cell.
  //var cell = [1, 1];

  function Plugin( element, options ) {
    this.element = element;

    this.settings = $.extend( {}, defaults, options );
    this._defaults = defaults;
    this._name = pluginName;
    this._cell = [1, 1];
    this._$cellInput = false;
    this._navigationMode = true;
    this.init();
  }

  $.extend( Plugin.prototype, {
    /**
     * Called during plugin construction to initialize the timesheet.
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
     * @param $cell The cell to activate.
     */
    navigateTableCell: function( $cell ) {
      this.cellEditStop();

      let col = $cell.parent().children().index($cell);
      let row = $cell.parent().parent().children().index($cell.parent());

      this.navigate( row + 1, col + 1 );
    },
    /**
     * Binds single mouse clicks to navigation.
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
     */
    bindPasteHandler: function() {
      let plugin = this;
      let $table = $(plugin.getTableBodyElement());

      console.log( 'paste handler: ' + $table );

      $table.on( 'paste', function( e ) {
        plugin.clipboardPaste( e );
      } );
    },
    /**
     * Primitive to sanitize the row and column values. This will return
     * 1 if index is less than 1, or max if index is greater than max,
     * otherwise this returns the index.
     *
     * @param index The row or column index to sanitize.
     * @param max The maximum extent allowed for the index value.
     */
    sanitizeCellIndex: function( index, max ) {
      return index = index > max ? max : (index < 1 ? 1 : index);
    },
    /**
     * Primitive to get the active cell row from the model.
     *
     * @return The active cell row, 1-based.
     */
    getCellRow: function() {
      return this._cell[0];
    },
    /**
     * Primitive to get the active cell column from the model.
     *
     * @return The active cell column, 1-based.
     */
    getCellCol: function() {
      return this._cell[1];
    },
    /**
     * Primitive to get the table body via jQuery.
     *
     * @return An element that represents the tbody containing cells.
     */
    getTableBodyElement: function() {
      return $(this.element)[0];
    },
    /**
     * Primitive to get the active table cell element, which can be referenced
     * using jQuery as $(this.getTableCell()).
     *
     * @return This returns a td element that can be styled.
     */
    getTableCell: function() {
      let table = this.getTableBodyElement();
      let row = this.getCellRow();
      let col = this.getCellCol();

      return table.rows[ row - 1 ].cells[ col - 1 ];
    },
    /**
     * Primitive to change the cell row without updating the user interface.
     * Any value that exceeds the table range is set to the extent of the
     * table range.
     *
     * @postcondition The cell data model row is set to the given row.
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
     * @postcondition The cell data model column is set to the given column.
     */
    setCellCol: function( col ) {
      let table = this.getTableBodyElement();
      let row = this.getCellRow();
      let max = table.rows[ row - 1 ].cells.length;

      this._cell[1] = this.sanitizeCellIndex( col, max );
    },
    /**
     * Primitive to add the active class to the table cell represented by
     * the cell model.
     */
    activate: function() {
      let tableCell = this.getTableCell();
      $(tableCell).addClass( this.settings.classActiveCell );
    },
    /**
     * Primitive to remove the active class from the table cell represented by
     * the cell model.
     */
    deactivate: function() {
      let tableCell = this.getTableCell();
      $(tableCell).removeClass( this.settings.classActiveCell );
    },
    /**
     * Changes the active cell. This deactivates the cell from the model, uses
     * the primtives to adjust the model's row and column, then activates
     * the cell from the model.
     */
    navigate: function( row, col ) {
      this.deactivate();
      this.setCellRow( row );
      this.setCellCol( col );
      this.activate();
    },
    /**
     * Helper method for navigating to a different row within the active
     * column. This first stops edit mode before navigating away.
     *
     * @param skip The number of cells to move.
     */
    navigateRow: function( skip ) {
      this.cellEditStop();
      this.navigate( this.getCellRow() + skip, this.getCellCol() );
    },
    navigatePageUp: function() {
      this.navigateRow( -this.settings.pageSize );
    },
    navigatePageDown: function() {
      this.navigateRow( +this.settings.pageSize );
    },
    navigateUp: function() {
      this.navigateRow( -1 );
    },
    navigateDown: function() {
      this.navigateRow( +1 );
    },
    navigateLeft: function() {
      this.navigate( this.getCellRow(), this.getCellCol() - 1 );
    },
    navigateLeftSkip: function() {
      this.navigate( this.getCellRow(), this.getCellCol() - 1 );
    },
    navigateRight: function() {
      this.navigate( this.getCellRow(), this.getCellCol() + 1 );
    },
    navigateRightSkip: function() {
      this.navigate( this.getCellRow(), this.getCellCol() + 1 );
    },
    navigateHome: function() {
      this.navigate( Number.MIN_SAFE_INTEGER, Number.MIN_SAFE_INTEGER );
    },
    navigateEnd: function() {
      this.navigate( Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER );
    },
    navigateRowHome: function() {
      this.navigate( this.getCellRow(), Number.MIN_SAFE_INTEGER );
    },
    navigateRowEnd: function() {
      this.navigate( this.getCellRow(), Number.MAX_SAFE_INTEGER );
    },
    navigateSheetFore: function() {
      console.log( 'Navigate forward' );
    },
    navigateSheetAnte: function() {
      console.log( 'Navigate backward' );
    },
    /**
     * Copies the active cell's contents and then erases the contents.
     */
    cellCut: function() {
			this.cellCopy();
      this.cellErase();
    },
    /**
     * Copies the active cell's contents into the clipboard buffer.
     */
    cellCopy: function() {
			this.clipboardCopy( this.getTableCell() );
    },
    /**
     * Erases the active cell's contents.
     */
    cellErase: function() {
      $(this.getTableCell()).text( '' );
    },
    /**
     * Creates an input field at the active table cell.
     *
     * @param $tableCell - Contains the cell width and text value used to
     * create and populate the cell input field.
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
     */
    cellInputDestroy: function() {
      let $input = this.getCellInput();
      let cellValue = $input.val();

      $input.remove();
      this.setCellInput( false );

      return cellValue;
    },
    getCellInput: function() {
      return this._$cellInput;
    },
    /**
     * @param $input The new value for the cell input field widget.
     */
    setCellInput: function( $input ) {
      this._$cellInput = $input;
    },
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
    cellEditStop: function() {
      if( this.getCellInput() !== false ) {
        let cellValue = this.cellInputDestroy();

        let $tableCell = $(this.getTableCell());
        $tableCell.removeClass( this.settings.classActiveCellInput );
        $tableCell.text( cellValue );
        $tableCell.focus();
      }
    },
    cellEditCancel: function() {
      console.log( 'Edit cancel' );
			this.cellEditStop();
    },
    timesheetSave: function() {
      console.log( 'Save timesheet' );
      this.cellEditStop();
    },
    timesheetInsertRowBefore: function() {
      console.log( 'Insert row before' );
    },
    timesheetInsertRowAfter: function() {
      console.log( 'Insert row after' );
    },
    timesheetUndo: function() {
      console.log( 'Timesheet undo' );
    },
    timesheetRedo: function() {
      console.log( 'Timesheet redo' );
    },
		clipboardCopy: function( element ) {
			var $temp = $('<input>');
			$('body').append( $temp );
			$temp.val( $(element).text() ).select();
			document.execCommand( 'copy' );
			$temp.remove();
      console.log( 'copy' );
		},
    clipboardPaste: function( content ) {
      let buffer = e.originalEvent.clipboardData.getData('text');
      let $tableCell = $(this.getTableCell());

      $tableCell.text( buffer );
      console.log( 'paste' );
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
