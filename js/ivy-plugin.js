/**
 * The Ivy plugin maps key bindings to editing input fields in
 * table cells.
 *
 * Edit Mode Key Bindings
 * ========================================================
 * Ctrl+a      - [select all text]
 * Ctrl+c      - [copy selected text]
 * Ctrl+Insert - [copy selected text]
 * Ctrl+v      - [paste copied text]
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
 * F2               - [edit mode]
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
 * Ctrl+s           - [save]
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
    activeCellClassName: 'active',
    pageSize: 30,
    modeNavigate: [
      { k: 'left',      f: 'navigateLeft' },
      { k: 'right',     f: 'navigateRight' },
      { k: 'up',        f: 'navigateUp' },
      { k: 'down',      f: 'navigateDown' },
      { k: 'ctrl+left', f: 'navigateLeftSkip' },
      { k: 'ctrl+right',f: 'navigateRightSkip' },
      { k: 'ctrl+up',   f: 'navigateUpSkip' },
      { k: 'ctrl+down', f: 'navigateDownSkip' },
      { k: 'pageup',    f: 'navigatePageUp' },
      { k: 'pagedown',  f: 'navigatePageDown' },
      { k: 'home',      f: 'navigateRowHome' },
      { k: 'end',       f: 'navigateRowEnd' },
      { k: 'ctrl+home', f: 'navigateHome' },
      { k: 'ctrl+end',  f: 'navigateEnd' },
      { k: 'shift+tab', f: 'navigateLeft' },
      { k: 'tab',       f: 'navigateRight' },
      { k: 'f2',        f: 'modeEdit' },
    ],
    modeEdit: [
      { k: 'esc', f: 'modeEdit' },
    ]
  };

  // This represents the data model for tracking the active cell.
  var cell = [1, 1];

  function Plugin( element, options ) {
    this.element = element;

    this.settings = $.extend( {}, defaults, options );
    this._defaults = defaults;
    this._name = pluginName;
    this._cell = cell;
    this.init();
  }

  $.extend( Plugin.prototype, {
    /**
     * Called during plugin construction to initialize the timesheet.
     */
    init: function() {
      // Start in navigation mode.
      this.bindNavigateMode();

      // Allow click (mouse, tap, etc.) navigation.
      this.bindNavigationClick();

      // Activate the upper-left cell.
      this.navigate( 1, 1 );
    },
    bindNavigationClick: function() {
			let plugin = this;
      let table = plugin.getTableBodyElement();

      $(table).on( 'click', 'td', function() {
				let col = $(this).parent().children().index($(this));
				let row = $(this).parent().parent().children().index($(this).parent());
				plugin.navigate( row + 1, col + 1 );
      } );
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
     * Primitive to get the active table cell element.
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

      row = row > max ?  max : (row < 1 ? 1 : row);

      this._cell[0] = row;
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

      col = col > max ? max : (col < 1 ? 1 : col);

      this._cell[1] = col;
    },
    /**
     * Primitive to add the active class to the table cell represented by
     * the cell model.
     */
    activate: function() {
      let tableCell = this.getTableCell();
      $(tableCell).addClass( this.settings.activeCellClassName );
    },
    /**
     * Primitive to remove the active class from the table cell represented by
     * the cell model.
     */
    deactivate: function() {
      let tableCell = this.getTableCell();
      $(tableCell).removeClass( this.settings.activeCellClassName );
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
    navigateUp: function() {
      this.navigate( this.getCellRow() - 1, this.getCellCol() );
    },
    navigateDown: function() {
      this.navigate( this.getCellRow() + 1, this.getCellCol() );
    },
    navigateLeft: function() {
      this.navigate( this.getCellRow(), this.getCellCol() - 1 );
    },
    navigateRight: function() {
      this.navigate( this.getCellRow(), this.getCellCol() + 1 );
    },
    navigateHome: function() {
      this.navigate( 1, 1 );
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
    navigatePageUp: function() {
      this.navigate(
        this.getCellRow() - this.settings.pageSize, this.getCellCol()
      );
    },
    navigatePageDown: function() {
      this.navigate(
        this.getCellRow() + this.settings.pageSize, this.getCellCol()
      );
    },
    modeNavigate: function() {
      console.log( "Nagivate Mode!" );
    },
    modeEdit: function() {
      console.log( "Edit Mode!" );
    },
    save: function() {
      console.log( "Save!" );
    },
    undo: function() {
      console.log( "Undo!" );
    },
    redo: function() {
      console.log( "Redo!" );
    },
    load: function( url ) {
    },
    post: function( url ) {
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


Mousetrap.prototype.stopCallback = function(e, element, combo) {
  return false;
}
