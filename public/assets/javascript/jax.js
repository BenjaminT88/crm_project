// Array of day names
var dayNames = new Array("Sunday","Monday","Tuesday","Wednesday", "Thursday","Friday","Saturday");
// Array of month Names
var monthNames = new Array("January","February","March","April","May","June","July", "August","September","October","November","December");

var now = new Date();

// Show the date
$('#showdate').text((dayNames[now.getDay()] + ", " + monthNames[now.getMonth()] + " " + now.getDate() + ", " + now.getFullYear()));

$.ajax({
	url: '/user_info',
	method: 'GET'
}).then(function(data){

	$('#welcomeMsg').text("Welcome, " + data.first_name + "!");
	$('#currentUser').text(data.first_name + " " + data.last_name);

	if(data.role_id == 2) {
		$('#userIDtwo').append("<a class='nav-link dropdown-toggle' href='#' id='navbarDropdown' role='button' data-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>Manage</a><div class='dropdown-menu' aria-labelledby='navbarDropdown'><a class='dropdown-item' href='/accounts'>Accounts</a><a class='dropdown-item' href='/users'>Users</a></div>");

	}else {
		$('#userIDone').append("<a class='nav-link' href='/accounts'>Accounts</a>");
	}
});

$(document).ready(function() {

    $('#calendar').fullCalendar({
      header: {
        left: 'prev,next today',
        center: 'title',
        right: 'month,agendaWeek,agendaDay,listWeek'
      },
      defaultDate: '2018-09-12',
      navLinks: true, // can click day/week names to navigate views
      editable: true,
      eventLimit: true, // allow "more" link when too many events
      events: {
        url: '/eventjson',
        error: function() {
          $('#script-warning').show();
        }
      },
      loading: function(bool) {
        $('#loading').toggle(bool);
      }
    });

  });