/**
 * HTML table to CSV converter for jQuery.
 *
 * https://stackoverflow.com/a/16203218/59087
 */
;(function( $, window, document, undefined ) {
  'use strict';

  /** @const */
  const PLUGIN_NAME = 'exportable';
  /** @const */
  const PLUGIN_KEY = 'plugin_' + PLUGIN_NAME;

  /**
   * Insert delimiters to avoid accidental split of actual contents.
   * Exports to "export.csv" by default.
   */
  var defaults = {
    source: 'table',
    filename: 'export.csv',
    exports: {
      csv: {
        file_extension: 'csv',
        media_type_text: 'text/csv',
        media_type_data: 'application/csv',
        col_delimiter: '","',
        row_delimiter: '"\r\n"',
        temp_col_delimiter: String.fromCharCode( 11 ),
        temp_row_delimiter: String.fromCharCode( 0 ),
      },
      json: {
        file_extension: 'json',
        media_type_text: 'text/plain',
        media_type_data: 'application/json',
      },
    },
    charset: 'utf-8',
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
    /**
     * Called to export the given table to a file in a file format based on
     * the filename.
     *
     * @protected
     */
    init: function() {
      let plugin = this;
      let settings = plugin.settings;
      let filename = settings.filename;

      // Extract filename extension.
      // https://stackoverflow.com/a/12900504/59087
      let ext = filename.slice((filename.lastIndexOf(".") - 1 >>> 0) + 2);

      // Call the function that maps to the predetermined extension.
      $(plugin.element).on( 'click tap', function( event ) {
        plugin[ext]();
      });
    },
    /**
     * Called to export the given table to a file.
     *
     * @protected
     */
    csv: function() {
      let plugin = this;
      let settings = plugin.settings;
      let exports = settings.exports;
      let trd = exports.csv.temp_row_delimiter;
      let tcd = exports.csv.temp_col_delimiter;
      let rd = exports.csv.row_delimiter;
      let cd = exports.csv.col_delimiter;

      // Find all the table data (td) elements.
      let $rows = $(settings.source).find( 'tr:has( td )' );

      let csv = '"' + $rows.map( function( i, row ) {
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

      this.download( csv, exports.csv );
    },
    json: function() {
      let plugin = this;
      let settings = plugin.settings;
      let exports = settings.exports;
      let source = settings.source;
      let headers = []

      // Find the headings for the json data map.
      $.each( $(source).parent().find( 'thead > tr > th' ), function( i, j ) {
        headers.push( $(j).text().toLowerCase() );
      });

      let json = [];

      $.each( $(source).find( 'tr' ), function( k, v ) {
        let row = {};

        $.each( $(source).find( 'td' ), function( i, j ) {
          row[ headers[i] ] = $(this).text().trim();
        });

        json.push( row );
      });

      json = JSON.stringify( json );

      this.download( json, exports.json );
    },
    /**
     * Submits the data to the browser.
     *
     * @param {object} data The data to transmit.
     * @param {object} content_type What type of data to transmit.
     */
    download: function( data, content_type ) {
      let plugin = this;
      let settings = plugin.settings;

      let href = '';
      let target = '';

      if( window.Blob && window.URL ) {
        let blob = new Blob( [data], {
          type: content_type.meda_type_text + '; charset=' + settings.charset
        });

        href = URL.createObjectURL( blob );
      }
      else {
        href =
          'data:' + content_type.media_type_data +
          '; charset=' + settings.charset +
          ',' + encodeURIComponent( data );
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
  });

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
