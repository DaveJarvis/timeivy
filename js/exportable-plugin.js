/**
 * HTML table to CSV converter for jQuery.
 *
 * https://stackoverflow.com/a/16203218/59087
 */
;(function( $, window, document, undefined ) {
  "use strict";

  /** @const */
  const PLUGIN_NAME = "exportable";
  /** @const */
  const PLUGIN_KEY = "plugin_" + PLUGIN_NAME;

  /**
   * Insert delimiters to avoid accidental split of actual contents.
   * Exports to "export.csv" by default.
   */
  var defaults = {
    source: "table",
    filename: "export.csv",
    exports: {
      csv: {
        file_extension: "csv",
        media_type_text: "text/csv",
        media_type_data: "application/csv",
        col_delimiter: '","',
        row_delimiter: '"\r\n"',
        temp_col_delimiter: String.fromCharCode( 11 ),
        temp_row_delimiter: String.fromCharCode( 0 ),
      },
      json: {
        file_extension: "json",
        media_type_text: "text/plain",
        media_type_data: "application/json",
      },
    },
    charset: "utf-8",
  };

  /**
   * Applies settings.
   *
   * @constructor
   */
  function Plugin( element, options ) {
    this.element = element;

    this.settings = $.extend( {}, defaults, options );
    this._defaults = defaults;
    this._name = PLUGIN_NAME;
    this.init();
  }

  /**
   * Permit the plug-in to be extended.
   */
  $.extend( Plugin.prototype, {
    /**
     * Convert a table to a given format based on its filename.
     *
     * @protected
     */
    init: function() {
      let plugin = this;
      let settings = plugin.settings;
      let filename = settings.filename;

      // Extract filename extension.
      // https://stackoverflow.com/a/12900504/59087
      let ext = filename.slice( (filename.lastIndexOf( "." ) - 1 >>> 0) + 2 );

      // Call the function that maps to the predetermined extension.
      $(plugin.element).on( "click tap", function( event ) {
        plugin[ext]();
      });
    },
    /**
     * Returns the exclude class name as a jQuery CSS selector.
     *
     * @private
     */
    toSelector: function( element, excludeClass ) {
      if( excludeClass === 'undefined' ) {
        excludeClass = "";
      }

      let selector = element + ":not('" + excludeClass + "')";

      return selector;
    },
    /**
     * Converts a table to CSV format.
     *
     * @param {string} excludeClass Table data elements of this class are
     * excluded from the output; if undefined, all columns are included.
     * @public
     */
    export_csv: function( excludeClass ) {
      let plugin = this;
      let settings = plugin.settings;
      let exports = settings.exports;
      let trd = exports.csv.temp_row_delimiter;
      let tcd = exports.csv.temp_col_delimiter;
      let rd = exports.csv.row_delimiter;
      let cd = exports.csv.col_delimiter;
      let dataSelector = plugin.toSelector( "td", excludeClass );

      // Find all the table data (td) elements.
      let $rows = $(settings.source).find( "tr:has(td)" );

      let csv = '"' + $rows.map( function( i, row ) {
        let $row = $(row);
        let $cols = $row.find( dataSelector );

        return $cols.map( function( j, col ) {
          let $col = $(col);
          let text = $col.text();
          
          // Escape double quotes.
          return text.replace( /"/g, '""' );
        }).get().join( tcd );
      }).get().join( trd )
      .split( trd ).join( rd )
      .split( tcd ).join( cd ) + '"';

      return csv;
    },
    /**
     * Converts a table to CSV format and sends to browser for download.
     *
     * @protected
     */
    csv: function() {
      let plugin = this;
      let settings = plugin.settings;
      let exports = settings.exports;
      let csv = this.export_csv();
      this.download( csv, exports.csv );
    },
    /**
     * Converts a table to JSON format.
     *
     * @param {string} excludeClass Table data elements of this class are
     * excluded from the output; if undefined, all columns are included.
     * @return {object} A JSON string.
     * @public
     */
    export_json: function( excludeClass ) {
      let plugin = this;
      let settings = plugin.settings;
      let source = settings.source;
      let headers = [];
      let th = "thead > tr > " + plugin.toSelector( "th", excludeClass );
      let td = plugin.toSelector( "td", excludeClass );

      // Find the headings for the json data map.
      $.each( $(source).parent().find( th ), function( i, j ) {
        headers.push( $(j).text().toLowerCase() );
      });

      let json = [];
      
      $.each( $(source).find( "tr" ), function( k, v ) {
        let row = {};

        $.each( $(this).find( td ), function( i, j ) {
          row[ headers[i] ] = $(this).text().trim();
        });

        json.push( row );
      });

      return JSON.stringify( json );
    },
    /**
     * Converts a table to JSON format and sends to browser for download.
     *
     * @protected
     */
    json: function() {
      let plugin = this;
      let settings = plugin.settings;
      let exports = settings.exports;
      let json = this.export_json();
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

      let href = "";
      let target = "";

      if( window.Blob && window.URL ) {
        let blob = new Blob( [data], {
          type: content_type.meda_type_text + "; charset=" + settings.charset
        });

        href = URL.createObjectURL( blob );
      }
      else {
        href =
          "data:" + content_type.media_type_data +
          "; charset=" + settings.charset +
          "," + encodeURIComponent( data );
      }

      $(plugin.element).attr({
        "download": settings.filename,
        "href": href,
        "target": target
      });
    },
    /**
     * Returns an array of comma-separated values. This function splits
     * the given string at each end of line marker.
     *
     * @param content The string to split.
     * @precondition content parameter was generated using the export function.
     * @return {array} The given content split into an array of strings.
     */
    toArray: function( content ) {
      let delim = this.settings.exports.csv.row_delimiter;

      return content.split( delim );
    }
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

