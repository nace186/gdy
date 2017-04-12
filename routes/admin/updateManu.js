
module.exports = function(app, express, passport, db) {
	var usersRouter = express.Router();

	///==================== ajax call to get manufacturer
	app.get('/man/getMan', function(req, res) {	
		res.json(app.locals.manufacturerCache);
	});

	///==================== get the main display page
	app.get('/man/display', function(req, res) {		
		res.render('man/display.ejs', {user: req.user});		
    });
	
	///==================== get update page
    app.get('/man/update/:id',  function(req, res) {
    	
 		db.get('SELECT * FROM Manufacturer WHERE id = ?', req.params.id, function(err, row) {
          if (!row) {          	
          	res.status(500);
          	return res.render('errorMsg.ejs', {message: "could not find id"});
          }
          else 
          	return res.render('man/update.ejs', {user: req.user, row: row});
      	});	
    });



	///====================  update the row
	app.post('/man/update/:id',  function(req, res) 
	{	
    	if (/\S/.test(req.body.code) && typeof req.body.code !== 'undefined' && /\S/.test(req.body.name) && typeof req.body.name !== 'undefined') 
    	{

    		db.get('SELECT * FROM Manufacturer WHERE id = ?', req.params.id, function(err, row) {

    			if (!row) 
    			{
    				res.status(500);
          			return res.render('errorMsg.ejs', {message: "could not find id"});
    			}
    			else
    			{	// if code changed, update product table with new code before updating manu table
    				if(row.code != req.body.code) 
    				{
    					db.run('UPDATE Products SET manufacturer = ? WHERE manufacturer = ?', [req.body.code, row.code ], function(error) 
    					{
    						if(error) {
    							// log error to db
		          				console.log("============== "+error.message);								
		        			}
    					});

    				}
    				else
    					console.log("row:" + row.code + " body:" + req.body.code);
    			}
    		})

    		db.run('UPDATE Manufacturer SET code = ?, name = ? WHERE id = ?', [req.body.code, req.body.name, req.params.id], function(error) 
    		{
		        if (!error)
		        {
		        	app.locals.updateManufacturer();
		        	res.render('man/display.ejs', {user: req.user});
		        }
		        else {
		          	console.log(error.message);
					return res.render('errorMsg.ejs', {message: error.message});
		        }
	      	});
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty manufacturer"});
    });


    ///==================== add a manufacturer
	app.post('/man/add',  function(req, res) 
	{
		
		if (/\S/.test(req.body.manufacturer) && typeof req.body.manufacturer !== 'undefined' && /\S/.test(req.body.code) && typeof req.body.code !== 'undefined') {
			db.get('SELECT * FROM Manufacturer WHERE name = ?', req.body.manufacturer, function(err, row) {
				if (!row) {

					db.get('SELECT * FROM Manufacturer WHERE code = ?', req.body.code, function(err, row) 
					{
						if (!row) 
						{
							db.run("INSERT INTO Manufacturer (code, name) VALUES(?, ?)", req.body.code, req.body.manufacturer, function(error) 
							{
								if(!error) 
								{
									app.locals.updateManufacturer();
									res.redirect('/man/display');
								}
								else
								{
									console.log(error.message);
									return res.render('errorMsg.ejs', {message: error.message});
								}
							});
						}
						else
							return res.render('errorMsg.ejs', {message: "Manufacturer code exist"});
					});
				}
				else				
					return res.render('errorMsg.ejs', {message: "Manufacturer name exist"});				
			});
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty manufacturer"});
	}); // pos


	///==================== delete with id
	app.delete('/man/delete/:id', function(req, res) 
	{
		db.get('SELECT * FROM Manufacturer WHERE id = ?', req.params.id, function(err, row) 
		{
			var code = row.code;

			db.get('SELECT * FROM Products WHERE manufacturer = ?', code, function(err, row) 
			{
				if (!row) 
				{
					db.run('DELETE FROM Manufacturer WHERE id = ?', req.params.id, function(error) {

						if(!error) 
						{
							app.locals.updateManufacturer();
							res.json("success");
						}
						else
							res.send(500, 'Unable to delete manufacturer '+code+' from database.');
					}); // run delete
				}
				else
				{
					res.send(500, "There appear to be products associated with this manufacturer, please update the products before deleting.");
				}

			}); // search products
		});
	}); // delete


    return usersRouter;
};
