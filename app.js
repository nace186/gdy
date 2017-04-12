var express = require('express'), 
	i18n = require("i18n");
var session = require('express-session');
var sqlite3 = require('sqlite3').verbose();    
var passport = require('passport');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var moment = require('moment'); 
var async = require('async');

var app = express();
var db = new sqlite3.Database('mydb.db');



app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(session({secret:'somesecrettokenhere', resave: false, saveUninitialized: false}));
app.use(passport.initialize());
app.use(passport.session());

require('./config/passport')(passport, db); // pass passport for configuration


i18n.configure({
  // setup some locales - other locales default to en silently
  locales: ['en', 'vn', 'cn'],
  // where to store json files - defaults to './locales'
  directory: __dirname + '/locales',
  queryParameter: 'lang',
  // setting of log level DEBUG - default to require('debug')('i18n:debug')
  logDebugFn: function (msg) {
    console.log('debug', msg);
  },
  // setting of log level WARN - default to require('debug')('i18n:warn')
  logWarnFn: function (msg) {
    console.log('warn', msg);
  },
  // setting of log level ERROR - default to require('debug')('i18n:error')
  logErrorFn: function (msg) {
    console.log('error', msg);
  }
});
 


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));



// i18n init parses req for language headers, cookies, etc.
app.use(i18n.init);


// apply language for all calls
app.get('*', function(req, res, next) 
{
  if (req.query.lang)
  {
      if(req.query.lang != req.session.locale) 
      {
        req.session.locale = req.query.lang;

        //todo update user language preference
        if(req.session && req.user){
          db.run('UPDATE User SET lang = ?  WHERE uid = ?', [req.query.lang, req.user.uid], function(error) {
            if (!error){
                req.login(req.user, function(err) {
                    if (err) return next(err)

                })
            }
            else
              console.log(" === error saving user lang preference;");
          });
        }
      }
  }

  i18n.setLocale(req, req.session.locale);

  if(req.url === '/login') return next();

  if (req.isAuthenticated())
    return next();

  // if they aren't redirect them to the home page
  res.redirect('/login');
  //return next();  
});


// ================== cache database data

app.locals.updateManufacturer = function() 
{
	db.all('SELECT * FROM Manufacturer',  function(err, row) 
  { 
    app.locals.manufacturerCache = row;
  });
};


app.locals.updateType = function() 
{
	db.all('SELECT * FROM ProductType',  function(err, row) 
  {
    app.locals.typeCache = row;
  });


   db.all('SELECT Orders.*, OrderType.*, Customers.name As customerName, Products.name AS productName FROM Orders LEFT JOIN OrderType ON Orders.type = OrderType.id\
              LEFT JOIN Customers ON Orders.customerId = Customers.id \
              LEFT JOIN Products ON Orders.productId = Products.id WHERE orderId = ?',  '1490082534862.0',   function(err, row) 
      {
        if(err)
          console.log("====== error: " + err);

    //    console.log(" stirng: "+ JSON.stringify(row) );
     //   console.log(" length: " + row.length);
      });
};


app.locals.updateProduct = function() 
{
	db.all('SELECT Manufacturer.name AS manuName, Manufacturer.code AS manuCode,\
          Products.name AS productName, Products.code AS productCode, Products.id AS productId,\
          ProductType.code AS typeCode, * FROM Products\
          LEFT JOIN Manufacturer ON Products.manufacturer = Manufacturer.code\
          LEFT JOIN ProductType ON Products.type = ProductType.code',   function(err, row) 
  {
    if(err)
    {
      console.log("======== error: "+ err);
    }
    else {
      app.locals.productsCache = row;
    }
  });
};


app.locals.updateCustomer  = function() 
{
  db.all('SELECT * FROM Customers',   function(err, row) 
  {
    app.locals.customersCache = row;
  });
};

app.locals.updateTransaction  = function() 
{
  db.all('SELECT Transact.*, Customers.name, State.nameVn, State.nameCn, State.nameEn FROM Transact LEFT JOIN \
          Customers ON Transact.customerId = Customers.id LEFT JOIN \
          State ON Transact.transactionType = State.id',   function(err, row) 
  {

    if(err)
      console.log("============== error: " + err);

    app.locals.transactionCache = row;
  });
};

app.locals.updateState  = function() 
{
  db.all('SELECT * FROM State',   function(err, row) 
  {
    app.locals.stateCache = row;
  });
};

app.locals.updateOrderType  = function() 
{
  db.all('SELECT * FROM OrderType',   function(err, row) 
  {
    app.locals.orderTypeCache = row;
  });
};

app.locals.updateOrder  = function() 
{
  db.all('SELECT * FROM Orders LEFT JOIN OrderType ON Orders.type = OrderType.id GROUP BY orderId',   function(err, row) 
  {
    if(err)
      console.log("============== error: " + err);

    app.locals.orderCache = row;
  });
};

app.locals.updateExpenseType  = function() 
{
  db.all('SELECT * FROM ExpenseType',   function(err, row) 
  {
    app.locals.expenseTypeCache = row;
  });
};

app.locals.updateExpense  = function() 
{
  db.all('SELECT Expense.*, ExpenseType.nameEn, ExpenseType.nameCn, ExpenseType.nameVn FROM Expense\
   LEFT JOIN ExpenseType ON Expense.expenseType = ExpenseType.id',   function(err, row) 
  {
    if(err)
      console.log("============== error: " + err);

    app.locals.expenseCache = row;
  });
};

app.locals.updateInvoiceCreate  = function() 
{
  //'SELECT * FROM invoice where state = 1 GROUP BY invoiceId'
  // SELECT Invoice.*, Customers.name FROM Invoice LEFT JOIN Customers ON Invoice.customerId = Customers.id WHERE state = 1 GROUP BY invoiceId
  db.all('SELECT Invoice.*, Customers.name FROM Invoice\
   LEFT JOIN Customers ON Invoice.customerId = Customers.id WHERE state = 1 GROUP BY invoiceId',   function(err, row) 
  {
     if(err)
      console.log("============== error: " + err);
    app.locals.invoiceCreateCache = row;
  });
};


app.locals.updateInvoiceSold  = function() 
{
  db.all('SELECT Invoice.*, Customers.name FROM Invoice\
   LEFT JOIN Customers ON Invoice.customerId = Customers.id WHERE state = 2 GROUP BY invoiceId',   function(err, row) 
  {
     if(err)
      console.log("============== error: " + err);
    app.locals.invoiceSoldCache = row;
  });


 var startOfMonth = moment().startOf('month').unix();
 console.log(" start of month: " + startOfMonth);

 var invoiceDate = moment('28/02/2017 11:11', 'DD/MM/YYYY HH:mm', true);

 console.log(" unix: " + invoiceDate.unix());
 console.log(" test: " + moment('28/03/2017 11:11', 'DD/MM/YYYY HH:mm', true).unix());


//SELECT  ProductType.*, sum(total) as value, (sum(Invoice.hmc) + sum(Invoice.longAn)) AS totalSold,
  //   (Select (sum(hmc) + sum(longAn)) from Invoice) allTotal
    // FROM Invoice LEFT JOIN Products ON Invoice.productId = Products.id
    // LEFT JOIN ProductType ON Invoice.productType = ProductType.code  WHERE timestamp > 1488255060 group by productType

  db.all('SELECT ProductType.*, sum(total) as value, (sum(Invoice.hmc) + sum(Invoice.longAn)) AS totalSold,\
     (Select (sum(hmc) + sum(longAn)) from Invoice) allTotal\
     FROM Invoice LEFT JOIN ProductType ON Invoice.productType = ProductType.code WHERE timestamp > ? group by productType',
      function(err, row) {
      if (!err) {
        if (row) {
          console.log(" no row: ");
          console.log(" sum: " + JSON.stringify(row));
        }
      }
      else
        console.log("error: "+err);
    });


};


app.locals.updateManufacturer();
app.locals.updateType();
app.locals.updateProduct();
app.locals.updateCustomer();
app.locals.updateTransaction();
app.locals.updateState();
app.locals.updateOrder();
app.locals.updateOrderType();
app.locals.updateInvoiceCreate();
app.locals.updateInvoiceSold();
app.locals.updateExpense();
app.locals.updateExpenseType();

var indexRoute = require('./routes/index')(app, express, passport);
app.use('/', indexRoute);

var loginRoute = require('./routes/login')(app, express, passport,i18n);
app.use('/login', loginRoute);

var manuRoute = require('./routes/admin/updateManu')(app, express, passport, db, moment);
app.use('/man/*', manuRoute);

var TypeRoute = require('./routes/admin/updateType')(app, express, passport, db, moment);
app.use('/type/*', TypeRoute);

var productRoute = require('./routes/admin/updateProduct')(app, express, passport, db, moment);
app.use('/product/*', productRoute);

var customerRoute = require('./routes/admin/updateCustomer')(app, express, passport, db, moment);
app.use('/customer/*', customerRoute);

var invoiceRoute = require('./routes/invoice/invoice')(app, express, passport, db, moment, async);
app.use('/invoice/*', invoiceRoute);

var transactionRoute = require('./routes/transaction/transaction')(app, express, passport, db, moment);
app.use('/transaction/*', transactionRoute);

var orderRoute = require('./routes/order')(app, express, passport, db, moment, async);
app.use('/order/*', orderRoute);

var expenseRoute = require('./routes/expense')(app, express, passport, db, moment, async);
app.use('/expense/*', expenseRoute);

var reportRoute = require('./routes/report')(app, express, passport, db, moment, async);
app.use('/report/*', reportRoute);



// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
}

// production error handler
// no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


module.exports = app;
