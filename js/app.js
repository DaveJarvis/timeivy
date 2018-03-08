$(document).ready(function() {
  /**
   * Convert time to HH:MMa format when any time input value changes.
   */
  $(".time").change( function() {
    var $this = $(this);
    var time = $(this).val();

    $(this).val( time.toTime() );
  });
});

