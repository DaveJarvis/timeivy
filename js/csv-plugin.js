/**
 * HTML table to CSV converter for jQuery.
 *
 * https://stackoverflow.com/a/16203218/59087
 */
;(function( $, window, document, undefined ) {
  'use strict';

  /** @const */
  const PLUGIN_NAME = 'csv';
  /** @const */
  const PLUGIN_KEY = 'plugin_' + PLUGIN_NAME;

  /**
   * Insert delimiters to avoid accidental split of actual contents.
   */
  var defaults = {
		data_table: 'table',
    filename: 'export.csv',
    media_type_text: 'text/csv',
    media_type_data: 'application/csv',
    charset: 'utf-8',
    col_delimiter: '","',
    row_delimiter: '"\r\n"',
    temp_col_delimiter: String.fromCharCode( 11 ),
    temp_row_delimiter: String.fromCharCode( 0 ),
  };

  /**
   * Applies settings.
   *
   * @constructor
   */
  function Plugin( element, options ) {
    this.element = element;

    this.settings = $.extend({}, defaults, options );
    this._defaults = defaults;
    this._name = PLUGIN_NAME;
    this.init();
  }

  /**
   * Permit the plug-in to be extended.
   */
  $.extend( Plugin.prototype, {
    init: function() {
			let plugin = this;
			let settings = plugin.settings;

			$(plugin.element).on( 'click tap', function( event ) {
				plugin.table_export();
			});
		},
    /**
     * Called to export the given table to a file.
     *
     * @protected
     */
    table_export: function() {
			let plugin = this;
      let settings = plugin.settings;
      let trd = settings.temp_row_delimiter;
      let tcd = settings.temp_col_delimiter;
      let rd = settings.row_delimiter;
      let cd = settings.col_delimiter;
			let data_table = settings.data_table;

      // Find all the table data (td) elements.
      let $rows = $(data_table).find( 'tr:has( td )' );

      let csv_data = '"' + $rows.map( function( i, row ) {
        let $row = $(row);
        let $cols = $row.find( 'td' );

        return $cols.map( function( j, col ) {
          let $col = $(col);
          let text = $col.text();
          
          // Escape double quotes.
          return text.replace( /"/g, '""' );
        }).get().join( tcd );
      }).get().join( trd )
      .split( trd ).join( rd )
      .split( tcd ).join( cd ) + '"';

      let href = '';
      let target = '';

      if( window.Blob && window.URL ) {
        let blob = new Blob( [csv_data], {
          type: settings.meda_type_text + '; charset=' + settings.charset
        });

        href = URL.createObjectURL( blob );
      }
      else {
        href =
          'data:' + settings.media_type_data +
          '; charset=' + settings.charset +
          ',' + encodeURIComponent( csv_data );
      }

      $(plugin.element).attr({
        'download': settings.filename,
        'href': href,
        'target': target
      });
    },

    /**
     * Called to import the given CSV file into the table.
     *
     * @protected
     */
    table_import: function() {
    },
  } );

  $.fn[ PLUGIN_NAME ] = function( options ) {
    var plugin;

    this.each( function() {
      if( !$.data( this, PLUGIN_KEY ) ) {
        plugin = new Plugin( this, options );
        $.data( this, PLUGIN_KEY, plugin );
      }
    } );

    return plugin;
  };

  window.Plugin = Plugin;
})(jQuery, window, document);

