
module.exports = function(app, express, passport, db) {
	var usersRouter = express.Router();

	///==================== ajax call to get customer
	app.get('/customer/getCustomers', function(req, res) {	
		res.json(app.locals.customersCache);
	});

	///==================== get the main display page
	app.get('/customer/display', function(req, res) {		
		res.render('customer/display.ejs', {user: req.user});		
    });
	
	///==================== get update page
    app.get('/customer/update/:id',  function(req, res) 
    {
		for( var i = 0; i < app.locals.customersCache.length; i++)
    	{    		
    		if(req.params.id == app.locals.customersCache[i].id )
    		{
    			return res.render('customer/update.ejs', {user: req.user, 
    				row: app.locals.customersCache[i]});
    		}    		
    	}
			
		res.status(500);
        return res.render('errorMsg.ejs', {message: "could not find id"});
    });



	///====================  update the row
	app.post('/customer/update/:id',  function(req, res) 
	{	
    	if (/\S/.test(req.body.code) && typeof req.body.code !== 'undefined' && /\S/.test(req.body.name) && typeof req.body.name !== 'undefined') 
    	{
    		db.get('SELECT * FROM Customers WHERE id = ?', req.params.id, function(err, row) 
    		{
    			if (!row) 
    			{
    				res.status(500);
          			return res.render('errorMsg.ejs', {message: "could not find id"});
    			}
    			else
    			{
    				var datetime = new Date();

    				db.run('UPDATE Customers SET ms = ?, code = ?, name = ?, shortHand = ?, address = ?, area = ?, city = ?, phone = ?, contact = ?,\
    				  admin = ?, transportAddress = ?, transportPhone = ?, inboundTime = ?, outboundTime = ?, transport = ?, remarks = ?, remitter = ?,\
    				  effective = ?, lastUpdate = ? WHERE id = ?', [req.body.ms, req.body.code, req.body.name, req.body.shortHand, req.body.address,
    				  												req.body.area, req.body.city, req.body.phone, req.body.contact, req.body.admin,
    				  												req.body.transportAddress, req.body.transportPhone, req.body.inboundTime, req.body.outboundTime,
    				  												req.body.transport, req.body.remarks, req.body.remitter, req.body.effective, datetime.toISOString(),
    				  												 req.params.id ], function(error) 
    				{
    					if(!error) {
    						app.locals.updateCustomer();
		        			res.redirect('/customer/display');
		        		}
		        		else
		        		{
		        			console.log(error.message);
							return res.render('errorMsg.ejs', {message: error.message});
		        		}
    				});
    			}
    		})
		}
		else
			return res.render('errorMsg.ejs', {message: "Empty customer"});
    });


    ///==================== add a customer
	app.post('/customer/add',  function(req, res) 
	{
		if (/\S/.test(req.body.code) && typeof req.body.code !== 'undefined' && /\S/.test(req.body.name) && typeof req.body.name !== 'undefined') 
    	{
    		db.get('SELECT * FROM Customers WHERE code = ?', req.body.code, function(err, row) {

    			if (row) 
    			{
    				res.status(500);
          			return res.render('errorMsg.ejs', {message: "code already exist!"});
    			}
    			else
    			{
    				var datetime = new Date();

    				db.run('INSERT INTO Customers (ms, code, name, shortHand, address, area, city, phone, contact, admin, transportAddress, transportPhone, \
    					inboundTime, outboundTime, transport, remarks, remitter, effective, lastUpdate) \
    					VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
    					[req.body.ms, req.body.code, req.body.name, req.body.shortHand, req.body.address,
    				  	req.body.area, req.body.city, req.body.phone, req.body.contact, req.body.admin,
    				  	req.body.transportAddress, req.body.transportPhone, req.body.inboundTime, req.body.outboundTime,
    				  	req.body.transport, req.body.remarks, req.body.remitter, req.body.effective, datetime.toISOString()], function(error) 
    				{
    					if(!error) {
    						app.locals.updateCustomer();
		        			res.redirect('/customer/display');
		        		}
		        		else
		        		{
		        			console.log(error.message);
							return res.render('errorMsg.ejs', {message: error.message});
		        		}
    				});
    			}
    		})
		}
		else
			return res.render('errorMsg.ejs', {message: "customer code or name is empty!"});
	}); // post


	///==================== delete with id
	app.delete('/customer/delete/:id', function(req, res) 
	{
		db.run('DELETE FROM Customers WHERE id = ?', req.params.id, function(error) {

			if(!error) 
			{
				app.locals.updateCustomer();
				res.json("success");
			}
			else
				res.send(500, 'Unable to delete customer '+req.params.id+' from database.');
		}); // delete
    });

    return usersRouter;
};
