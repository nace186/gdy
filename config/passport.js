// config/passport.js

// load all the things we need
var LocalStrategy   = require('passport-local').Strategy;


// expose this function to our app using module.exports
module.exports = function(passport, db) {

    // =========================================================================
    // passport session setup ==================================================
    // =========================================================================
    // required for persistent login sessions
    // passport needs ability to serialize and unserialize users out of session

    // used to serialize the user for the session
    passport.serializeUser(function(user, done) {
        
        done(null, user);
    });

    // used to deserialize the user
    passport.deserializeUser(function(user, done) {

        db.get('SELECT uid, username, level, lang FROM User WHERE uid = ?', user.uid, function(err, row) {
            if (!row) return done(null, false);
        
            return done(null, row);
        });
    });


    passport.use(new LocalStrategy(function(username, password, done) {             

        db.get('SELECT uid, name, level, lang FROM User WHERE username = ? AND password = ?', username, password, function(err, row) {
          if (!row) return done(null, false);
        
          return done(null, row);
        });
      
    }));


}; //module