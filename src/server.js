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

app.route('/api/mark')
  .get(function (request, response, next) {
    attribute = request.param('attribute');
    getMarkFor(attribute, function(attr, mark){
      response.send({"attribute": attr, "mark": mark});
    });
  });

app.route('/api/mark/delete')
  .get(function (request, response, next) {
    attribute = request.param('attribute');
    delMarkFor(attribute, function(attr, removed){
      response.send({"attribute": attr, "removed": removed});
    });
  });

app.route('/api/mark/list')
  .get(function (request, response, next) {
    response.send(markList);
  })
  .delete(function(request, response, next) {
    markList = [];
    response.send({"state": 200});
  });

app.route('/api/mark/install')
  .get(function (request, response, next) {
    attribute = request.param('attribute');
    setMarkFor(attribute, "install", function(attr, mark){
      response.send({"attribute": attr, "mark": mark});
    }, function(data){
      response.send({"error": data});
    });
  });

app.route('/api/mark/uninstall')
  .get(function (request, response, next) {
    attribute = request.param('attribute');
    setMarkFor(attribute, "uninstall", function(attr, mark){
      response.send({"attribute": attr, "mark": mark});
    }, function(data){
      response.send({"error": data});
    });
  });

app.route('/api/mark/apply')
  .get(function(request, response, next) {
    attribute = request.param('attribute');
    applyMarked(
      attribute,
      function(data){  // finish
        response.send({"attribute": data});
      }, function(data){  // error
        response.send({"error": data});
      });
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
var markList = [];

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

var getMarkObj = function(attribute) {
  if (attribute)
    for (var i in markList)
      if (attribute == markList[i].attribute)
        return {markIndex: i, markObj: markList[i]};
  return {markIndex: -1, markObj: null};
};

var _mark = function(attribute, name, compare, wantToMark) {

  var foundIndex = getMarkObj(attribute).markIndex;

  var mark = null;

  if (foundIndex == -1) {  // not marked

  // (not marked and not installed and want to install) OR (not marked and installed and want to uninstall)
    if ((compare[0] == "-" && wantToMark == "install") || (compare[0] != "-" && wantToMark == "uninstall")) {
      // add
      mark = wantToMark;
      markList.push({
        "attribute": attribute,
        "name": name,
        "compare": compare,
        "mark": mark,
        "progress": "wait"
      });

    } else if (compare[0] == "-" && wantToMark == "uninstall") {
      mark = "installed";

    } else if (compare[0] != "-" && wantToMark == "install") {
      mark = "available";
    }

    return {attribute: attribute, mark: mark};
  } else if (compare[0] == "-") {  // marked and not installed

    if (wantToMark == "install") {
      // mark for install
      mark = wantToMark;
      markList[foundIndex].mark = mark;

    } else if (wantToMark == "uninstall") {
      // pkg is not installed
      mark = "available";
      markList.splice(foundIndex, 1);
    }

  } else {  // marked and installed

    if (wantToMark == "install") {
      // pkg is installed
      mark = "installed";
      markList.splice(foundIndex, 1);

    } else if (wantToMark == "uninstall") {
      // mark for uninstall
      mark = wantToMark;
      markList[foundIndex].mark = mark;
    }

  }

  return {attribute: attribute, mark: mark};
};

var setMarkFor = function(attribute, mark, callback, error_callback) {
  var result;
  for (var i in packageList) {
    if (attribute == packageList[i].attribute) {
      result = _mark(
        packageList[i].attribute,
        packageList[i].name,
        packageList[i].compare,
        mark
      )
      break;
    }
  }
  if (result)
    callback(result.attribute, result.mark);
  else
    error_callback("Problem with "+attribute+" (might not exist)!");
};

var getMarkFor = function(attribute, callback) {
  var o = getMarkObj(attribute);
  if (o.markObj)
    callback(o.markObj.attribute, o.markObj.mark);
  else
    callback(attribute, null);
};

var delMarkFor = function(attribute, callback) {
  var o = getMarkObj(attribute);
  if (o.markObj) {
    markList.splice(o.markIndex, 1);
    callback(attribute, true);
  } else {
    callback(attribute, false);
  }
};

var _apply = function(markObj, finish_callback, error_callback) {
  markObj.progress = "start";

  var onFinish = function(data) {
    markObj.progress = "finish";
    finish_callback(markObj.attribute);
  };
  var onError = function(data) {
    markObj.progress = "error";
    error_callback(markObj.attribute, data);
  };

  if (markObj.mark == "install") {
    NixInterface.installPackage(markObj.attribute, argv.file, argv.profile, onFinish, onError);

  } else if (markObj.mark == "uninstall") {
    NixInterface.uninstallPackage(markObj.name, argv.file, argv.profile, onFinish, onError);
  }

};

var getNextInLineMarkObj = function() {
  for (var i in markList)
    if (markList[i].mark == "uninstall" && markList[i].progress == "wait")
      return {markIndex: i, markObj: markList[i]};
  for (var i in markList)
    if (markList[i].progress == "wait")
      return {markIndex: i, markObj: markList[i]};
  return {markIndex: -1, markObj: null};
};

var applyMarked = function(attribute, finish_callback, error_callback) {

  if (attribute) {
    var o = getMarkObj(attribute);
    _apply(o.markObj, finish_callback, error_callback);

  } else {
    // apply all
    var stderr = "";

    var markObj = getNextInLineMarkObj().markObj;
    function f(o) {
      if (o) {
        _apply(
          o,
          function (data) {  // exit 0
            f(getNextInLineMarkObj().markObj);
          },
          function (data) {  // error
            stderr += data;
            f(getNextInLineMarkObj().markObj);
          });
      } else {
        if (stderr)
          error_callback(stderr);
        else
          finish_callback();
      }
    }
    f(markObj);

  }

};
