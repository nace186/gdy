
module.exports = function(app, express, passport) {
	var usersRouter = express.Router();

	app.get('/', function(req, res) {

        res.render('index.ejs', {user: req.user} ); // load the index.ejs file
    });

    return usersRouter;
};



