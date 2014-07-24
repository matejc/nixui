//
// --- CLI ---
//

// var timestap = function(original) {
//       return function(msg) {
//         original('%s - %s', (new Date()).toISOString(), msg);
//       };
//     },
//     log = timestap(console.log),
//     warn = timestap(console.warn);

// console.log = console.warn = function()

var yargs = require('yargs')
  .wrap(process.stdout.columns)
  .usage('$0 [options]')
  // .demand(['username', 'password_hash'])
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

if (argv.verbose) {
  console.log = log;
  console.warn = warn;
}


//
// --- MIDDLEWARE (EXPRESS) ---
//
var express = require('express'),
    url = require('url'),
    NixInterface = require('./interface'),
    app = express();


app.use('/bower_components', express.static(__dirname + '/../bower_components'));
app.use(express.static(__dirname + '/public'));

app.route('/api/search')
  .get(function(request, response, next) {
    var query = request.param('query');
    var limit = 'limit' in request.param ? parseInt(request.param('limit')) : 100;
    if (packageList == null) {
      fillPackageList(function(){
        response.send(searchPackageList(query, limit));
      }, function(data){
        response.send({"error": data});
      });
    } else {
      response.send(searchPackageList(query, limit));
    }
  })
  .delete(function(request, response, next) {
    packageList = null;
    response.send({"state": 200});
  });

app.route('/api/info')
  .get(function(request, response, next) {
    attribute = request.param('attribute');
    NixInterface.packageInfo(attribute, function(data){
      response.send(JSON.parse(data));
    }, function(data){
      response.send({"error": data});
    });
  });

// app.route('/api/mark')
//   .get(function (request, response, next) {
//     attribute = request.param('attribute');
//     getMarkFor(attribute, function(attr, mark, progress){
//       response.send({"attribute": attr, "mark": mark, "progress": progress});
//     });
//   });
//
// app.route('/api/mark/delete')
//   .get(function (request, response, next) {
//     attribute = request.param('attribute');
//     delMarkFor(attribute, function(attr, removed){
//       response.send({"attribute": attr, "removed": removed});
//     });
//   });
//
// app.route('/api/mark/list')
//   .get(function (request, response, next) {
//     response.send(markList);
//   })
//   .delete(function(request, response, next) {
//     markList = [];
//     response.send({"state": 200});
//   });
//
// app.route('/api/mark/install')
//   .get(function (request, response, next) {
//     attribute = request.param('attribute');
//     setMarkFor(attribute, "install", function(attr, mark){
//       response.send({"attribute": attr, "mark": mark});
//     }, function(data){
//       response.send({"error": data});
//     });
//   });
//
// app.route('/api/mark/uninstall')
//   .get(function (request, response, next) {
//     attribute = request.param('attribute');
//     setMarkFor(attribute, "uninstall", function(attr, mark){
//       response.send({"attribute": attr, "mark": mark});
//     }, function(data){
//       response.send({"error": data});
//     });
//   });
//
// app.route('/api/mark/apply')
//   .get(function(request, response, next) {
//     attribute = request.param('attribute');
//     applyMarked(
//       attribute,
//       function(data){  // finish
//         response.send({"attribute": data});
//       }, function(data){  // error
//         response.send({"error": data});
//       });
//   });

app.route('/api/mark/set')
  .get(function (request, response, next) {
    var attribute = request.param('attribute');
    var mark = request.param('mark');  // install/uninstall

    var result = setMark(attribute, mark);
    if (result.error)
      response.send({"error": result.error}); // NOT_FOUND, NOT_MARKED, ALREADY_MARKED
    else
      response.send(result);
  });
app.route('/api/mark/toggle')
  .get(function (request, response, next) {
    var attribute = request.param('attribute');
    var markObj = getMarkObjByAttribute(attribute);
    var result;

    if (!markObj) {
      var pkg = getPackageByAttribute(attribute);
      result = setMark(attribute, (pkg.compare[0]=='=' ? 'uninstall' : 'install'));

    } else if (markObj.mark == "install") {
      removeMark(attribute);
      result = setMark(attribute, "uninstall");

    } else if (markObj.mark == "uninstall") {
      removeMark(attribute);
      result = setMark(attribute, "install");

    } else {
      result = markObj;
    }

    if (result.error)
      response.send({"error": result.error}); // NOT_FOUND, NOT_MARKED, ALREADY_MARKED
    else
      response.send(result);
  });

app.route('/api/mark/get')
  .get(function (request, response, next) {
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
  .get(function (request, response, next) {
    var attribute = request.param('attribute');
    NixInterface.killNixEnvByAttribute(attribute);
    response.send({"removed": removeMark(attribute)});
  });
app.route('/api/mark/removeall')
  .get(function (request, response, next) {
    NixInterface.killNixEnvAll();
    markList = [];
    response.send({"removed": true});
  });
app.route('/api/mark/removefinished')
  .get(function (request, response, next) {
    removeMarkedByState("finish");
    response.send({"removed": true});
  });

app.route('/api/mark/apply')
  .get(function (request, response, next) {
    var attribute = request.param('attribute');
    var markObj = getMarkObjByAttribute(attribute);
    applyMark(markObj.attribute, markObj.name, markObj.mark);
    response.send(markObj);
  });
app.route('/api/mark/applyall')
  .get(function (request, response, next) {
    applyAll();
    response.send({});
  });



//
// --- SERVER ---
//

var server = require('http').createServer(app);
server
  .listen(argv.port, argv.hostname, function() {
    console.log('NixUI at: http://' + argv.hostname + ':' + argv.port);
  });


//
// --- LOGIC ---
//

var packageList = null;

var fillPackageList = function(callback, error_callback) {
  var catchResult = function(result) {
    packageList = result;
    callback(result);
  };
  var catchError = function(data) {
    error_callback(data);
  };
  NixInterface.allPackages(argv.file, argv.nixprofile, catchResult, catchError);
};

var searchPackageList = function(query, limit) {
  var installed = false;
  var upgradeable = false;

  if (query.length >= 2 && query[0] == "!") {
    if (query[1] == "i") {
      installed = true;
      query = query.substring(3);
    } else if (query[1] == "u") {
      upgradeable = true;
      query = query.substring(3);
    }
  }

  var items = [];
  for (var i in packageList) {
    if ( ((new RegExp(query, 'i')).test(packageList[i].attribute) || (new RegExp(query, 'i')).test(packageList[i].name)) &&
      ((installed && packageList[i].compare[0] == "=") ||
       (upgradeable && ((packageList[i].compare[0] == ">") || packageList[i].compare[0] == "<")) ||
       !installed && !upgradeable) ) {
      items.push(packageList[i]);
    }
  }
  return items.slice(0, limit);
};


var markList = [];

var getPackageByAttribute = function(attribute) {
  var pkg;
  for (var i in packageList) {
    if (packageList[i].attribute == attribute) {
      pkg = packageList[i];
      break;
    }
  }
  return pkg;
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
var setMark = function(attribute, mark) {
  var pkg = getPackageByAttribute(attribute);
  if (!pkg) {
    return {error: "NOT_FOUND"};
  }
  var markObj = getMarkObjByAttribute(attribute);
  if (!_canMarkAs(pkg, mark)) {
    return {error: "CAN_NOT_MARK"};
  }
  if (markObj) {
    setMarkObjValueByAttribute(attribute, "mark", mark);
    // markObj.mark = mark;
  } else {
    markObj = {
      "attribute": pkg.attribute,
      "name": pkg.name,
      "mark": mark,
      "state": "wait"
    }
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
  for (var i in markList)
    if (markList[i].state == "wait")
      return markList[i];
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
