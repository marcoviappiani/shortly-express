var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');
var Link = require('./link.js')


var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true, 

  links: function(){
    return this.hasMany(Link);
  },

  initialize: function(){
    console.log('------INITIALIZE - GOT HERE')
    this.on('saving', function(model) {
      bcrypt.genSalt(null,function(err,salt){
        bcrypt.hash(model.get('password'), salt, null, function(err, hash) {
          model.set('password', hash);
          model.set('salt', salt);
        });
      });
      //this.hashPassword(model);      
    }, this);

    console.log('----- INITIALIZE PASSWORD', this.get('password'));
    console.log('----- INITIALIZE SALT', this.get('salt'));
  }, 
  checkCredentials: function(input,callback) {
    var hash = this.get('password'); 
    // Load hash from your password DB.
    bcrypt.compare(input, hash, function(err, res) {
      callback(res);
    });
  }






  /*,
  hashPassword: function(model) {
    var user = model;
    var inputPassword = user.get('password');
    console.log('------PASSWORD',inputPassword);
    bcrypt.genSalt(null,function(err,salt){

      console.log('------SALT',salt);

      bcrypt.hash(inputPassword, salt, null, function(err, hash) {
        console.log('------STARTING TO HASH - GOT HERE')

        user.set('password', hash);

        console.log('------PASSWORD',user.get('password'));
        user.set('salt', salt);

        console.log('----- NEW PASSWORD', user.get('password'));
        console.log('----- SALT ADDED', user.get('salt'));
      });
    });
  } */    
});

module.exports = User;







/*


bcrypt.hash("bacon", null, null, function(err, hash) {
    // Store hash in your password DB.
});
 
// Load hash from your password DB.
bcrypt.compare("bacon", hash, function(err, res) {
    // res == true
});
bcrypt.compare("veggies", hash, function(err, res) {
    // res = false
});

*/
