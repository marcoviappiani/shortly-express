var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');

var session = require('express-session')

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

var genuuid = function(){
  return Math.round(Math.random()*0x100000000).toString(16)
};

app.use(session({
  // genid: function(req) {
  //   return genuuid() // use UUIDs for session IDs
  // },
  secret: 'Rene and Marco are so cool!!!',
  cookie: { maxAge: 400000 },
  resave: true,
  saveUninitialized: true
}));

app.use(function(req,res,next){
  var sess = req.session;
  console.log('===== CHECKING SESSION',sess.user, req.sessionID);
  if((req.url==='/'|| req.url==='/create' || req.url==='/links')&&(!sess.user)){
    console.log('===== LOGGED OUT!');
    res.redirect(302,'/login');
  }else{
    next();
  }
});


app.get('/', 
function(req, res) {
  res.render('index');
});

app.get('/create', 
function(req, res) {
  res.render('index');
});

app.get('/links', 
function(req, res) {
  var userId = req.session.user;

  Links.reset().query({where: { user_id: userId }}).fetch().then(function(links) {
    res.send(200, links.models);
  // Links.reset().fetch({where : {user_id: userId}}).then(function(links) {
  //   res.send(200, links.models);
  });
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }
  var userId = req.session.user;

  new Link({ url: uri}).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin,
          user_id: userId
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/


//login
app.get('/login', 
function(req, res) {
  res.render('login');
});


app.post('/login', function(req, res){
  // req.session.user = true;
  //res.redirect('create');



  var username = req.body.username;
  var password = req.body.password;
  Users.query({where: { username: username }})
  .fetchOne()
  .then(function(model){
    model.checkCredentials(password,function(valid){
      if(valid){
        //Init Session
        var sess = req.session;
        sess.user = model.get('id');
        console.log('---------------USER SESSION:',sess.user);
        res.redirect(302,'/');
      }else{
        res.redirect(302,'/login');
      }
    });
  });
});

//signup
app.get('/signup', 
function(req, res) {
  // res.session.user = false;
  res.render('signup', {
    // session: res.session
  });
});


app.post('/signup', function(req, res){
  var username = req.body.username;
  var password = req.body.password;

  Users.query({where: { username: username }})
  .fetchOne()
  .then(function(model){
    if(model) {
      res.redirect(301,'/login');
    } else {
      new User({
        'username': username,
        'password': password
        }).save().then(function(user){
          Users.add(user);
          user.save();
          var sess = req.session;
          sess.user = user.get('id');
          console.log('---------------USER SESSION 2:' ,sess.user);
          res.redirect(302,'/');
        });
    }
  });

});


//logout
app.get('/logout', function(req, res){
  var sess = req.session;
  // sess.user = false;
  sess.destroy();
  res.redirect(302,'/login');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0]}).fetch().then(function(link) {
    //TODO add user_id
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
