
module.exports = function(app, express, passport, db) {
	var usersRouter = express.Router();


	///==================== ajax call to get item
	app.get('/product/getProducts', function(req, res) 
	{
		res.json(app.locals.productsCache);
	});

	///==================== get the main display page
	app.get('/product/display', function(req, res) 
	{
		res.render('product/display.ejs', {user: req.user,
					products : app.locals.productsCache,
					type : app.locals.typeCache,
				    manu : app.locals.manufacturerCache});
    });

	///==================== get update page
    app.get('/product/update/:id',  function(req, res) 
    {
    	for( var i = 0; i < app.locals.productsCache.length; i++)
    	{    		
    		if(req.params.id == app.locals.productsCache[i].productId ){
    			return res.render('product/update.ejs', {user: req.user, 
    				row: app.locals.productsCache[i], 
    				type : app.locals.typeCache,
				    manu : app.locals.manufacturerCache});
    		}    		
    	}
			
			res.status(500);
          	return res.render('errorMsg.ejs', {message: "could not find id"});

    });


	///==================== get updateInventory page
    app.get('/product/updateInventory/:id',  function(req, res) 
    {
    	for( var i = 0; i < app.locals.productsCache.length; i++)
    	{    		
    		if(req.params.id == app.locals.productsCache[i].productId ){
    			return res.render('product/updateInventory.ejs', {user: req.user, 
    				row: app.locals.productsCache[i]});
    		}    		
    	}
			
			res.status(500);
          	return res.render('errorMsg.ejs', {message: "could not find id"});
    });


	///==================== post  update 
	app.post('/product/update/:id',  function(req, res) {
    	
    	
    	if (/\S/.test(req.body.code) && typeof req.body.code !== 'undefined' &&
			/\S/.test(req.body.productName) && typeof req.body.productName !== 'undefined'
    		) 
    	{
    		var datetime = new Date();
    		db.run('UPDATE Products SET code = ?, name = ?, unit1 = ?, unit2 = ?, exchange = ?,\
    				 type = ?, manufacturer = ?, hmc = ?, longAn = ?, lastUpdate = ? WHERE id = ?',
    				 [req.body.code, req.body.productName, req.body.unit1, req.body.unit2, req.body.exchange,
    				  req.body.type, req.body.manu, req.body.hmc, req.body.longAn, datetime.toISOString(), req.params.id],
    				  function(error) 
    		{
		        if (!error){
		        	app.locals.updateProduct();
		        	res.redirect('/product/display');
		        }
		        else {
		          	console.log(error.message);
					return res.render('errorMsg.ejs', {message: error.message});
	          	}
	      	});				
		}
		else
			return res.render('errorMsg.ejs', {message: "Code or Name field is empty!"});
    })


	///==================== post  update Inventory 
	app.post('/product/updateInventory/:id',  function(req, res) 
	{    	
    	db.run('UPDATE Products SET hmc = ?, longAn = ?, lastUpdate = ?  WHERE id = ?',
    			 [req.body.hmc, req.body.longAn, new Date().toISOString(),  req.params.id], function(error) {
	      if (!error){
	       	app.locals.updateProduct();
	       	res.redirect('/product/display');
	      }
	      else {
	      	console.log(error.message);
			return res.render('errorMsg.ejs', {message: "error.message"});
	      }
	    });				
    })


    ///====================  add 
	app.post('/product/add',  function(req, res) {
		
		if (/\S/.test(req.body.name) && typeof req.body.name !== 'undefined'){
			
					var datetime = new Date();

					db.run("INSERT INTO Item (itemName, type, manu, grade, hole, quantity, sold, price, lastUpdate) VALUES(?, ?, ?, ?, ?, ?, ?, ? ,?)", 
						[req.body.name, req.body.type, req.body.manu, req.body.grade, req.body.hole, req.body.quantity, 0, req.body.price, datetime.toISOString() ], function(error) {
						
						if(!error) {

							db.run("INSERT INTO Inventory (id, loc1, loc2, loc3) VALUES(?, ?, ?, ?)", 
								[this.lastID, req.body.loc1, req.body.loc2, req.body.loc3], function (error) {
								app.locals.updateProduct();
								res.redirect('/item/display');
							
								if( error )	
									console.log(error.message);
							});
							
						}
						else{
							console.log(error.message);
							return res.render('errorMsg.ejs', {message: "error.message"});
						}
					});
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty Name"});
	}); // post



	///==================== delete with id
	app.delete('/product/delete/:id', function(req, res) {
		console.log("delete id:" + req.params.id);

		db.run('DELETE FROM Products WHERE id = ?', req.params.id, function(error) {

			if(!error) {
				app.locals.updateProduct();
				res.json("success");
			}
			else
				res.send(500, 'Something broke!');
		}); // run				
	}); // delete


    return usersRouter;
};
