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
 * Ctrl+i           - [insert row after]  (keyboards without insert key)
 * Ctrl+Shift+i     - [insert row before] (keyboards without insert key)
 * Insert           - [insert row after]
 * Alt+Insert       - [insert row before]
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
 * Ctrl+s           - [save cells]
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
    maxPageSize: 30,
    maxUndoLevels: 1000,
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
      { k: 'ctrl+i',       f: 'editInsertRowAfter' },
      { k: 'ctrl+shift+i', f: 'editInsertRowBefore' },

      { k: 'ctrl+s',       f: 'editSave' },
      { k: 'ctrl+z',       f: 'editUndo' },
      { k: 'ctrl+shift+z', f: 'editRedo' },
      { k: 'ctrl+y',       f: 'editRedo' },
    ],
    modeEdit: [
      { k: 'up',           f: 'navigateUp' },
      { k: 'down',         f: 'navigateDown' },
      { k: 'enter',        f: 'cellEditStop' },
    ]
  };

  /**
   * Applies settings, initializes keyboard bindings.
   *
   * @constructor
   */
  function Plugin( element, options ) {
    this.element = element;

    this.settings = $.extend( {}, defaults, options );
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
      // Prevent keys from bubbling to the browser container.
      this.setup();

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
     * Jumps to a given table cell. This is used upon receiving a click or
     * double-click event.
     *
     * @param {object} $cell The cell to activate.
     * @public
     */
    navigateTableCell: function( $cell ) {
      let col = $cell.parent().children().index($cell);
      let row = $cell.parent().parent().children().index($cell.parent());

      if( this.isActiveCell( row, col ) === false ) {
        // Ensure that the click navigation can be undone.
        this.navigate( row, col );
      }
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
          console.log( 'KEYPRESS!' );
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

      $(document).on( 'paste', function( e ) {
        if( e.originalEvent ) {
          let buffer = e.originalEvent.clipboardData.getData('text');
          plugin.execute( new CommandCellUpdate( plugin, buffer ) );

          e.stopPropagation();
          e.preventDefault();
        }
      } );
    },
    /**
     * Primitive to sanitize the row and column values. This will return
     * MIN_INDEX if index is less than MIN_INDEX, or max if index is
     * greater than max, otherwise this returns the index.
     *
     * @param {number} i The row or column index to sanitize.
     * @param {number} max The maximum extent allowed for the index value.
     * @return {number} Sanitized cell index number.
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
     *
     * @public
     */
    getCellRow: function() {
      return this._cell[0];
    },
    /**
     * Primitive to get the active cell column from the model.
     *
     * @return {number} The active cell column, 0-based.
     *
     * @public
     */
    getCellCol: function() {
      return this._cell[1];
    },
    /**
     * Primitive to get the table body via jQuery.
     *
     * @return {object} An element that represents the tbody containing cells.
     *
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
     *
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
      let max = table.rows.length - 1;

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
      let max = table.rows[ row ].cells.length - 1;

      this._cell[1] = this.sanitizeCellIndex( col, max );
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
     * Returns the state of the plugin, which can be restored using the
     * restore state function.
     *
     * @return {object} The plugin's state.
     * @public
     */
    retrieveState: function() {
      let result = {
        cellRow: this.getCellRow(),
        cellCol: this.getCellCol(),
        cellVal: $(this.getTableCell()).text()
      };

      return result;
    },
    /**
     * Reverts the state of the plugin from a previously retrieved state.
     *
     * @param {object} state The state object returned from a call to
     * retrieveState.
     * @private
     */
    restoreState: function( state ) {
      this._navigate( state.cellRow, state.cellCol );
      $(this.getTableCell()).text( state.cellVal );
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
      //console.log( 'execute ' + command.constructor.name );
      //console.dir( command );
      this.getCommandExecutor().execute( command );
    },
    /**
     * Navigates to the given row and column without storing the command
     * in the undo/redo history.
     * 
     * @private
     */
    _navigate: function( row, col ) {
      this.deactivate();
      this.setCellRow( row );
      this.setCellCol( col );
      this.activate();

      // Ensure that the document body retains focus. This has the side
      // effect that when the table is loaded, the user can start typing
      // immediately.
      $(this.getTableBodyElement()).focus();
    },
    /**
     * Changes the active cell. All other navigate functions call this
     * function to stop cell editing and navigate to another cell.
     *
     * @param {number} row The new row number for the active cell.
     * @param {number} col The new column number for the active cell.
     *
     * @postcondition Cell editing has stopped.
     * @postcondition The previously activated cell is deactivated.
     * @postcondition The cell at (row, col) is activated.
     * @postcondition The undo buffer includes this navigate command.
     *
     * @public
     */
    navigate: function( row, col ) {
      let $input = this.getCellInput();

      if( $input !== false ) {
        this.cellEditStop();
      }

      this.execute( new CommandNavigate( this, row, col ) );
    },
    /**
     * Helper method for navigating to a different row within the active
     * column.
     *
     * @param {number} skip The number of cells to move.
     *
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
     *
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
     *
     * @public
     */
    cellCut: function() {
      this.execute( new CommandCellCut( this ) );
    },
    /**
     * Copies the active cell's contents into the clipboard buffer.
     *
     * @private
     */
    cellCopy: function() {
      let $temp = $('<input>');
      $('body').append( $temp );
      $temp.val( $(this.getTableCell()).text() ).select();
      document.execCommand( 'copy' );
      $temp.remove();
    },
    /**
     * Erases the active cell's contents.
     *
     * @public
     */
    cellErase: function() {
      this.execute( new CommandCellUpdate( this, '' ) );
    },
    /**
     * Creates an input field at the active table cell.
     *
     * @param {object} $tableCell Contains the cell width and text value used
     * to create and populate the cell input field.
     * @private
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
      this.execute( new CommandCellEditStart( this ) );
    },
    /**
     * Disables cell editing for the active table cell. This must not
     * add the command to the undo/redo history.
     *
     * @public
     */
    cellEditStop: function() {
      let plugin = this;
      let $table = $(plugin.getTableBodyElement());
      let cellValue = plugin.cellInputDestroy();
      let $tableCell = $(plugin.getTableCell());
      $tableCell.removeClass( plugin.settings.classActiveCellInput );
      $tableCell.text( cellValue );

      $table.focus();
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
      console.log( 'Save cells' );
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
  } );

  $.fn[ PLUGIN_NAME ] = function( options ) {
    return this.each( function() {
      if( !$.data( this, PLUGIN_KEY ) ) {
        var plugin = new Plugin( this, options );
        $.data( this, PLUGIN_KEY, plugin );
      }
    } );
  };

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
      this.getUndoStack().push( command );
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
      this._state = plugin.retrieveState();
    }

    /**
     * All commands override this to expose a consistent interface.
     *
     * @protected
     */
    execute() { }

    undo() { 
      this.getPlugin().restoreState( this.getState() );
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
      plugin.cellCopy();
      plugin.cellErase();
    }
  }

  class CommandCellEditStart extends Command {
    constructor( plugin, cellValue ) {
      super( plugin );
    }
      
    execute() {
      let plugin = this.getPlugin();
      let $tableCell = $(plugin.getTableCell());
      let $input = plugin.cellInputCreate( $tableCell );
      plugin.setCellInput( $input );

      $input.on( 'focusout', function() {
        $tableCell.text( $input.val() );
      });

      $tableCell.html( $input );
      $input.focus();
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
      let plugin = this.getPlugin();
      $(plugin.getTableCell()).text( this._cellValue );
    }
  }

  window.Plugin = Plugin;
})(jQuery, window, document);

