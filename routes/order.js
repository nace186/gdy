
module.exports = function(app, express, passport, db, moment, async) 
{
  var usersRouter = express.Router();

  ///==================== ajax call to get item 
  app.get('/order/getProducts', function(req, res) 
  {
    res.json(app.locals.productsCache);
  });

  app.get('/order/getOrders', function(req, res) 
  {
    res.json(app.locals.orderCache);
  });


  ///==================== get the create display page
  app.get('/order/create', function(req, res) 
  {
    res.render('order/create.ejs', {user: req.user, orderType: app.locals.orderTypeCache});
  });

  app.get('/order/cReturn', function(req, res) 
  {
    res.render('order/createReturn.ejs', {user: req.user, orderType: app.locals.orderTypeCache});
  });


  app.get('/order/display', function(req, res) 
  {
    res.render('order/display.ejs', {user: req.user});
  });


  ///==================== get the main display page
  app.get('/order/viewOrder/:id', function(req, res) 
  {
    db.all('SELECT Orders.*, OrderType.*, Customers.name As customerName, Products.name AS productName FROM Orders\
              LEFT JOIN OrderType ON Orders.type = OrderType.id\
              LEFT JOIN Customers ON Orders.customerId = Customers.id \
              LEFT JOIN Products ON Orders.productId = Products.id WHERE Orders.orderId = ?',  req.params.id,   function(err, row) 
    {
      if(err){
        console.log("====== error: " + err);
        return res.render('errorMsg.ejs', {message: "Error with view order"}); 
      }
      else
        return res.render('order/viewOrder.ejs', {user: req.user, row: row });
    });
  });

  ///====================  add 
  app.post('/order/add',  function(req, res) 
  {
    var orderId = Date.now();
    var orderDate = moment(req.body.date, 'DD/MM/YYYY HH:mm', true);

    if(moment().diff(orderDate, 'days') > 0)
    {
      return res.render('errorMsg.ejs', {message: "Cannot create order with past date."});
    }
    if( !(/\S/.test(req.body.productsArr)))
    {
      return res.render('errorMsg.ejs', {message: "No products were in the order."});  
    }
      else
    {      
      var prodsArray = req.body.productsArr.split(',');
      var errorCount = 0;

      db.serialize( function() 
      {
        db.run("begin transaction");

        async.each(prodsArray, function(product, callback) 
        {
          db.run("UPDATE Products set hmc=?, longAn=?, lastUpdate=? WHERE id = ?", 
                  [req.body['products['+product+'][new][hmc][unit2]'], req.body['products['+product+'][new][longAn][unit2]'], 
                  moment().format('L LT'), product ],  function(error) 
          {
            if(error)
              callback(error);
            else 
            {
              db.run("INSERT INTO Orders (date, orderId, type, productId, hmc, longAn, productsTotal, note, timestamp)\
                      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                      [req.body.date, orderId, req.body.type, product, req.body['products['+product+'][hmc][unit2]'], 
                      req.body['products['+product+'][longAn][unit2]'], req.body.total, req.body.note, moment().unix() ],   function(error) 
              {
                      callback(error);
              });
            } // else
          });

        }, function(err) {
          if(err){
              console.log("========err: " + err);
              db.run("rollback");
              res.status(500);
              return res.render('errorMsg.ejs', {message: "Error with insert"}); 
          }
          else
          {
            db.run("commit");
            app.locals.updateProduct();
            app.locals.updateOrder();
            return res.render('order/create.ejs', {user: req.user, success: true, orderType: app.locals.orderTypeCache});
                //return res.redirect('/order/create');
          }

        });
      }); // serialize

    }

  }); // post


  app.post('/order/addReturn',  function(req, res) 
  {
    console.log(" === date: " + req.body.date);
    var orderId = Date.now();
    var orderDate = moment(req.body.date, 'DD/MM/YYYY HH:mm', true);

    if(moment().diff(orderDate, 'days') > 0)
    {
      return res.render('errorMsg.ejs', {message: "Cannot create order with past date."});
    }
    if( !(/\S/.test(req.body.productsArr)))
    {
      return res.render('errorMsg.ejs', {message: "No products were in the order."});  
    }
    else if (!(/\S/.test(req.body.customerId)) && req.body.type == 3)
    {
      return res.render('errorMsg.ejs', {message: "Cannot find customer id"});
    }
    else
    {
      var prodsArray = req.body.productsArr.split(',');
      var errorCount = 0;

      db.serialize( function() 
      {
        db.run("begin transaction");

        async.series([
          function(seriesCallback) {
            // loop through each products and update its inventory, then create an order for each.
            async.eachSeries(prodsArray, function(product, callback) 
            {
              db.run("UPDATE Products set hmc=?, longAn=?, lastUpdate=? WHERE id = ?", 
                      [req.body['products['+product+'][new][hmc][unit2]'], req.body['products['+product+'][new][longAn][unit2]'], 
                      moment().format('L LT'), product ],  function(error) 
              {
                if(error)
                  callback(error);
                else 
                {
                  db.run("INSERT INTO Orders (date, type, customerId, orderId, productId, hmc, longAn, productsTotal, note, timestamp)\
                          VALUES(?,?,?,?,?,?,?,?,?,?)", 
                          [req.body.date, 0, req.body.customerId, orderId, product, req.body['products['+product+'][hmc][unit2]'], 
                          req.body['products['+product+'][longAn][unit2]'],
                           Number(req.body['products['+product+'][hmc][unit2]']) + Number(req.body['products['+product+'][longAn][unit2]']), 
                           req.body.note, moment().unix() ],   function(error) 
                  {
                    callback(error);
                  });

                } // else
              });

            }, function(err) {
                seriesCallback(err);
            });
            
          },
          // get customer latest previous balance, and create a new transaction
          function(seriesCallback) {
            db.get('SELECT * FROM Transact WHERE customerId = ? ORDER BY timestamp DESC', req.body.customerId, function(error, row) 
            {
              if(error)
                seriesCallback(error);
              else {
                var balance = 0;
                if(row){
                  balance = row.balance;
                }

                db.run("INSERT INTO Transact (date, customerId, transactionType, referenceId, previousBalance, value,\
                        balance, note, informed, lastUpdate, timestamp)\
                        VALUES(?, ?, ?, ?, ?, ?, ?, ? ,?, ?, ?)", 
                      [moment().format('L LT'), req.body.customerId, 23, orderId, balance, req.body.total,
                        (Number(balance)+Number(req.body.total)), '', 0, moment().format('L LT'), moment().unix()], 
                  function(error) 
                {
                  seriesCallback(error);
                });

              }//else
            });

          },
          // update orders referenceid with the new transaction id
          function(seriesCallback) {
            db.get("SELECT * FROM Transact WHERE referenceId = ?", orderId, function(error, row) 
            {
              if(error)
                seriesCallback(error);
              else
              {
                db.run('UPDATE Orders SET referenceId = ? WHERE orderId = ?', [row.id, orderId], function(error) 
                {
                  seriesCallback(error);
                });
              }
            });
          }
          ],
          function(err, results) {
            if(err){
              console.log("========err: " + err);
              db.run("rollback");
              res.status(500);
              return res.render('errorMsg.ejs', {message: "Error with insert"}); 
            }
            else
            {
              db.run("commit");
              app.locals.updateProduct();
              app.locals.updateOrder();
              app.locals.updateTransaction();
              return res.render('order/create.ejs', {user: req.user, success: true, orderType: app.locals.orderTypeCache});
                    //return res.redirect('/order/create');
            }
        });

        
      }); // serialize

    }

  }); // post

  ///==================== delete with id
  app.delete('/order/delete/:invoiceId', function(req, res) 
  {
    console.log("delete invoiceId:" + req.params.invoiceId);

    db.run('DELETE FROM Invoice WHERE invoiceId = ?', req.params.invoiceId, function(error) 
    {
      if(!error) {
          app.locals.updateInvoiceCreate();
          res.json("success");
        }
        else
          res.send(500, 'Something broke!');
    }); // run              
  }); // delete

  return usersRouter;
};
