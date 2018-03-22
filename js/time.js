"use strict";

/**
 * Pads a string with the given string. This is used to zero-pad the starting
 * times.
 *
 * See https://stackoverflow.com/a/14760377
 */
String.prototype.padLeft = function( padding ) {
   return String( padding + this ).slice( -padding.length );
};

/**
 * Converts a string representing a user-entered time into a normal format.
 * The input can be of practically any sensible form to represent a time,
 * including: 1p, 1300, 123, 12, 2355, 215p, 1a, etc. The output is a
 * string in 12-hour format (HH:MM a), for example: 01:00 PM.
 *
 * See https://stackoverflow.com/a/49185071/59087
 */
String.prototype.toTime = function() {
  var time = this;
  var post_meridiem = false;
  var ante_meridiem = false;
  var hours = 0;
  var minutes = 0;

  if( time != null ) {
    post_meridiem = time.match( /p/i ) !== null;
    ante_meridiem = time.match( /a/i ) !== null;

    // Preserve 2400h time by changing leading zeros to 24.
    time = time.replace( /^00/, '24' );

    // Strip the string down to digits and convert to a number.
    time = parseInt( time.replace( /\D/g, '' ), 10 );
  }
  else {
    time = 0;
  }

  if( time > 0 && time < 24 ) {
    // 1 through 23 become hours, no minutes.
    hours = time;
  }
  else if( time >= 100 && time <= 2359 ) {
    // 100 through 2359 become hours and two-digit minutes.
    hours = ~~(time / 100);
    minutes = time % 100;
  }
  else if( time >= 2400 ) {
    // After 2400, it's midnight again.
    minutes = (time % 100);
    post_meridiem = false;
  }

  if( hours == 12 && ante_meridiem === false ) {
    post_meridiem = true;
  }
  else if( hours > 12 ) {
    post_meridiem = true;
    hours -= 12;
  }

  if( minutes > 59 ) {
    minutes = 59;
  }

  var result =
    (""+hours).padLeft( "00" ) + ":" + (""+minutes).padLeft( "00" ) +
    " " + (post_meridiem ? "PM" : "AM");

  return result;
};

