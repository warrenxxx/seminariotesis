//  OpenShift sample Node application
var express = require('express'),
    app     = express(),
    morgan  = require('morgan');
var bodyParser = require('body-parser')
Object.assign=require('object-assign')

app.engine('html', require('ejs').renderFile);
app.use(morgan('combined'))
app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())
var port = process.env.PORT || process.env.OPENSHIFT_NODEJS_PORT || 8080,
    ip   = process.env.IP   || process.env.OPENSHIFT_NODEJS_IP || '0.0.0.0',
    mongoURL = process.env.OPENSHIFT_MONGODB_DB_URL || process.env.MONGO_URL,
    mongoURLLabel = "";

if (mongoURL == null) {
  var mongoHost, mongoPort, mongoDatabase, mongoPassword, mongoUser;
  // If using plane old env vars via service discovery
  if (process.env.DATABASE_SERVICE_NAME) {
    var mongoServiceName = process.env.DATABASE_SERVICE_NAME.toUpperCase();
    mongoHost = process.env[mongoServiceName + '_SERVICE_HOST'];
    mongoPort = process.env[mongoServiceName + '_SERVICE_PORT'];
    mongoDatabase = process.env[mongoServiceName + '_DATABASE'];
    mongoPassword = process.env[mongoServiceName + '_PASSWORD'];
    mongoUser = process.env[mongoServiceName + '_USER'];

  // If using env vars from secret from service binding
  } else if (process.env.database_name) {
    mongoDatabase = process.env.database_name;
    mongoPassword = process.env.password;
    mongoUser = process.env.username;
    var mongoUriParts = process.env.uri && process.env.uri.split("//");
    if (mongoUriParts.length == 2) {
      mongoUriParts = mongoUriParts[1].split(":");
      if (mongoUriParts && mongoUriParts.length == 2) {
        mongoHost = mongoUriParts[0];
        mongoPort = mongoUriParts[1];
      }
    }
  }

  if (mongoHost && mongoPort && mongoDatabase) {
    mongoURLLabel = mongoURL = 'mongodb://';
    if (mongoUser && mongoPassword) {
      mongoURL += mongoUser + ':' + mongoPassword + '@';
    }
    // Provide UI label that excludes user id and pw
    mongoURLLabel += mongoHost + ':' + mongoPort + '/' + mongoDatabase;
    mongoURL += mongoHost + ':' +  mongoPort + '/' + mongoDatabase;
  }
}
var db = null,
    dbDetails = new Object();

// mongoURL="mongodb://warren:warren@cluster0-shard-00-00-pvnfj.mongodb.net:27017,cluster0-shard-00-01-pvnfj.mongodb.net:27017,cluster0-shard-00-02-pvnfj.mongodb.net:27017/tesis?ssl=true&replicaSet=Cluster0-shard-0&authSource=admin&retryWrites=true";
mongoURL="mongodb://localhost:27017/tesis"
var initDb = function(callback) {
  if (mongoURL == null) return;

  var mongodb = require('mongodb');
  if (mongodb == null) return;

  mongodb.connect(mongoURL, function(err, conn) {
    if (err) {
      callback(err);
      return;
    }

    db = conn;
    dbDetails.databaseName = db.databaseName;
    dbDetails.url = mongoURLLabel;
    dbDetails.type = 'MongoDB';

    console.log('Connected to MongoDB at: %s', mongoURL);
  });
};
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.get('/registrar/:codigo/:tesis', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    var col = db.collection('tesis');

    col.findOne({cod:req.params.codigo},function (err, data) {
        if(data) {
            col.findOne({tesis:req.params.tesis},function (errr,data) {
                if(data)
                    res.status(404).send("La tesis ya fue registrada")
                else {
                    console.log(data)
                    col.updateOne({cod:req.params.codigo},{$set:    {tesis:req.params.tesis}},function (err, data) {
                        if(err)throw err;
                        res.send({res:"oks"})
                    })
                }
            })
        }
        else res.status(404).send("No existe el user")
    });
  }

});
app.post('/formulario/:codigo',function (req, res) {
    if (!db) {
        initDb(function(err){});
    }
    if (db) {

        var body=req.body;
        var col = db.collection('tesis');
        col.findOne({cod:req.params.codigo},function (err,data) {
            if(data)
                col.updateOne({cod:req.params.codigo},{$push:{form:body}},function (err, data) {
                    if (err)throw err;
                    res.send({res:"oks"})
                })
            else res.status(404).send("No existe el user")
        })

    }
});
app.post('/calificar/:codigo',function (req, res) {
    if (!db) {
        initDb(function(err){});
    }
    if (db) {

        var body=req.body;
        var col = db.collection('tesis');
        col.findOne({cod:req.params.codigo},function (err,data) {
            if(data)
                col.updateOne({cod:req.params.codigo},{$set:{calificacion:body}},function (err, data) {
                    if (err)throw err;
                    res.send({res:"oks"})
                })
            else res.status(404).send("No existe el user")
        })

    }
});
app.get('/asignarrevisor/:revisor/:codigo',function (req, res) {
    if (!db) {
        initDb(function(err){});
    }
    if (db) {

        var col = db.collection('tesis');

        col.findOne({cod:req.params.codigo},function (err,data) {
            if(data)
                col.updateOne({cod:req.params.codigo},{$set:{revisor:req.params.revisor}},function (err, data) {
                    if (err)throw err;
                    res.send({res:"oks"})
                });
            else res.status(404).send("No existe el user")
        })

    }
});

app.get('/registrados', function (req, res) {
    // try to initialize the db on every request if it's not already
    // initialized.
    if (!db) {
        initDb(function(err){});
    }
    if (db) {
        var col = db.collection('tesis');

        col.find({}).toArray(function (err, data)    {
            ress=[]
            for(let x  of data){
                if(x["tesis"]){
                    console.log(x)
                    ress.push(x["tesis"])
                }
            }
            res.send(ress)
        });
    }

});
app.get('/all', function (req, res) {
    // try to initialize the db on every request if it's not already
    // initialized.
    if (!db) {
        initDb(function(err){});
    }
    if (db) {
        var col = db.collection('tesis');

        col.find({}).toArray(function (err, data)    {
            res.send(data)
        });
    }

});
app.get('/usadas', function (req, res) {
  // try to initialize the db on every request if it's not already
  // initialized.
  if (!db) {
    initDb(function(err){});
  }
  if (db) {
    db.collection('counts').count(function(err, count ){
      res.send('{ pageCount: ' + count + '}');
    });
  } else {
    res.send('{ pageCount: -1 }');
  }
});

// error handling
app.use(function(err, req, res, next){
  console.error(err.stack);
  res.status(500).send('Something bad happened!');
});

initDb(function(err){
  console.log('Error connecting to Mongo. Message:\n'+err);
});

app.listen(port, ip);
console.log('Server running on http://%s:%s', ip, port);

module.exports = app ;
