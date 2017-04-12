
module.exports = function(app, express, passport, i18n) {
	var usersRouter = express.Router();

    app.get('/logout', function(req, res){
      req.logout();
      res.redirect('/');
    });
  
    app.get('/login',function(req, res) {

        if (req.isAuthenticated()){
            res.redirect('/');
            console.log(" redirect to /")
        }
        else{
            res.render('login.ejs');
        }
    });

    app.post('/login', passport.authenticate('local', {        
                    failureRedirect : '/login'}), 
              function(req, res) {

       req.session.user = req.user;
       req.session.locale = req.user.lang;
       i18n.setLocale(req, req.session.locale);

       res.redirect('/');

    });


    return usersRouter;
};
