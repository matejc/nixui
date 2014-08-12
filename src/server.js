//
// --- CLI ---
//

var yargs = require('yargs')
  .wrap(process.stdout.columns)
  .usage('$0 [options]')
  .options('profilename', {
    describe: 'Profile name.'
  })
  .options('sha256', {
    describe: 'Password sha256 hash for profile credentials.\nExample: "$ echo -n "secret" | sha256sum -"'
  })
  .demand(['profilename', 'sha256'])
  .options('title', {
    describe: 'Name of server instance.',
    default: 'NixUI'
  })
  .options('file', {
    describe: 'nix-env -f <file> ...',
    alias: 'f',
    default: null
  })
  .options('nixprofile', {
    describe: 'Default is current user profile',
    alias: 'p',
    default: null
  })
  .options('hostname', {
    describe: 'Hostname.',
    default: 'localhost'
  })
  .options('port', {
    describe: 'Port.',
    alias: 'P',
    default: 8000
  })
  .options('help', {
    describe: 'Display the usage.',
    alias: 'h'
  })

var argv = yargs.argv;

if (argv.help) {
  yargs.showHelp();
  process.exit(0);
}


//
// --- MIDDLEWARE (EXPRESS) ---
//
var express = require('express'),
    NixInterface = require('./interface'),
    app = express(),
    ejs = require('ejs'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    crypto = require('crypto'),
    cookieSession = require('cookie-session');

var profiles = [
    { id: 0, profilename: "default", sha256: null, profile: null, file: null },
    { id: 1, profilename: argv.profilename, sha256: argv.sha256, profile: argv.profile, file: argv.file },
    { id: 2, profilename: "development1", sha256: null, profile: null, file: null },
    { id: 3, profilename: "development2", sha256: null, profile: null, file: null },
    { id: 4, profilename: "development3", sha256: null, profile: null, file: null },
    { id: 5, profilename: "development4", sha256: null, profile: null, file: null },
];

function findById(id, fn) {
    for (var i = 0, len = profiles.length; i < len; i++) {
        var profile = profiles[i];
        if (profile.id === id) {
            return fn(null, profile);
        }
    }
    fn(new Error('Profile with id ' + id + ' does not exist'));
}

function findByProfilename(profilename, fn) {
    for (var i = 0, len = profiles.length; i < len; i++) {
        var profile = profiles[i];
        if (profile.profilename === profilename) {
            return fn(null, profile);
        }
    }
    return fn(null, null);
}

// Passport session setup.
//   To support persistent login sessions, Passport needs to be able to
//   serialize users into and deserialize users out of the session.  Typically,
//   this will be as simple as storing the user ID when serializing, and finding
//   the user by ID when deserializing.
passport.serializeUser(function(profile, done) {
  done(null, profile.id);
});
passport.deserializeUser(function(id, done) {
  findById(id, function (err, profile) {
    done(err, profile);
  });
});

// Simple route middleware to ensure user is authenticated.
//   Use this route middleware on any resource that needs to be protected.  If
//   the request is authenticated (typically via a persistent login session),
//   the request will proceed.  Otherwise, the user will be redirected to the
//   login page.
function ensureAuthenticated(req, res, next) {
    if (req.isAuthenticated()) { return next(); }
    res.redirect('/profiles');
}


passport.use(new LocalStrategy({
        usernameField: 'profilename',
        passwordField: 'password'
    },
    function(profilename, password, done) {
        console.log("BEJE "+profilename)
        findByProfilename(profilename, function(err, profile) {
            if (err) { return done(err); }
            if (!profile) {
                return done(null, false);
            }
            var shasum = crypto.createHash("sha256");
            shasum.update(password);
            if (profile.sha256 != shasum.digest('hex')) {  // ?
                return done(null, false);
            }
            return done(null, profile);
        });
    }
));


app.use('/bower_components', express.static(__dirname + '/../bower_components'));
app.use('/public', express.static(__dirname + '/public'));

app.engine('.html', require('ejs').__express);

app.set('views', __dirname + '/views');

// Without this you would need to
// supply the extension to res.render()
// ex: res.render('users.html').
app.set('view engine', 'html');

app.use(cookieSession({ keys: ['key1', 'key2'] }));
// Initialize Passport!  Also use passport.session() middleware, to support
// persistent login sessions (recommended).
app.use(passport.initialize());
app.use(passport.session());


app.route('/profiles')
    .get(function(request, response, next) {
        response.render('profiles', {profiles: profiles});
    })
    .post(passport.authenticate('local', { failureRedirect: '/profiles' }),
        function(req, res) {
            res.redirect('/');
        }
    );

app.route('/')
    .get(ensureAuthenticated, function(request, response, next) {
        response.render('index');
    });

app.get('/logout', function(req, res){
    req.logout();
    res.redirect('/');
});


app.route('/api/search')
  .get(ensureAuthenticated, function(request, response, next) {
    var query = request.param('query');
    var limit = 'limit' in request.param ? parseInt(request.param('limit')) : 100;
    searchPackages(query, limit, function(list){
        response.send(list);
    });
  })
  .delete(ensureAuthenticated, function(request, response, next) {
    reloadPackages(function(){
        response.send({"status": 200});
    }, function(err){
        response.send({"error": err});
    })
  });

app.route('/api/info')
  .get(ensureAuthenticated, function(request, response, next) {
    var attribute = request.param('attribute');
    NixInterface.packageInfo(attribute, argv.file, function(data){
      response.send(JSON.parse(data));
    }, function(data){
      response.send({"error": data});
    });
  });


app.route('/api/mark/set')
  .get(ensureAuthenticated, function (request, response, next) {
    var attribute = request.param('attribute');
    var mark = request.param('mark');  // install/uninstall

    getPackageByAttribute(attribute, function(pkg) {
        var result = setMark(pkg, mark);
        if (result.error)
          response.send({"error": result.error}); // NOT_FOUND, NOT_MARKED, ALREADY_MARKED
        else
          response.send(result);
    });

  });
app.route('/api/mark/toggle')
  .get(ensureAuthenticated, function (request, response, next) {
    var attribute = request.param('attribute');
    var markObj = getMarkObjByAttribute(attribute);

    getPackageByAttribute(attribute, function(pkg) {
        var result;

        if (!markObj) {
          result = setMark(pkg, (pkg.compare[0]=='=' ? 'uninstall' : 'install'));

        } else if (markObj.mark == "install") {
          removeMark(pkg.attribute);
          result = setMark(pkg, "uninstall");

        } else if (markObj.mark == "uninstall") {
          removeMark(pkg.attribute);
          result = setMark(pkg, "install");

        } else {
          result = markObj;
        }

        if (result.error)
          response.send({"error": result.error}); // NOT_FOUND, NOT_MARKED, ALREADY_MARKED
        else
          response.send(result);
    });
  });

app.route('/api/mark/get')
  .get(ensureAuthenticated, function (request, response, next) {
    var attribute = request.param('attribute');

    var result;
    if (attribute) {
      result = getMarkObjByAttribute(attribute);
      if (!result)
        result = {};
    } else {
      result = markList;
    }
    response.send(result);
  });
app.route('/api/mark/remove')
  .get(ensureAuthenticated, function (request, response, next) {
    var attribute = request.param('attribute');
    NixInterface.killNixEnvByAttribute(attribute);
    response.send({"removed": removeMark(attribute)});
  });
app.route('/api/mark/removeall')
  .get(ensureAuthenticated, function (request, response, next) {
    NixInterface.killNixEnvAll();
    markList = [];
    response.send({"removed": true});
  });
app.route('/api/mark/removefinished')
  .get(ensureAuthenticated, function (request, response, next) {
    removeMarkedByState("finish");
    response.send({"removed": true});
  });

app.route('/api/mark/apply')
  .get(ensureAuthenticated, function (request, response, next) {
    var attribute = request.param('attribute');
    var markObj = getMarkObjByAttribute(attribute);
    applyMark(markObj.attribute, markObj.name, markObj.mark);
    response.send(markObj);
  });
app.route('/api/mark/applyall')
  .get(ensureAuthenticated, function (request, response, next) {
    applyAll();
    response.send({});
  });


//
// --- ELASTICSEARCH ---
//

var elasticsearch = require('elasticsearch');

// Connect to localhost:9200 and use the default settings
var esclient = new elasticsearch.Client();

esclient.cluster.health(function (err, resp) {
    if (err) {
        console.error(err.message);
    }
});


var reloadPackages = function(finish_callback, error_callback) {

    var es_error = function (err, resp) {
        if (err) {
            console.warn("es_error: "+err);
        }
    };

    var callback = function(attribute, name, compare, out, description) {
        var shasum = crypto.createHash('sha1');
        shasum.update(attribute);
        esclient.index({
            index: 'packages',
            type: 'package',
            id: shasum.digest('hex'),
            body: {
                attribute: attribute,
                name: name,
                compare: compare,
                out: out,
                description: description
            }
        }, es_error);
    }

    NixInterface.iteratePackages(
        argv.file,
        argv.nixprofile,
        callback,
        finish_callback,
        error_callback
    );
};

var searchPackages = function(query, limit, callback) {
    var installed = false;
    var upgradable = false;

    if (query.length >= 2 && query[0] == "!") {
        if (query[1] == "i") {
            installed = true;
            query = query.substring(3);
        } else if (query[1] == "u") {
            upgradable = true;
            query = query.substring(3);
        }
    }

    var handleResponse = function (resp) {
        var items = [];
        for (var i in resp.hits.hits) {
            items.push(resp.hits.hits[i]._source);
        }
        callback(items);
    };

    if (query === "") {
        query = "*";
    }

    if (installed || upgradable) {
        esclient.search({
            index: 'packages',
            type: 'package',
            size: limit,
            body: {
                query: {
                    filtered: {
                        query: {
                            query_string: {
                                query: query,
                                fields: [ "attribute", "name", "description" ]
                            }
                        },
                        filter: {
                            regexp: {
                                compare: installed ? "=@":"[<\\>]@"
                            }
                        }
                    }
                },
            }
        }).then(handleResponse);
        return;
    }

    esclient.search({
        index: 'packages',
        type: 'package',
        size: limit,
        body: {
            query: {
                query_string: {
                    query: query,
                    fields: [ "attribute", "name", "description" ]
                }
            }
        }
    }).then(handleResponse);
};


var loadPackages = function() {
    esclient.indices.create({
      index: 'packages',
      body: {
        mappings: {
            "package": {"properties": {
                "attribute" : {"type" : "string"},
                "name" : {"type" : "string"},
                "compare" : {"type" : "string", "index" : "not_analyzed"},
                "out" : {"type" : "string", "index" : "not_analyzed"},
                "description" : {"type" : "string"}
            }}
        }
      }
    }, function (error, response) {
        if (error) {
            console.log(error);
        }

        reloadPackages(function() {
            console.log("ElasticSearch ready!")

        },function(err) {
            console.log(err);
        });
    });
};

var deletePackages = function(callback) {
    var onMappingDeleted = function(err) {
        if (err) {
            console.warn("onMappingDeleted: "+err);
        }
        callback();
    };
    var onDeleted = function(err) {
        if (err) {
            console.warn("onDeleted: "+err);
        }
        esclient.indices.deleteMapping({index: 'packages', type: 'packages'}, onMappingDeleted);
    };
    esclient.indices.delete({index: 'packages'}, onDeleted);
}

deletePackages(loadPackages);

//
// --- SERVER ---
//

var server = require('http').createServer(app);
server
    .listen(argv.port, argv.hostname, function() {
        console.log('NixUI at: http://' + argv.hostname + ':' + argv.port + '/');
    });



//
// --- LOGIC ---
//

var markList = [];

var getPackageByAttribute = function(attribute, callback) {
    var handleResponse = function (resp) {
        callback(resp.hits.hits[0]._source);
    };
    esclient.search({
        index: 'packages',
        type: 'package',
        size: 1,
        body: {
            query: {
                match: {
                    attribute: attribute,
                }
            }
        }
    }).then(handleResponse);
};
var getMarkObjByAttribute = function(attribute) {
  for (var i in markList) {
    if (markList[i].attribute == attribute) {
      return markList[i];
    }
  }
};
var setMarkObjValueByAttribute = function(attribute, key, value) {
  for (var i in markList) {
    if (markList[i].attribute == attribute) {
      markList[i][key] = value;
    }
  }
};
var _canMarkAs = function(pkg, mark) {
  var canMark = false;
  switch (pkg.compare[0]) {
  case "-":  // not installed
    canMark = mark == "install";
    break;
  case "=":
    canMark = mark == "uninstall";
    break;
  case ">":
  case "<":
    canMark = true;
    break;
  }
  return canMark;
};
var setMark = function(pkg, mark) {
  if (!pkg) {
    return {error: "NOT_FOUND"};
  }
  var markObj = getMarkObjByAttribute(pkg.attribute);
  if (!_canMarkAs(pkg, mark)) {
    return {error: "CAN_NOT_MARK"};
  }
  if (markObj) {
    setMarkObjValueByAttribute(pkg.attribute, "mark", mark);
    // markObj.mark = mark;
  } else {
    markObj = {
      "attribute": pkg.attribute,
      "name": pkg.name,
      "mark": mark,
      "state": "wait"
    };
    markList.push(markObj);
  }
  return markObj;
};
var removeMark = function(attribute) {
  for (var i in markList) {
    if (markList[i].attribute == attribute) {
      markList.splice(i, 1);
      return true;
    }
  }
  return false;
};
var removeMarkedByState = function(state) {
  for (var i=markList.length-1; i >= 0; i--) {
    if (markList[i].state == state) {
      markList.splice(i, 1);
    }
  }
};

var getNextInLineMarkObj = function() {
  for (var i in markList)
    if (markList[i].mark == "uninstall" && markList[i].state == "wait")
      return markList[i];
  for (var j in markList)
    if (markList[j].state == "wait")
      return markList[j];
};

var applyAll = function() {
  var callback = function() {
    var markObj = getNextInLineMarkObj();
    if (markObj)
      applyMark(markObj.attribute, markObj.name, markObj.mark, callback, callback);
  };
  var markObj = getNextInLineMarkObj();
  applyMark(markObj.attribute, markObj.name, markObj.mark, callback, callback);
};

var applyMark = function(attribute, name, mark, finish_callback, error_callback) {
  setMarkObjValueByAttribute(attribute, "state", "start");

  var onFinish = function(data) {
    setMarkObjValueByAttribute(attribute, "state", "finish");
    if (finish_callback)
      finish_callback(data);
  };
  var onError = function(data) {
    setMarkObjValueByAttribute(attribute, "state", "error");
    if (error_callback)
      error_callback(data);
  };

  if (mark == "install") {
    NixInterface.installPackage(attribute, argv.file, argv.profile, onFinish, onError);

  } else if (mark == "uninstall") {
    NixInterface.uninstallPackage(attribute, name, argv.file, argv.profile, onFinish, onError);
  }
};
