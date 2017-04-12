module.exports = function(app, express, passport, db, moment, async) 
{
  var usersRouter = express.Router();

  //=========================================================================
  //======================== type section ===================================

  app.get('/report/thisMonth', function(req, res) 
  {
    res.render('report/thisMonth.ejs', {user: req.user});
  });

  app.get('/report/thisMonth/GetAllOrder', function(req, res) 
  {
   // SELECT Orders.type, OrderType.*, Products.name AS productName, Products.code, Customers.name As customerName, sum(productsTotal) As total
   //  FROM Orders LEFT JOIN Products ON Orders.productId = Products.id
   //LEFT JOIN OrderType ON Orders.type = OrderType.id
    // LEFT JOIN Customers ON Orders.customerId = Customers.id WHERE Orders.timestamp >  1488255060 Group by Orders.type
            
    db.all('SELECT Orders.type, Orders.date, Orders.orderId, Orders.referenceId, Orders.hmc, Orders.longAn,\
      Products.name AS productName, Products.code, Customers.name As customerName\
      FROM Orders LEFT JOIN Products ON Orders.productId = Products.id\
      LEFT JOIN Customers ON Orders.customerId = Customers.id\
      WHERE Orders.timestamp > ? ',moment().startOf('month').unix(), function(err, row) 
    {
        if (!err) {
          res.status(200).json(row);
        }
        else{
          console.log("======= err: " + err);
          res.status(500).json('');
        }
    });    
  });

  app.get('/report/thisMonth/GetAllProduct', function(req, res) 
  {
            
    db.all('SELECT Invoice.*, Products.name AS productName, Products.code, Customers.name As customerName \
     FROM Invoice LEFT JOIN Products ON Invoice.productId = Products.id \
     LEFT JOIN Customers ON Invoice.customerId = Customers.id WHERE Invoice.timestamp > ?',moment().startOf('month').unix(),
    function(err, row) {
      if (!err) {
        res.status(200).json(row);
      }
      else{
        console.log("======= err: " + err);
        res.status(500).json('');
      }
    });    
  });

  app.get('/report/thisMonth/GetAllExpense', function(req, res) 
  {
            
    db.all('SELECT Expense.*, ExpenseType.nameEn, ExpenseType.nameCn, ExpenseType.nameVn\
     FROM Expense LEFT JOIN ExpenseType ON Expense.expenseType = ExpenseType.id WHERE Expense.timestamp > ?',moment().startOf('month').unix(),
    function(err, row) {
      if (!err) {
        res.status(200).json(row);
      }
      else{
        console.log("======= err: " + err);
        res.status(500).json('');
      }
    });    
  });



  app.get('/report/thisMonth/GetOrderTotal', function(req, res) 
  {    
    db.all('SELECT Orders.type, OrderType.*, sum(productsTotal) As total\
      FROM Orders LEFT JOIN OrderType ON Orders.type = OrderType.id\
      WHERE Orders.timestamp > ? Group by Orders.type',moment().startOf('month').unix(), function(err, row)
    {
      if (!err) {
        res.status(200).json(row);
      }
      else{
        console.log("======= err: " + err);
        res.status(500).json('');
      }
    });
  });

  app.get('/report/thisMonth/GetProductSoldTotal', function(req, res) 
  {
    db.all('SELECT Invoice.date AS invoiceDate, ProductType.*, sum(total) as value, (sum(Invoice.hmc) + sum(Invoice.longAn)) AS totalSold, Products.code,\
     Products.name AS productName,(Select (sum(hmc) + sum(longAn)) from Invoice) allTotal, (SELECT sum(total) from Invoice) valueTotal\
     FROM Invoice LEFT JOIN Products ON Invoice.productId = Products.id\
     LEFT JOIN ProductType ON Invoice.productType = ProductType.code WHERE timestamp > ? group by productId',
     moment().startOf('month').unix(), function(err, row) {
      if (!err) {
        res.status(200).json(row);
      }
      else{
        console.log("======= err: " + err);
        res.status(500).json('');
      }
    });
  });

  app.get('/report/thisMonth/GetProductTotalByType', function(req, res) 
  {
    db.all('SELECT ProductType.*, sum(total) as value, (sum(Invoice.hmc) + sum(Invoice.longAn)) AS totalSold,\
     (Select (sum(hmc) + sum(longAn)) from Invoice) allTotal\
     FROM Invoice LEFT JOIN ProductType ON Invoice.productType = ProductType.code WHERE timestamp > ? group by productType',
     moment().startOf('month').unix(), function(err, row) {
      if (!err) {
        res.status(200).json(row);
      }
      else{
        console.log("======= err: " + err);
        res.status(500).json('');
      }
    });
  });


  app.get('/report/thisMonth/GetExpenseTotal', function(req, res) 
  {
    db.all('SELECT Expense.expenseType, sum(value) As total, ExpenseType.nameEn, ExpenseType.nameCn, ExpenseType.nameVn\
     FROM Expense LEFT JOIN ExpenseType ON Expense.expenseType = ExpenseType.id WHERE timestamp > ? group by expenseType',
     moment().startOf('month').unix(), function(err, row) {
      if (!err) {
        res.status(200).json(row);
      }
      else{
        console.log("======= err: " + err);
        res.status(500).json('');
      }
    });
  });


  app.get('/report/expense/typeDisplay', function(req, res) 
  {
    res.render('expense/typeDisplay.ejs', {user: req.user});
  });

  app.get('/expense/updateType/:id',  function(req, res) 
  {    
    db.get('SELECT * FROM ExpenseType WHERE id = ?', req.params.id, function(err, row) {
      if (!row) {
        res.status(500);
        return res.render('errorMsg.ejs', {message: "could not find id"});
      }
      else 
        return res.render('expense/updateType.ejs', {user: req.user, row: row});
    }); 
  });

  app.get('/expense/getExpenseType', function(req, res)
  {
    db.all('SELECT * FROM ExpenseType',  function(err, row) 
    {
      if (err) {
        console.log("getExpenseType error: " + err);
        return '';
      }

      if (!row) {
        return '';
      } else
        res.json(row);
    });
  });

  app.post('/expense/addExpenseType', function(req, res) 
  {
    if (/\S/.test(req.body.nameEn) && typeof req.body.nameEn !== 'undefined') 
    {
      db.serialize( function() 
      {
        db.run("begin transaction");
        async.waterfall([
          // check if name exist
          function(callback) {
            db.get('SELECT * from ExpenseType WHERE nameEn = ?', req.body.nameEn, function(error, row)
            {
              if(error)
                callback(error)
              else
              {
                if(row)
                  callback('Error: name exist.');
                else
                  callback(error);
              }
            });
          },
          // insert into database
          function(callback) {
            db.run('INSERT INTO ExpenseType (nameEn, nameCn, nameVn) VALUES(?, ?, ?)',
              [req.body.nameEn, req.body.nameCn, req.body.nameVn] ,function(error) 
            {
              callback(error);
            });          
          }
        ], function (err, result) {
            if(err){
              db.run("rollback");
              console.log(err);
              return res.render('errorMsg.ejs', {message: err});
            }
            else
            {
              db.run("commit");
              res.redirect('/expense/typeDisplay');
            }
        });
      }); // db serialize

    }
    else
    {
      return res.render('errorMsg.ejs', {message: 'Name is missing'});
    }
  });// post


  ///====================  update 
  app.post('/expense/updateType/:id',  function(req, res) 
  {
    if (/\S/.test(req.body.nameEn) && typeof req.body.nameEn !== 'undefined') 
    {
      db.run('UPDATE ExpenseType SET nameCn = ?, nameVn = ?, nameEn=? WHERE id = ?', 
        [req.body.nameCn, req.body.nameVn, req.body.nameEn, req.params.id], function(error) 
      {
        if (!error){
          res.redirect('/expense/typeDisplay');
        }
        else {
          console.log(error.message);
          return res.render('errorMsg.ejs', {message: "error.message"});
        }
      });       
    }
    else
      return res.render('errorMsg.ejs', {message: "Empty Type name."});
  });


  app.delete('/expense/deleteExpenseType/:id', function(req, res) 
  {
    db.run('DELETE FROM ExpenseType WHERE id = ?', req.params.id, function(error) 
    {
      if (!error) {
          res.json("success");
      } else{
        console.log(error);
        res.send(500, 'Something broke!');
      }
    }); // run              
  }); // delete



//=======================================================================================
//=================================== expense ===========================================

  app.get('/expense/getExpense', function(req, res) 
  {
    res.json(app.locals.expenseCache);
  });


  app.get('/expense/create', function(req, res) 
  {
    db.all('SELECT * FROM ExpenseType',  function(err, row) 
    {
      return res.render('expense/create.ejs', {user: req.user, type : row});
    });
  });


  app.get('/expense/display', function(req, res) 
  {
      return res.render('expense/display.ejs', {user: req.user});
  });


  ///====================  add 
  app.post('/expense/add', function(req, res) 
  {
    if (/\S/.test(req.body.newValue) && typeof req.body.newValue !== 'undefined') 
    {
      db.run("INSERT INTO Expense (date, expenseType, expenseId, value, note) VALUES(?, ?, ?, ?, ?)", 
              [req.body.date, req.body.type, req.body.expenseId, req.body.newValue, req.body.note], 
              function(error) 
              {
                if (!error) 
                {
                  app.locals.updateExpense();
                  res.redirect('/expense/display');
                }else {
                  console.log(error.message);
                  return res.render('errorMsg.ejs', { message: error.message });
                }
              });
    }
    else {
      console.log(error.message);
      return res.render('errorMsg.ejs', {  message: "Empty value for expense" });
    }
  });// post



  ///==================== get update page
  app.get('/expense/update/:id', function(req, res) 
  {
    db.get('SELECT * FROM Expense  where id = ?', req.params.id,  function(err, row) 
    {
      if(err) {
        res.status(500);
        console.log("======== error: " + err);
        return res.render('errorMsg.ejs', { message: "could not find id" });  
      }
      else {
        return res.render('expense/update.ejs', {
                 user: req.user,
                 row: row,
                 type: app.locals.expenseTypeCache
              });
      }
    });
  });


  ///====================  update 
  app.post('/expense/update/:id',  function(req, res) 
  {
    if (/\S/.test(req.body.value) && typeof req.body.value !== 'undefined') 
    {
      db.run('UPDATE Expense SET expenseType = ?, expenseId = ?, value=?, note=? WHERE id = ?', 
        [req.body.type, req.body.expenseId, req.body.value, req.body.note, req.params.id], function(error) 
      {
        if (!error){
          app.locals.updateExpense();
          res.redirect('/expense/display');
        }
        else {
          console.log(error.message);
          return res.render('errorMsg.ejs', {message: "error.message"});
        }
      });       
    }
    else
      return res.render('errorMsg.ejs', {message: "Empty value."});
  });




  ///==================== delete with id
  app.delete('/expense/delete/:id', function(req, res) {

    db.run('DELETE FROM Expense WHERE id = ?', req.params.id, function(error) {

      if (!error) {
          app.locals.updateExpense();
          res.json("success");
      } else
          res.send(500, 'Something broke!');
    }); // run              
  }); // delete


  return usersRouter;
};