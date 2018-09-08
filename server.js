// load the things we need
var express = require('express');
var app = express();
var mysql = require('mysql');
var bcrypt = require('bcryptjs');
var userIDtempReset;

// method override
var methodOverride = require('method-override');
app.use(methodOverride('_method'));

//you need this to be able to process information sent to a POST route
	var bodyParser = require('body-parser');

	// parse application/x-www-form-urlencoded
	app.use(bodyParser.urlencoded({ extended: true }));

	// parse application/json
	app.use(bodyParser.json());

// set the view engine to ejs
	app.set('view engine', 'ejs');

//session stuff
	var cookieParser = require('cookie-parser');

	var session = require('express-session');

//allow sessions
	app.use(session({ secret: 'app', cookie: { maxAge: 1*1000*60*60*24*7 }}));

	app.use(cookieParser());

// checks if a user is logged in
function isAuthenticated(req, res, next){
	if(req.session.user_id) next();
	else res.redirect('/login');
}

// checks if session is stored locally
app.use(function(req, res, next){
	res.locals.session = req.session;
	next();
});

// Initializes the connection variable to sync with a MySQL database
var connection = mysql.createConnection({
	host: "127.0.0.1",
  
	// Your port; if not 3306
	port: 3306,
  
	// Your username
	user: "root",
  
	// Your password
	password: "password",
	database: "crm_db"
});

// homepage
app.get('/', function(req, res) {
	if(req.session.user_id == undefined){
		res.redirect('/login');
	}else{
		res.redirect('/todos');
	}
});

// ===================
// Log-in System
// ===================
// ===================
// Sign Up Page
// ===================
	app.get('/signup', function(req, res) {
		connection.query('SELECT * FROM security_questions', function(err, results){
			res.render('pages/signup', {
				dat: results
			});
		});
	});

	app.post('/signup', function(req, res){
		bcrypt.genSalt(10, function(err, salt) {
			// res.send(salt);
			bcrypt.hash(req.body.password, salt, function(err, p_hash) { 
				// res.send(p_hash);
				connection.query('INSERT INTO users (first_name, last_name, email, password_hash, security_question_id, security_answer, role_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [req.body.first_name, req.body.last_name, req.body.email, p_hash, req.body.security_question_id, req.body.security_answer, req.body.role_id],function (error, results, fields) {
				var what_user_sees = "";
				if (error){
					what_user_sees = 'Something went wrong - please go back to homepage';
					res.send(what_user_sees);
				}else{
					res.redirect('/main');
				}});
			});
		});
	});

// ===================
// Login page
// ===================
	app.get('/login', function(req, res) {
		res.render('pages/login');
	});

	app.post('/login', function(req, res){
		connection.query('SELECT * FROM users WHERE email = ?', [req.body.email],function (error, results, fields) {
			if (error) throw error;
			// res.json(results);
			if (results.length == 0){
				res.render('pages/login_err');
			}else {
				bcrypt.compare(req.body.password, results[0].password_hash, function(err, result) {
					if (result == true){
					req.session.user_id = results[0].id;
					req.session.email = results[0].email;
					req.session.role_id = results[0].role_id;
					req.session.first_name = results[0].first_name;
					req.session.last_name = results[0].last_name;
					res.redirect('/');
					}else{
					res.render('pages/login_err');
					}
				});
			};
		});
	});

	app.get('/user_info', function(req, res){
		var user_info = {
			user_id : req.session.user_id,
			first_name : req.session.first_name,
			last_name : req.session.last_name,
			email: req.session.email,
			role_id: req.session.role_id
		}
		res.json(user_info);
	});

	app.get('/logout', function(req, res){
		req.session.destroy(function(err){
			res.render('pages/logout');
		})
	});

// ===================	
// Reset Password
// ===================
	// forgot password page
	app.get('/user_verification', function(req, res) {
		res.render('pages/user_verification');
	});

	// verify email and forward to security question check
	app.post('/user_verification', function(req, res){
		connection.query('SELECT * FROM users WHERE email = ?', [req.body.email],function (error, results, fields) {
			var qID = results[0].security_question_id;
			userIDtempReset = results[0].id;
			connection.query('SELECT * FROM security_questions WHERE id = ?', [qID],function (err, resp, fie) {
				res.render('pages/security_check', {
					question: resp[0].security_question
				});
			});
		});
	});

	// check answer to security question and forward to reset password
	app.post('/security_check', function(req, res){
		connection.query('SELECT * FROM users WHERE id = ?', [userIDtempReset],function (error, results, fields) {
			if (req.body.security_answer != results[0].security_answer){
				res.send("Wrong Answer. Retry");
			}else if (error){
				res.send("Something went wrong...");
			}else{
				res.render('pages/reset_password');
			};
		});
	});

	// sets new password
	app.post('/reset_password', function(req, res){
		bcrypt.genSalt(10, function(err, salt) {
			bcrypt.hash(req.body.password, salt, function(err, p_hash) { 
				connection.query('UPDATE users SET password_hash = ? WHERE id = ?', [p_hash, userIDtempReset],function (error, results, fields) {
				var what_user_sees = "";
				if (error){
					what_user_sees = 'Something went wrong - please go back to homepage';
					res.send(what_user_sees);
				}else{
					res.redirect('/');
					console.log("password reset!");
					userIDtempReset = "";
				}});
			});
		});
	});

// ===================
// show all accounts
// ===================
	app.get('/accounts', isAuthenticated, function(req, res) {
		connection.query('SELECT * FROM accounts', function(err, results){
			res.render('pages/accounts', {
				data: results
			});
		});
	});

// ===================
// show all deals
// ===================
	app.get('/deals', isAuthenticated, function(req, res) {
		connection.query('SELECT account_stages.name, account_stages.id, accounts.first_name as contact_first_name, accounts.last_name as contact_last_name, tim, users.first_name as rep_first_name, users.last_name as rep_last_name, accounts.company, accounts.id as account_id, account_stages.amount, stage FROM account_stages LEFT JOIN stages ON account_stages.stage_id = stages.id LEFT JOIN accounts on account_stages.account_id = accounts.id LEFT JOIN users on accounts.user_id = users.id WHERE accounts.user_id = ?', [req.session.user_id], function(err, results){
			if (err) throw err;
			results = results.map(function(el){
				var doo = new Date(el.tim);
				var monStr = doo.getMonth()+1;
				var dateStr = doo.getDate();
				var hourStr = doo.getHours();
				var minStr = doo.getMinutes();
				var secStr = doo.getSeconds();
				if(monStr<10){monStr = "0"+monStr};
				if(dateStr<10){dateStr = "0"+dateStr};
				if(hourStr<10){hourStr = "0"+hourStr};
				if(minStr<10){minStr = "0"+minStr};
				if(secStr<10){secStr = "0"+secStr};
				var dString = `${doo.getFullYear()}-${monStr}-${dateStr}`;
				el['date'] = dString;
				return el;
			});
			res.render('pages/deals', {
				data: results
			});
		});
	});	

// ===================
// create new deal from account page
// ===================
	app.get('/create_deal/:id', isAuthenticated, function(req, res){
		connection.query('SELECT * FROM accounts WHERE id = ?', [req.params.id],function (error, results, fields) {
			var newDealTempOb = results[0];
			connection.query('SELECT * FROM stages', function (err, resp, fie) {
				res.render('pages/create_deal', {
					data: resp,
					dat: newDealTempOb
				});
			});
		});
	});

// ===================
// create new deal from deals page
// ===================	
	app.get('/create_deal_blank', isAuthenticated, function(req, res){
		connection.query('SELECT * FROM accounts WHERE user_id = ?', [req.session.user_id],function (error, results, fields) {
			var newDealTempOb = results;
			connection.query('SELECT * FROM stages', function (err, resp, fie) {
				res.render('pages/create_deal_blank', {
					data: resp,
					dat: newDealTempOb
				});
			});
		});
	});

// ===================
// submit create new deal form
// ===================		
	app.post('/create_deal', function(req, res){
		connection.query("INSERT INTO account_stages SET name = ?, amount = ?, account_id = ?, stage_id = ?", [req.body.name, req.body.amount, req.body.account_id, req.body.stage_id], function(error, results, fields) {
			res.redirect('/deals');
		  }
		);
	});

// ===================
// Edit new deal from deals page
// ===================
	app.get('/edit_deal/:account_id', isAuthenticated, function(req, res){
		connection.query('SELECT * FROM accounts LEFT JOIN account_stages on account_stages.account_id = accounts.id WHERE accounts.id = ?', [req.params.account_id],function (error, results, fields) {
			var newDealTempOb = results[0];
			connection.query('SELECT * FROM stages', function (err, resp, fie) {
				res.render('pages/edit_deal', {
					data: resp,
					dat: newDealTempOb
				});
			});
		});
	});

// ===================
// update deal
// ===================
	app.put('/update_deal/:id', function(req, res){
		connection.query("UPDATE account_stages SET stage_id = ?, amount = ?, name = ? WHERE account_id = ?",[req.body.stage_id, req.body.amount, req.body.name, req.body.account_id],function(err, response) {
			if (err) throw err;
			res.redirect('/deals');
		});
	});

// ===================
// notes initialization page - choose the company of which the notes you would like to see
// ===================
	app.get('/initnotes', isAuthenticated, function(req, res) {
		connection.query('SELECT account_stages.id as id, account_stages.account_id, account_stages.name, accounts.company FROM account_stages LEFT JOIN accounts on account_stages.account_id = accounts.id WHERE accounts.user_id = ?', [req.session.user_id], function(err, results){
			res.render('pages/initialize_notes', {
				dat: results
			});
		});
	});

// ===================
// retrieve notes from selected company
// ===================
	app.post('/initnotes', function(req, res) {
			connection.query('SELECT * FROM notes LEFT JOIN account_stage_notes on notes.id = account_stage_notes.note_id LEFT JOIN account_stages on account_stage_notes.account_stage_id = account_stages.id LEFT JOIN accounts on account_stages.account_id = accounts.id LEFT JOIN stages on account_stages.stage_id = stages.id WHERE account_stages.id = ?', [req.body.id],function (error, results, fields) {
				var what_user_sees = "";
				if (error){
					what_user_sees = 'Something went wrong - please go back';
					res.send(what_user_sees);
				}else{
					console.log(results);
					res.render('pages/notes', {
						dat: results
					});
				}
			});

	});

// ===================
// retrieve notes from deals page
// ===================
	app.get('/initnotes/:account_id', function(req, res) {
		connection.query('SELECT * FROM account_stages WHERE account_id = ?', [req.params.account_id], function(err, result){
			var dataTemp = result[0];
			connection.query('SELECT * FROM notes LEFT JOIN account_stage_notes on notes.id = account_stage_notes.note_id LEFT JOIN account_stages on account_stage_notes.account_stage_id = account_stages.id LEFT JOIN accounts on account_stages.account_id = accounts.id LEFT JOIN stages on account_stages.stage_id = stages.id WHERE account_stages.account_id = ?', [req.params.account_id],function (error, results, fields) {
				var what_user_sees = "";
				if (error){
					what_user_sees = 'Something went wrong - please go back';
					res.send(what_user_sees);
				}else{
					res.render('pages/notes', {
						datTemp: dataTemp,
						dat: results
					});
				}
			});
		});
	});

// ===================	
//	edit notes page
// ===================
	app.get('/edit_note/:account_id/:note_id', isAuthenticated, function(req, res) {
		connection.query('SELECT * FROM notes LEFT JOIN account_stage_notes on notes.id = account_stage_notes.note_id LEFT JOIN account_stages on account_stage_notes.account_stage_id = account_stages.id LEFT JOIN accounts on account_stages.account_id = accounts.id LEFT JOIN stages on account_stages.stage_id = stages.id WHERE account_stages.account_id = ? AND note_id = ?', [req.params.account_id, req.params.note_id], function(err, results){
			res.render('pages/edit_note', {
				data: results[0]
			});
		});
	});

// ===================
// update note
// ===================
	app.put('/update_note/:id', function(req, res){
		connection.query("UPDATE notes SET note = ? WHERE id = ?",[req.body.note, req.body.note_id],function(err, response) {
			if (err) throw err;
			connection.query("UPDATE account_stages SET name = ?, amount = ? WHERE id = ?",[req.body.name, req.body.amount, req.body.account_stage_id],function(error, resp) {
				if (error) throw error;
				res.redirect('/initnotes');
			});
		});
	});

// ===================
// delete note - only manager can do this
// ===================
	app.delete('/delete_note/:note_id', function(req, res){	
		connection.query("DELETE FROM account_stage_notes WHERE note_id = ?",[req.params.note_id],function(err, response) {
			if (err) throw err;
			connection.query("DELETE FROM notes WHERE id = ?",[req.params.note_id],function(err, response) {
				if (err) throw err;
				res.redirect('/initnotes');
			});
		});
	});

// ===================
// create new note for an existing deal - from /initnotes/:account_id
// ===================
	app.get('/create_note/:account_id', isAuthenticated, function(req, res) {
		connection.query('SELECT account_stages.id, account_stages.name, account_stages.amount, account_stages.account_id, accounts.company FROM account_stages LEFT JOIN accounts on account_stages.account_id = accounts.id WHERE account_id = ?', [req.params.account_id], function(err, results){
			res.render('pages/create_note', {
				data: results[0],
			});
		});
	});

	app.post('/create_note/:id', function(req, res){
		connection.query("INSERT INTO notes SET note = ?, user_id = ?",[req.body.note, req.session.user_id],function(err, respo) {
			if (err) throw err;
			connection.query("select max(id) as max from notes", function(erro, resp){
				if (erro) console.log(erro);
				var noteMaxId = resp[0].max;
				connection.query("INSERT INTO account_stage_notes SET account_stage_id = ?, note_id = ?",[req.body.account_stage_id, noteMaxId],function(error, response) {
					if (error) throw error;
					res.redirect('/initnotes');
				});
			});
		});
	});

// ===================
// show all todos in the future
// ===================
	app.get('/todos', isAuthenticated, function(req, res) {
		connection.query('SELECT todos.id, todo, name, amount, company, first_name, last_name, email, due FROM todos LEFT JOIN account_stages ON todos.account_stage_id = account_stages.id LEFT JOIN accounts ON account_stages.account_id = accounts.id where due > current_timestamp and accounts.user_id = ?', [req.session.user_id], function(err, results){
			if (err) throw err;
			results = results.map(function(el){
				var doo = new Date(el.due);
				var monStr = doo.getMonth()+1;
				var dateStr = doo.getDate();
				var hourStr = doo.getHours();
				var minStr = doo.getMinutes();
				var secStr = doo.getSeconds();
				if(monStr<10){monStr = "0"+monStr};
				if(dateStr<10){dateStr = "0"+dateStr};
				if(hourStr<10){hourStr = "0"+hourStr};
				if(minStr<10){minStr = "0"+minStr};
				if(secStr<10){secStr = "0"+secStr};
				var dString = `${doo.getFullYear()}-${monStr}-${dateStr}  ${hourStr}:${minStr}:${secStr}`;
				el['datetime'] = dString;
				return el;
			});
			res.render('pages/todos', {
				data: results
			});
		});
	});	

// ===================
// show all past due todos
// ===================
	app.get('/overdue', isAuthenticated, function(req, res) {
		connection.query('SELECT todos.id, todo, name, amount, company, first_name, last_name, email, due FROM todos LEFT JOIN account_stages ON todos.account_stage_id = account_stages.id LEFT JOIN accounts ON account_stages.account_id = accounts.id where due < current_timestamp and accounts.user_id = ?', [req.session.user_id], function(err, results){
			if (err) throw err;
			results = results.map(function(el){
				var doo = new Date(el.due);
				var monStr = doo.getMonth()+1;
				var dateStr = doo.getDate();
				var hourStr = doo.getHours();
				var minStr = doo.getMinutes();
				var secStr = doo.getSeconds();
				if(monStr<10){monStr = "0"+monStr};
				if(dateStr<10){dateStr = "0"+dateStr};
				if(hourStr<10){hourStr = "0"+hourStr};
				if(minStr<10){minStr = "0"+minStr};
				if(secStr<10){secStr = "0"+secStr};
				var dString = `${doo.getFullYear()}-${monStr}-${dateStr}  ${hourStr}:${minStr}:${secStr}`;
				el['datetime'] = dString;
				return el;
			});
			res.render('pages/overdue', {
				data: results
			});
		});
	});	

// ===================
// edit todo from todo page
// ===================
	app.get('/edit_todo/:todo_id', isAuthenticated, function(req, res){
		connection.query('SELECT todos.id, todo, name, amount, company, first_name, last_name, email, due FROM todos LEFT JOIN account_stages ON todos.account_stage_id = account_stages.id LEFT JOIN accounts ON account_stages.account_id = accounts.id WHERE todos.id = ?', [req.params.todo_id],function (error, results, fields) {
			results = results.map(function(el){
				var doo = new Date(el.due);
				var monStr = doo.getMonth()+1;
				var dateStr = doo.getDate();
				var hourStr = doo.getHours();
				var minStr = doo.getMinutes();
				var secStr = doo.getSeconds();
				if(monStr<10){monStr = "0"+monStr};
				if(dateStr<10){dateStr = "0"+dateStr};
				if(hourStr<10){hourStr = "0"+hourStr};
				if(minStr<10){minStr = "0"+minStr};
				if(secStr<10){secStr = "0"+secStr};
				var dString = `${doo.getFullYear()}-${monStr}-${dateStr}  ${hourStr}:${minStr}:${secStr}`;
				el['datetime'] = dString;
				return el;
			});
			res.render('pages/edit_todo', {
				data: results[0],
			});
		});
	});

// ===================
// update todo
// ===================
	app.put('/update_todo/:todo_id', function(req, res){
		connection.query("UPDATE todos SET todo = ?, due = ?WHERE id = ?",[req.body.todo, req.body.due, req.params.todo_id],function(err, response) {
			if (err) throw err;
			res.redirect('/todos');
		});
	});

// ===================
// delete todo
// ===================
	app.delete('/delete_todo/:todo_id', function(req, res){	
		connection.query("DELETE FROM todos WHERE id = ?",[req.params.todo_id],function(err, response) {
			if (err) throw err;
			res.redirect('/todos');
		});
	});

// ===================
// create new todo from deals page
// ===================	
	app.get('/create_todo/:account_stage_id', isAuthenticated, function(req, res){
		connection.query('SELECT account_stages.id AS account_stage_id, name, amount, company  FROM account_stages LEFT JOIN accounts ON account_stages.account_id = accounts.id WHERE account_stages.id = ?', [req.params.account_stage_id],function (error, results, fields) {
			res.render('pages/create_todo', {
				data: results[0]
			});
		});
	});

// ===================
// submit create new deal form
// ===================		
	app.post('/create_todo/:account_stage_id', function(req, res){
		connection.query("INSERT INTO todos SET todo = ?, due = ?, account_stage_id = ?", [req.body.todo, req.body.due, req.params.account_stage_id], function(error, results, fields) {
			res.redirect('/todos');
		}
		);
	});

// ===================
// main page
// ===================
	app.get('/main', isAuthenticated, function(req, res) {
		connection.query('SELECT * FROM accounts WHERE user_id = ?', [req.session.user_id], function(err, results){
			res.render('pages/todos', {
				data: results
			});
		});
	});

// ===================
// accounts page - for managers
// ===================
	app.get('/accounts', isAuthenticated, function(req, res) {
		connection.query('SELECT * FROM accounts', function(err, results){
			res.render('pages/accounts', {
				data: results
			});
		});
	});

// ===================
// accounts page - for sales reps
// ===================
	app.get('/accounts_rep', isAuthenticated, function(req, res) {
		connection.query('SELECT * FROM accounts WHERE user_id = ?', [req.session.user_id], function(err, results){
			res.render('pages/accounts', {
				data: results
			});
		});
	});

// ===================
// create new account page
// ===================
	app.get('/createaccount', isAuthenticated, function(req, res) {
		res.render('pages/create_new_account');
	});

	app.post('/create_account', function(req, res){
		connection.query("INSERT INTO accounts SET ?", req.body, function(err, response) {
			res.redirect('/main');
		  }
		);
	});

// ===================
// create new user page
// ===================
	app.get('/createuser', isAuthenticated, function(req, res) {
		connection.query('SELECT * FROM security_questions', function(err, results){
			res.render('pages/create_new_user', {
				dat: results
			});
		});
	});

// ===================	
//	edit account page - only manager can do this
// ===================
	app.get('/edit_account/:id', isAuthenticated, function(req, res) {
		connection.query('SELECT * FROM accounts WHERE id = ?', [req.params.id], function(err, results){
			res.render('pages/edit_account', {
				data: results[0]
			});
		});
	});

// ===================
// update account
// ===================
	app.put('/update_account/:id', function(req, res){
		var query = connection.query(
		  "UPDATE accounts SET ? WHERE id = ?",
		  [req.body, req.params.id],
		  function(err, response) {
			if (err) throw err;
			res.redirect('/accounts');
		  }
		);
	});

// ===================
// delete account
// ===================
	app.delete('/delete_account/:id', function(req, res){	
		var query = connection.query(
		  "DELETE FROM accounts WHERE id = ?",
		  [req.params.id],
		  function(err, response) {
			if (err) throw err;
			res.redirect('/accounts');
		  }
		);
	});

// ===================	
// users table
// ===================
	app.get('/users', isAuthenticated, function(req, res) {
		connection.query('SELECT users.id, users.first_name, users.last_name, users.email, users.role_id, roles.role FROM users LEFT JOIN roles ON users.role_id = roles.id;', function(err, results){
			res.render('pages/users', {
				data: results
			});
		});
	});

// ===================	
// edit users page
// ===================
	app.get('/edit_user/:id', isAuthenticated, function(req, res) {
		connection.query('SELECT * FROM users WHERE id = ?', [req.params.id], function(err, results){
			res.render('pages/edit_user', {
				data: results[0]
			});
		});
	});

// ===================
//user update
// ===================
	app.put('/update_user/:id', function(req, res){
		var query = connection.query(
		  "UPDATE users SET ? WHERE id = ?", [req.body, req.params.id], function(err, response) {
			if (err) throw err;
			res.redirect('/users');
		  }
		);
	});

// ===================
// user delete
// ===================
	app.delete('/delete_user/:id', function(req, res){	
		var query = connection.query(
		  "DELETE FROM users WHERE id = ?", [req.params.id], function(err, response) {
			if (err) throw err;
			res.redirect('/users');
		  }
		);
	});

app.listen(3000, function(){
	console.log('listening on 3000');
});