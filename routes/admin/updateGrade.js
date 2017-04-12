
module.exports = function(app, express, passport, db) {
	var usersRouter = express.Router();


	///==================== ajax call to get grade
	app.get('/grade/getGrade', function(req, res) {	
		res.json(app.locals.gradeCache);
	});



	///==================== get the main display page
	app.get('/grade/display', function(req, res) {
		res.render('grade/display.ejs', {user: req.user});		
    });



	///==================== get update page
    app.get('/grade/update/:id',  function(req, res) {
    	
 		db.get('SELECT * FROM Grade WHERE id = ?', req.params.id, function(err, row) {
          if (!row) {
          	res.status(500);
          	return res.render('errorMsg.ejs', {message: "could not find id"});
          }
          else 
          	return res.render('grade/update.ejs', {user: req.user, row: row});
      	});	
    });



	///====================  update 
	app.post('/grade/update/:id',  function(req, res) {
    	
    	if (/\S/.test(req.body.grade) && typeof req.body.grade !== 'undefined') {
    		db.run('UPDATE Grade SET gradeName = ? WHERE id = ?', [req.body.grade, req.params.id], function(error) {
	        if (!error){
	        	app.locals.updateGrade();
	        	res.redirect('/grade/display');
	        }
	        else {
	          	console.log(error.message);
				return res.render('errorMsg.ejs', {message: "error.message"});
	          }
	      	});				
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty Grade"});
    })



    ///====================  add 
	app.post('/grade/add',  function(req, res) {
		
		if (/\S/.test(req.body.grade) && typeof req.body.grade !== 'undefined'){
			db.get('SELECT * FROM Grade WHERE gradeName = ?', req.body.grade, function(err, row) {
				if (!row) {
					db.run("INSERT INTO Grade (gradeName) VALUES(?)", req.body.grade, function(error) {

						if(!error) {
							app.locals.updateGrade();
							res.redirect('/grade/display');
						}
						else{
							console.log(error.message);
							return res.render('errorMsg.ejs', {message: "error.message"});
						}
					});
				}
				else				
					return res.render('errorMsg.ejs', {message: "Grade already exist"});
			});
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty Grade"});
	}); // post



	///==================== delete with id
	app.delete('/grade/delete/:id', function(req, res) {
		console.log("delete id:" + req.params.id);

		db.run('DELETE FROM Grade WHERE id = ?', req.params.id, function(error) {

			if(!error) {
				app.locals.updateGrade();
				res.json("success");
			}
			else
				res.send(500, 'Something broke!');
		}); // run				
	}); // delete


    return usersRouter;
};
