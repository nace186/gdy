module.exports = function(app, express, passport, db, moment, async) 
{
  var usersRouter = express.Router();

  //=========================================================================
  //======================== type section ===================================

  app.get('/expense/typeDisplay', function(req, res) 
  {
    res.render('expense/typeDisplay.ejs', {user: req.user});
  });


  app.get('/expense/updateType/:id',  function(req, res) 
  {    
    db.get('SELECT * FROM ExpenseType WHERE id = ?', req.params.id, function(err, row) 
    {
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
              app.locals.updateExpenseType();
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
          app.locals.updateExpenseType();
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
      if(typeof req.query.success !== 'undefined')
        return res.render('expense/create.ejs', {user: req.user, type : row, success: true});
      else
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
    var checked = 0;
    if(req.body.paid)
      checked = 1;

    var expenseDate = moment(req.body.date, 'DD/MM/YYYY HH:mm', true);

    if (/\S/.test(req.body.newValue) && typeof req.body.newValue !== 'undefined') 
    {
      db.run("INSERT INTO Expense (date, expenseType, referenceId, value, note, paid, timestamp) VALUES(?, ?, ?, ?, ?, ?, ?)", 
              [req.body.date, req.body.type, req.body.referenceId, req.body.newValue, req.body.note, checked, moment().unix()], 
              function(error) 
              {
                if (!error) 
                {
                  app.locals.updateExpense();
                  res.redirect('/expense/create?success=true');
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
        return res.render('expense/update.ejs', { user: req.user,
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
      var checked = 0;
      if(req.body.paid)
        checked = 1;

      db.run('UPDATE Expense SET expenseType = ?, referenceId = ?, value=?, note=?, paid=? WHERE id = ?', 
        [req.body.type, req.body.referenceId, req.body.value, req.body.note, checked, req.params.id], function(error) 
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