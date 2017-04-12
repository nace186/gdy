module.exports = function(app, express, passport, db, moment) 
{
  var usersRouter = express.Router();

  app.get('/transaction/getType', function(req, res)
  {
    res.json(app.locals.stateCache);
  });

  ///==================== ajax call to get item
  app.get('/transaction/getTransaction', function(req, res) 
  {
    res.json(app.locals.transactionCache);
  });

  app.get('/transaction/getCustomers', function(req, res) 
  {
    res.json(app.locals.customersCache);
  });

  app.get('/transaction/getCustomerUninformed/:id', function(req, res) 
  {
    db.all('SELECT * FROM Transact WHERE customerId = ? AND informed = ?', [req.params.id, 0], function(err, row) {
      if (err) {
        console.log("getCustomerLatest error: " + err);
          return '';
      }

      if (!row) {
        return '';
      } else
        res.json(row);
    });
  });


  app.get('/transaction/getCustomerLatest/:id', function(req, res) 
  {
    db.all('SELECT * FROM Transact WHERE customerId = ? AND informed = ?', [req.params.id, 0], function(err, row) 
    {
      if (err) 
      {
        console.log("getCustomerLatest error: " + err);
        return res.json('');
      }

      if (row.length == 0) 
      {
        db.get('SELECT * FROM Transact WHERE customerId = ? ORDER BY date DESC', req.params.id, function(err, row) 
        {
          if (err) {
            console.log("getCustomerLatest error2: " + err);
            return res.json('');
          }

          if (!row) {
            return res.json('');
          } else
            res.json(row);
        });
      } else
        res.json(row);
    });
  });


   app.get('/transaction/getCustTransaction/:id', function(req, res) 
   {
      db.all('SELECT Transact.*, Customers.name, State.nameVn, State.nameCn, State.nameEn FROM Transact LEFT JOIN \
             Customers ON Transact.customerId = Customers.id LEFT JOIN \
             State ON Transact.transactionType = State.id WHERE customerId = ? ORDER BY date', req.params.id, function(err, row) {
         if (err) {
            console.log("getCustTransaction error: " + err);
            return '';
         }

         if (!row) {
            return '';
         } else
            res.json(row);
      });
   });


  ///==================== get the main display page
  app.get('/transaction/viewTransaction/:id', function(req, res) 
  {
    console.log("got to here");
    for (var i = 0; i < app.locals.transactionCache.length; i++) 
    {
      if (req.params.id == app.locals.transactionCache[i].id) {
        return res.render('transaction/viewTransaction.ejs', 
            {user: req.user, id: req.params.id, row: app.locals.transactionCache[i] });
      }
    }    
  });


   ///==================== get the main display page
  app.get('/transaction/viewCustomer/:id', function(req, res) 
  {
    for (var i = 0; i < app.locals.transactionCache.length; i++) {
      if (req.params.id == app.locals.transactionCache[i].customerId) {
        return res.render('transaction/viewCustomer.ejs', {user: req.user,
                                                    id: req.params.id,
                                                    name: app.locals.transactionCache[i].name });
            }
         }
        
    res.status(500);
    return res.render('errorMsg.ejs', {
                  message: "could not find id"
               });
  });


   ///==================== get the main display page
      app.get('/transaction/display', function(req, res) 
      {
         res.render('transaction/display.ejs', {user: req.user});
       });


   ///==================== get the create display page
   app.get('/transaction/create', function(req, res) {
      res.render('transaction/create.ejs', {
         user: req.user,
         states: app.locals.stateCache,
         customers: app.locals.customersCache
      });
   });


   ///==================== get update page
   app.get('/transaction/update/:id', function(req, res) 
   {
      for (var i = 0; i < app.locals.transactionCache.length; i++) {
         if (req.params.id == app.locals.transactionCache[i].id) {
            return res.render('transaction/update.ejs', {
               user: req.user,
               row: app.locals.transactionCache[i],
               states: app.locals.stateCache
            });
         }
      }

      res.status(500);
      return res.render('errorMsg.ejs', {
         message: "could not find id"
      });

   });




   ///==================== post  update 
  app.post('/transaction/update/:id', function(req, res) 
  {
    var checked = 0;
    if(req.body.informed)
      checked = 1;

    db.run('UPDATE Transact SET transactionType = ?, referenceId = ?, previousBalance = ?, value = ?, balance = ?,\
                        note = ?, informed = ?, lastUpdate = ? WHERE id = ?', [req.body.transactionType, req.body.referenceId, req.body.previousBalance,
                         req.body.value, req.body.balance, req.body.note, checked, moment().format('L LT'), req.params.id],
            function(error) 
            {
               if (!error) {
                  app.locals.updateTransaction();
                  res.redirect('/transaction/display');
               } else {
                  console.log(error.message);
                  return res.render('errorMsg.ejs', {
                     message: error.message
                  });
               }
      });
   })




   ///====================  add 
  app.post('/transaction/add', function(req, res) 
  {
    var transDate = moment(req.body.date, 'DD/MM/YYYY HH:mm', true);
         if (/\S/.test(req.body.newValue) && typeof req.body.newValue !== 'undefined') 
         {
            var checked = 0;
            if(req.body.informed)
               checked = 1;

            db.run("INSERT INTO Transact (date, customerId, transactionType, referenceId, previousBalance, value, balance, note, informed, lastUpdate, timestamp) \
              VALUES(?, ?, ?, ?, ?, ?, ?, ? , ?, ?)", 
               [req.body.date, req.body.customerId, req.body.state, req.body.referenceId, req.body.previous, req.body.newValue,
                req.body.balance, req.body.note, checked, moment().format('L LT'), transDate.unix()], 
               function(error) 
               {
                  if (!error) 
                  {
                     app.locals.updateTransaction();
                     res.redirect('/transaction/display');
                  }else {
                  console.log(error.message);
                  return res.render('errorMsg.ejs', {
                     message: error.message
                  });
               }

            });

         }
         else {
               console.log(error.message);
               return res.render('errorMsg.ejs', {
                  message: "error.message"
               });
            }
   });// post



   ///==================== delete with id
   app.delete('/transaction/delete/:id', function(req, res) {

      db.run('DELETE FROM Transact WHERE id = ?', req.params.id, function(error) {

         if (!error) {
            app.locals.updateTransaction();
            res.json("success");
         } else
            res.send(500, 'Something broke!');
      }); // run              
   }); // delete


  return usersRouter;
};