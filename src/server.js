require('node-jsx').install({
  extension: '.jsx'
});


//
// --- CLI ---
//

var timestap = function(original) {
      return function(msg) {
        original('%s - %s', (new Date()).toISOString(), msg);
      };
    },
    log = timestap(console.log),
    warn = timestap(console.warn);

// console.log = console.warn = function() {};

var yargs = require('yargs')
  .wrap(process.stdout.columns)
  .usage('$0 [options]')
  .options('config', {
    alias: 'c',
    describe: 'Options provides in JSON file.'
  })
  .config('c')
  .options('username', {
    describe: 'Username.',
    alias: 'u'
  })
  .options('password_hash', {
    describe: 'Password SHA256 hash.',
    alias: 'p'
  })
  // .demand(['username', 'password_hash'])
  .describe('cookie-secret', 'Enabled signed cookie support.')
  .options('title', {
    describe: 'Name of server instance.',
    default: 'NixUI'
  })
  .options('file', {
    describe: 'nix-env -f <file> ...',
    alias: 'f',
    default: null
  })
  .options('bin_prefix', {
    describe: '<bin_prefix>/nix-env',
    default: '/run/current-system/sw/bin'
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
  .options('verbose', {
    describe: 'Display more verbose.',
    alias: 'v',
    boolean: true,
    default: false
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
    nix = require('./nix'),
    app = express();

app
  .use(webpackDevMiddleware(webpack(webpackConfig), { publicPath: '/_lib/' }));

var renderApp = function(req, res, next) {
  try {

    var content = React.renderComponentToString(
      Client({ path: url.parse(req.url).pathname })
    );

    res.send(
      '<!doctype html>' +
      '<html>' +
      ' <head>' +
      ' <title></title>' +
      ' <meta name="viewport" content="width=device-width, initial-scale=1.0" />' +
      ' </head>' +
      ' <body>' + content +
      ' <script src="/_lib/main.bundle.js"></script>' +
      ' </body>' +
      '</html>')

  } catch(err) {
    return next(err)
  }
};

app.route('/search')
  .get(renderApp)

app.route('/api/search')
  .get(function(request, response, next) {
    query = request.param('query');
    if (packageList == null) {
      fillPackageList(function(){
        response.send(searchPackageList(query));
      });
    } else {
      response.send(searchPackageList(query));
    }
  })
  .delete(function(request, response, next) {
    packageList = null;
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

var fillPackageList = function(callback) {
  nix.all_pkgs(argv.bin_prefix, argv.file,
    function(result) {
      packageList = result;
      callback(result);
    }
  );
}

var searchPackageList = function(query) {
  var items = [];
  for (var i in packageList) {
    if ((new RegExp(query, 'i')).test(packageList[i].attribute) || (new RegExp(query, 'i')).test(packageList[i].name)) {
      items.push(packageList[i]);
    }
  }
  return items;
}
