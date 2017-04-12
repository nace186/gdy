
module.exports = function(app, express, passport, db) {
	var usersRouter = express.Router();


	///==================== ajax call to get location
	app.get('/location/getLoc', function(req, res) {	
		res.json(app.locals.locationCache);
	});



	///==================== get the main display page
	app.get('/location/display', function(req, res) {
		res.render('location/display.ejs', {user: req.user});		
    });



	///==================== get update page
    app.get('/location/update/:id',  function(req, res) {
    	
 		db.get('SELECT * FROM Location WHERE id = ?', req.params.id, function(err, row) {
          if (!row) {
          	res.status(500);
          	return res.render('errorMsg.ejs', {message: "could not find id"});
          }
          else 
          	return res.render('location/update.ejs', {user: req.user, row: row});
      	});	
    });



	///====================  update 
	app.post('/location/update/:id',  function(req, res) {
    	
    	//return res.render('errorMsg.ejs', {message: "could not find id"});
    	if (/\S/.test(req.body.name) && typeof req.body.name !== 'undefined') {
    		db.run('UPDATE Location SET locName = ? WHERE id = ?', [req.body.name, req.params.id], function(error) {
	        if (!error){
	        	app.locals.updateLocation();
	        	res.redirect('/location/display');
	        }
	        else {
	          	console.log(error.message);
				return res.render('errorMsg.ejs', {message: "error.message"});
	          }
	      	});				
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty Location"});
    })



    ///====================  add 
	app.post('/location/add',  function(req, res) {
		
		if (/\S/.test(req.body.location) && typeof req.body.location !== 'undefined') {
			db.get('SELECT * FROM Location WHERE locName = ?', req.body.location, function(err, row) {
				if (!row) {
					db.run("INSERT INTO Location (locName) VALUES(?)", req.body.location, function(error) {

						if(!error) {
							app.locals.updateLocation();
							res.redirect('/location/display');
						}
						else{
							console.log(error.message);
							return res.render('errorMsg.ejs', {message: "error.message"});
						}
					});
				}
				else				
					return res.render('errorMsg.ejs', {message: "Location already exist"});				
			});
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty location"});
	}); // post



	///==================== delete with id
	app.delete('/location/delete/:id', function(req, res) {
		console.log("delete id:" + req.params.id);

		db.run('DELETE FROM Location WHERE id = ?', req.params.id, function(error) {

			if(!error) {
				app.locals.updateLocation();
				res.json("success");
			}
			else
				res.send(500, 'Something broke!');
		}); // run				
	}); // delete


    return usersRouter;
};
