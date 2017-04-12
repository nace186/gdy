
module.exports = function(app, express, passport, db) {
	var usersRouter = express.Router();


	///==================== ajax call to get type
	app.get('/type/getType', function(req, res) {	
		res.json(app.locals.typeCache);
	});

	///==================== get the main display page
	app.get('/type/display', function(req, res) {
		res.render('type/display.ejs', {user: req.user});		
    });

	///==================== get update page
    app.get('/type/update/:id',  function(req, res) {
    	
 		db.get('SELECT * FROM ProductType WHERE id = ?', req.params.id, function(err, row) {
          if (!row) {
          	res.status(500);
          	return res.render('errorMsg.ejs', {message: "could not find id"});
          }
          else 
          	return res.render('type/update.ejs', {user: req.user, row: row});
      	});	
    });



	///====================  update 
	app.post('/type/update/:id',  function(req, res) {
    	
    	//return res.render('errorMsg.ejs', {message: "could not find id"});
    	if (/\S/.test(req.body.code) && typeof req.body.code !== 'undefined') {
    		db.run('UPDATE ProductType SET code = ?, nameCn = ?, nameVn = ?, nameEn=? WHERE id = ?', [req.body.code, req.body.nameCn, req.body.nameVn, req.body.nameEn, req.params.id], function(error) {
	        if (!error){
	        	app.locals.updateType();
	        	res.redirect('/type/display');
	        }
	        else {
	          	console.log(error.message);
				return res.render('errorMsg.ejs', {message: "error.message"});
	          }
	      	});				
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty Type"});
    })



    ///====================  ADD
	app.post('/type/add',  function(req, res) 
	{	
		if (/\S/.test(req.body.code) && typeof req.body.code !== 'undefined') {
			db.get('SELECT * FROM ProductType WHERE code = ?', req.body.code, function(err, row) {
				if (!row) {
					db.run("INSERT INTO ProductType (code, nameCn, nameVn, nameEn) VALUES(?, ?, ?, ?)", [req.body.code, req.body.nameCn, req.body.nameVn, req.body.nameEn], function(error) {

						if(!error) {
							app.locals.updateType();
							res.redirect('/type/display');
						}
						else{
							console.log("=========== error : " + error.message);
							return res.render('errorMsg.ejs', {message: error.message});
						}
					});
				}
				else				
					return res.render('errorMsg.ejs', {message: "code already exist"});	
			});
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty type"});
	}); // post



	///==================== delete with id
	app.delete('/type/delete/:id', function(req, res) 
	{
		db.get('SELECT * FROM ProductType WHERE id = ?', req.params.id, function(err, row) 
		{
			var code = row.code;

			db.get('SELECT * FROM Products WHERE type = ?', code, function(err, row) 
			{
				if (!row) 
				{
					db.run('DELETE FROM ProductType WHERE id = ?', req.params.id, function(error) {

						if(!error) 
						{
							app.locals.updateType();
							res.json("success");
						}
						else
							res.send(500, 'Unable to delete type '+code+' from database.');
					}); // run delete
				}
				else
				{
					res.send(500, "There appear to be products associated with this type, please update the products before deleting.");
				}

			}); // search products

		}); // find code
	}); // delete


    return usersRouter;
};
