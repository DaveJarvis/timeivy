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
      { k: 'left', f: 'navigateLeft' },
      { k: 'right', f: 'navigateRight' },
      { k: 'shift+tab', f: 'navigateLeft' },
      { k: 'tab', f: 'navigateRight' },
    ],
    modeEdit: [
      { k: 'esc', f: 'modeEdit' },
    ]
  };

  // Active cell starts in the upper-left.
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
    init: function() {
      let plugin = this;
      let nav = this.settings.modeNavigate;

      // Apply keyboard bindings.
      for( let i = 0; i < nav.length; i++ ) {
        let k = nav[i].k;
        let f = nav[i].f;

        Mousetrap.bind( k, function( e ) {
          eval( 'plugin.' + f ).call( plugin );
        });
      }

      // Jump to the starting cell.
      this.navigate( 1, 1 );
    },
    getCellRow: function() {
      return this._cell[0];
    },
    getCellCol: function() {
      return this._cell[1];
    },
    getTableCellElement: function() {
      return $(this.element)[0];
    },
    getTableCell: function() {
      let table = this.getTableCellElement();
      let row = this.getCellRow();
      let col = this.getCellCol();
      return table.rows[ row - 1 ].cells[ col - 1 ];
    },
    setCellRow: function( row ) {
      let table = this.getTableCellElement();
      let max = table.rows.length;

      row = row > max ? max - 1 : row;
      row = row < 1 ? 1 : row;

      this._cell[0] = row;
    },
    setCellCol: function( col ) {
      let table = this.getTableCellElement();
      let row = this.getCellRow();
      let max = table.rows[ row - 1 ].cells.length;

      col = col > max ? max : col;
      col = col < 1 ? 1 : col;

      this._cell[1] = col;
    },
    navigate: function( row, col ) {
      this.deactivate();
      this.setCellRow( row );
      this.setCellCol( col );
      this.activate();
    },
    activate: function() {
      let tableCell = this.getTableCell();
      $(tableCell).addClass( this.settings.activeCellClassName );
    },
    deactivate: function() {
      let tableCell = this.getTableCell();
      $(tableCell).removeClass( this.settings.activeCellClassName );
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
    navigateRowHome: function() {
      this.navigate( 0, this.getCellCol() );
    },
    navigateRowEnd: function() {
    },
    navigateColHome: function() {
      this.navigate( this.getCellRow(), 0 );
    },
    navigateColEnd: function() {
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

