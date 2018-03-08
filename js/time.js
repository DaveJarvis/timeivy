"use strict";

/*
	var testCases = [
		'1:00 pm','1:00 p.m.','1:00 p','1:00pm','1:00p.m.','1:00p','1 pm',
		'1 p.m.','1 p','1pm','1p.m.', '1p','13:00','13', '1a', '2400', '1000',
    '100', '123', '2459', '2359', '1100', '123p', '1a' ];

	for ( var i = 0; i < testCases.length; i++ ) {
		console.log( testCases[i].padStart( 9, ' ' ) + " = " + testCases[i].toTime() );
	}
*/
String.prototype.toTime = function () {
	var time = this;
	var post_meridiem = false;
	var hours = 0;
  var minutes = 0;

	if( time != null ) {
		post_meridiem = time.match( /p/i );

		// Strip the string down to digits and convert to a number.
		time = parseInt( time.replace( /\D/g, '' ) );
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
	else if( time > 2400 ) {
		// After 2400, it's midnight again.
		hours = 0;
		minutes = (time % 100);
		post_meridiem = false;
	}

	if( hours > 12 ) {
		post_meridiem = true;
		hours -= 12;
	}

	if( minutes > 59 ) {
		minutes = 59;
	}

  var result =
		(""+hours).padStart( 2, "0" ) + ":" + (""+minutes).padStart( 2, "0" ) +
		(post_meridiem ? "PM" : "AM");
;
	return result;
};

