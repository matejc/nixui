require('node-jsx').install({
  extension: '.jsx'
});


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

// console.log = console.warn = function() {};

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
    React = require('react'),
    Client = require('./client'),
    url = require('url'),
    webpackDevMiddleware = require("webpack-dev-middleware"),
    webpack = require("webpack"),
    webpackConfig = require("../webpack.config"),
    NixInterface = require('./interface'),
    app = express();


app.use('/bower_components', express.static(__dirname + '/../bower_components'));
app.use(express.static(__dirname + '/public'));

app
  .use(webpackDevMiddleware(webpack(webpackConfig), { publicPath: '/_lib/' }));

// var engines = require('consolidate');
// app.engine('html', engines.hogan);

// app.get('/app', function(req, res){
//   res.render("public/client.html");
// });

var renderApp = function(req, res, next) {
  try {

    var content = React.renderComponentToString(
      Client({ path: url.parse(req.url).pathname })
    );

    res.send(
      '<!doctype html>' +
      '<html>' +
      '  <head>' +
      '    <script src="/bower_components/platform/platform.js"></script>' +
      '    <title></title>' +
      '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
      '  </head>' +
      '  <body>' + content +
      '    <script src="/_lib/client.entry.js"></script>' +
      '  </body>' +
      '</html>')

  } catch(err) {
    return next(err)
  }
};

app.route('/search')
  .get(renderApp)

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
    response.send("OK");
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
    }, function(data){
      response.send({"error": data});
    });
  })
app.route('/api/mark/install')
  .get(function (request, response, next) {
    attribute = request.param('attribute');
    setMarkFor(attribute, "install", function(attr, mark){
      response.send({"attribute": attr, "mark": mark});
    }, function(data){
      response.send({"error": data});
    });
  })
app.route('/api/mark/uninstall')
  .get(function (request, response, next) {
    attribute = request.param('attribute');
    setMarkFor(attribute, "uninstall", function(attr, mark){
      response.send({"attribute": attr, "mark": mark});
    }, function(data){
      response.send({"error": data});
    });
  });

app.route('/api/install')
  .get(function(request, response, next) {
    attribute = request.param('attribute');
    NixInterface.installPackage(attribute, argv.file, argv.nixprofile, function(data){
      response.send("OK");
    }, function(data){
      response.send({"error": data});
    });
  });

app.route('/api/uninstall')
  .get(function(request, response, next) {
    name = request.param('name');
    NixInterface.uninstallPackage(name, argv.file, argv.nixprofile, function(data){
      response.send("OK");
    }, function(data){
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
}

var searchPackageList = function(query, limit) {
  var items = [];
  for (var i in packageList) {
    if ((new RegExp(query, 'i')).test(packageList[i].attribute) || (new RegExp(query, 'i')).test(packageList[i].name)) {
      items.push(packageList[i]);
    }
  }
  return items.slice(0, limit);
}

var _mark = function(attribute, name, compare, wantToMark) {

  var foundIndex = -1;
  for (var i in markList) {
    if (markList[i].attribute == attribute) {
      foundIndex = i;
      break;
    }
  }

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
        "mark": mark
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
}

var getMarkFor = function(attribute, callback, error_callback) {
  var mark;
  for (var i in markList) {
    if (attribute == markList[i].attribute) {
      mark = markList[i].mark;
      break;
    }
  }
  callback(attribute, mark);
}
