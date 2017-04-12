
module.exports = function(app, express, passport, db, moment, async) 
{
  var usersRouter = express.Router();

  ///==================== ajax call to get item 
  app.get('/invoice/getProducts', function(req, res) 
  {
    res.json(app.locals.productsCache);
  });

  app.get('/invoice/getCustomers', function(req, res) 
  {
    res.json(app.locals.customersCache);
  });

  app.get('/invoice/getInvoiceCreate', function(req, res) 
  {
    res.json(app.locals.invoiceCreateCache);
  });

  app.get('/invoice/getInvoiceSold', function(req, res) 
  {
    res.json(app.locals.invoiceSoldCache);
  });

  ///==================== get the create display page
  app.get('/invoice/create', function(req, res) 
  {
    res.render('invoice/create.ejs', {user: req.user,
                     products : app.locals.productsCache,
                    customers : app.locals.customersCache,
                    transtype : app.locals.stateCache});
  });


  app.get('/invoice/print', function(req, res) 
  {
    res.render('invoice/print.ejs', {user: req.user});
  });

  app.get('/invoice/viewCreate', function(req, res) 
  {
    res.render('invoice/viewCreate.ejs', {user: req.user});
  });

  app.get('/invoice/viewSold', function(req, res) 
  {
    res.render('invoice/viewSold.ejs', {user: req.user});
  });


  app.get('/invoice/viewInvoice/:invoiceId', function(req, res) 
  {
    db.all('SELECT Products.name AS productName, Products.exchange, Invoice.*, Customers.* FROM Invoice \
        LEFT JOIN Customers ON Invoice.customerId = Customers.id \
        LEFT JOIN products ON Invoice.productId = Products.id WHERE invoiceId = ?', req.params.invoiceId,   function(err, row) 
    { 
      if(err)
        console.log("==== error :" + err);

      res.render('invoice/viewInvoice.ejs', {user: req.user, row : row});  
    });
  });


  app.get('/invoice/update/:invoiceId', function(req, res) 
  {
    db.all('SELECT Products.name AS productName, Products.exchange, Products.unit1, Products.unit2, Products.price As productPrice,\
        Products.hmc As productHmc, Products.longAn As productLongAn, Products.hmcPreOrder, Products.longAnPreOrder,\
        Invoice.*, Customers.name AS customerName FROM Invoice \
        LEFT JOIN Customers ON Invoice.customerId = Customers.id \
        LEFT JOIN products ON Invoice.productId = Products.id WHERE invoiceId = ?', req.params.invoiceId,   function(err, row) 
    { 
      if(err)
        console.log("==== error :" + err);

      res.render('invoice/update.ejs', {user: req.user, row : row, invoiceId:req.params.invoiceId});  
    });
  });


  app.post('/invoice/update/:invoiceId', function(req, res) 
  {
    db.run('DELETE FROM Invoice WHERE invoiceId = ?', req.params.invoiceId, function(error) {
      if(error) {
        return res.render('errorMsg.ejs', {message: "Cannot delete invoice."});   
      }
      else
      {
          var invoiceDate = moment(req.body.date, 'DD/MM/YYYY HH:mm', true);

          if(moment().diff(invoiceDate, 'days') > 0)
          {
            return res.render('errorMsg.ejs', {message: "Cannot create invoice with past date."});
          }
          if( !(/\S/.test(req.body.productsArr)))
          {
            return res.render('errorMsg.ejs', {message: "No products were in the invoice."});  
          }
          else if (/\S/.test(req.body.customerId) && typeof req.body.customerId !== 'undefined')
          {
            var invoiceId = req.params.invoiceId;
            var prodsArray = req.body.productsArr.split(',');
            var state = 1; // 1 for order, check state table
            var transactsArr = req.body.transactsArr;
            var updateTransact = false; 

            db.serialize( function() 
            {
              db.run("begin transaction");

              async.eachSeries(prodsArray, function(id, callback) 
              {
                



                db.run("INSERT INTO Invoice (date, invoiceId, customerId, productId, productType, hmc, longAn,  price, total, previous, state,\
                         transact, transactTotal, productsTotal, lastUpdate, timestamp)\
                          VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)", 
                          [req.body.date, invoiceId, req.body.customerId, id, req.body['products['+id+'][type]'], 
                          req.body['products['+id+'][hmc][unit2]'], 
                          req.body['products['+id+'][longAn][unit2]'], req.body['products['+id+'][price]'],
                          req.body['products['+id+'][total]'], req.body.previous, state, transactsArr, req.body.transactTotal,
                          req.body.productTotal, moment().format('L LT'), invoiceDate.unix() ],  function(error) 
                {
                  if(error){
                    callback(error);
                  }
                  else 
                  {
                    db.run("UPDATE Products set hmcPreOrder=hmcPreOrder+?, longAnPreOrder=longAnPreOrder+?, lastUpdate=? WHERE id = ?", 
                                [req.body['products['+id+'][hmc][unit2]'], req.body['products['+id+'][longAn][unit2]'], 
                                moment().format('L LT'), id],  function(error) 
                    {
                      callback(error);
                    });   
                  }
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
                    app.locals.updateInvoiceCreate(); 
                    app.locals.updateProduct(); 
                    return res.render('invoice/create.ejs', {user: req.user,success:true,
                           products : app.locals.productsCache,
                          customers : app.locals.customersCache,
                          transtype : app.locals.stateCache});
                  }
              });
            }); //db serialize   
        }
        else
          return res.render('errorMsg.ejs', {message: "Cannot find customer id"});
     
      }
    });
  });


  ///====================  add 
  app.post('/invoice/add',  function(req, res) 
  {
    var invoiceDate = moment(req.body.date, 'DD/MM/YYYY HH:mm', true);

    if(moment().diff(invoiceDate, 'days') > 0)
    {
      return res.render('errorMsg.ejs', {message: "Cannot create invoice with past date."});
    }
    if( !(/\S/.test(req.body.productsArr)))
    {
      return res.render('errorMsg.ejs', {message: "No products were in the invoice."});  
    }
    else if (/\S/.test(req.body.customerId) && typeof req.body.customerId !== 'undefined')
    {
      var invoiceId = Date.now();
      var prodsArray = req.body.productsArr.split(',');
      var state = 1; // 1 for order, check state table
      var transactsArr = req.body.transactsArr;
      var updateTransact = false; 

      db.serialize( function() 
      {
        db.get('SELECT * from Invoice WHERE customerId = ? AND state = 1', req.body.customerId, function(error, row)
        {
          if(error)
          {
            console.log("========err: " + err);
            res.status(500);
            return res.render('errorMsg.ejs', {message: "Error checking invoice"}); 
          }
          else if(row)
          {
            res.status(500);
            return res.render('errorMsg.ejs', {message: "There's an existing order not fulfill yet."}); 
          } 
          else 
          {
            db.run("begin transaction");

            async.eachSeries(prodsArray, function(id, callback) 
            {
              
              db.run("INSERT INTO Invoice (date, invoiceId, customerId, productId, productType, hmc, longAn,  price, total, previous, state,\
                     transact, transactTotal, productsTotal, lastUpdate, timestamp)\
                      VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", 
                      [req.body.date, invoiceId, req.body.customerId, id, req.body['products['+id+'][type]'],
                       req.body['products['+id+'][hmc][unit2]'], 
                      req.body['products['+id+'][longAn][unit2]'], req.body['products['+id+'][price]'],
                      req.body['products['+id+'][total]'], req.body.previous, state, transactsArr, req.body.transactTotal,
                      req.body.productTotal, moment().format('L LT'), moment().unix() ],  function(error) 
              {
                if(error){
                  callback(error);
                }
                else 
                {
                  db.run("UPDATE Products set hmcPreOrder=hmcPreOrder+?, longAnPreOrder=longAnPreOrder+?, lastUpdate=? WHERE id = ?", 
                              [req.body['products['+id+'][hmc][unit2]'], req.body['products['+id+'][longAn][unit2]'], 
                              moment().format('L LT'), id],  function(error) 
                  {
                    callback(error);
                  });   
                }
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
                  app.locals.updateInvoiceCreate(); 
                  app.locals.updateProduct(); 
                  res.render('invoice/create.ejs', {user: req.user,success:true,
                         products : app.locals.productsCache,
                        customers : app.locals.customersCache,
                        transtype : app.locals.stateCache});
                }
            }); //series
          } //else
        });

      }); //db serialize   
  }
  else
    return res.render('errorMsg.ejs', {message: "Cannot find customer id"});

}); // post



///==================== delete with id
app.delete('/invoice/delete/:invoiceId', function(req, res) 
{
  console.log("delete invoiceId:" + req.params.invoiceId);
 
  db.serialize( function() 
  {
    db.run("begin transaction");
     
    async.waterfall([
      function (callback) {
        db.all('SELECT * FROM Invoice WHERE invoiceId = ?', req.params.invoiceId, function(error, rows) 
        {
          if(error) {
            callback(error);
          }
          else
            callback(error, rows)
          });
      },
      function (rows, waterfallCallback) {
        async.eachSeries(rows, function (row, seriesCallback) 
        {
          db.run("UPDATE Products set hmcPreOrder=hmcPreOrder-?, longAnPreOrder=longAnPreOrder-?, lastUpdate=? WHERE id = ?", 
                  [row.hmc, row.longAn, moment().format('L LT'), row.productId],  function(error) 
          {
            seriesCallback(error);
          }); 
        }, waterfallCallback /* 2 */);
      },
      function(waterfallCallback) {
        db.run('DELETE FROM Invoice WHERE invoiceId = ?', req.params.invoiceId, function(error) {
            waterfallCallback(error);
        });              
      }
    ], function (err, result) {
            if(err) {
              db.run("rollback");
              console.log(" error: " + err);
              res.send(500, 'Something broke!');
            }
            else{
              db.run("commit");
              app.locals.updateProduct(); 
              app.locals.updateInvoiceCreate();
              res.json("success");
            }
      });
  }); //db serialize
}); // delete



app.post('/invoice/set/:invoiceId', function(req, res) 
{
  var errorCount = 0;
  var previousBalance = 0;

  db.serialize( function() 
  {
    db.run("begin transaction");
    async.waterfall([
          // update invoice
          function(callback) {
            db.run('UPDATE Invoice SET state = ?, lastUpdate = ? WHERE invoiceId = ?', [2, moment().format('L LT'), req.params.invoiceId], function(error) 
            {
              callback(error);
            });
          },
          // get transact ids
          function(callback) {
            db.get('SELECT * FROM Invoice WHERE invoiceId = ?', req.params.invoiceId, function(error, row)
            {
              callback(error,row.customerId, row.transact, row.productsTotal);
            });          
          },
          // update transact ids
          function(customerId, transArray, productsTotal, callback) {
            db.run('UPDATE Transact SET informed = 1 WHERE id IN ('+transArray+')', function(error) 
            {
              callback(error, customerId, transArray, productsTotal);
            });          
          },
          // get previous balance value
          function(customerId, transArray, productsTotal, callback) {
            //if there's transaction that needs to be subtract
            if(transArray) {
              db.get('SELECT * FROM Transact WHERE id IN ('+transArray+') ORDER BY balance ASC', function(error, row) 
              {
                if(!error){
                  if(row)
                    callback(error, customerId, row.balance, productsTotal);
                  else
                    callback(error, customerId, 0, productsTotal);
                }
                else{
                  callback(error, customerId, 0, productsTotal);
                }
              });
            }
            else {
              // get customer last transaction
              db.get('SELECT * FROM Transact WHERE customerId = ? AND informed=1 ORDER BY timestamp DESC', customerId, function(error, row) 
              {
                if(!error){
                  if(row)
                    callback(error, customerId, row.balance, productsTotal);
                  else
                    callback(error, customerId, 0, productsTotal);
                }
                else{
                 callback(error, customerId, 0, productsTotal); 
                }

              });
            }
          },
          // create new transaction invoice 
          function(customerId, previousBalance, productsTotal, callback) {
            db.run("INSERT INTO Transact (date, customerId, transactionType, referenceId, previousBalance, value, balance, note, informed, lastUpdate, timestamp)\
              VALUES(?, ?, ?, ?, ?, ?, ?, ? ,?, ?, ?)", 
               [moment().format('L LT'), customerId, 10, req.params.invoiceId, previousBalance, productsTotal,
                (previousBalance+productsTotal), '', 1, moment().format('L LT'), moment().unix()], 
               function(error) 
            {
              callback(error);
            });          
          }, // loop through all the invoice
          function (callback) {
            db.all('SELECT * FROM Invoice WHERE invoiceId = ?', req.params.invoiceId, function(error, rows) 
            {
              if(error) {
                callback(error);
              }
              else
                callback(error, rows);
              });
          },  // subtract from inventory
          function (rows, waterfallCallback) {
            async.eachSeries(rows, function (row, seriesCallback) 
            {
              db.run("UPDATE Products set hmcPreOrder=hmcPreOrder-?, longAnPreOrder=longAnPreOrder-?,\
                      hmc=hmc-?, longAn=longAn-?, lastUpdate=? WHERE id = ?", 
                    [row.hmc, row.longAn, row.hmc, row.longAn, moment().format('L LT'), row.productId],  function(error) 
              {
                seriesCallback(error);
              }); 
            }, waterfallCallback);
          }
        ], function (err, result) {
            if(err){
              db.run("rollback");
              console.log("===== err:" + err);
              return res.status(500).json({err:err});
            }
            else
            {
              db.run("commit");
              app.locals.updateProduct();
              app.locals.updateInvoiceCreate();
              app.locals.updateInvoiceSold();
              app.locals.updateTransaction();

              res.status(200).json("success");
            }
          });
      }); // db serialize
});


app.post('/invoice/preview', function(req, res) 
{
  var prodsArray = req.body.productsArr.split(',');
  var prods = [];

  for( var i =0; i < prodsArray.length; i++)
  {
    for( var j = 0; j < app.locals.productsCache.length; j++)
    {
      if(app.locals.productsCache[j].productId == prodsArray[i])
      {
        prods.push(app.locals.productsCache[j]);
      }
    }
  }

  for( var i = 0; i < app.locals.customersCache.length; i++)
  {
    if(req.body.customerId == app.locals.customersCache[i].id )
    {
      return res.render('invoice/preview.ejs', {user: req.user, req: req, row: app.locals.customersCache[i], prods: prods});
    }
  }

  res.status(500);
  return res.render('errorMsg.ejs', {message: "could not find id"});
});



  return usersRouter;
};
