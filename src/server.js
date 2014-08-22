
var yargs = require('yargs')
  .wrap(process.stdout.columns)
  .usage('$0 [options]')
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

var loopback = require('loopback'),
    NixInterface = require('./interface'),
    boot = require('loopback-boot'),
    crypto = require('crypto');

var app = module.exports = loopback();

app.use(loopback.cookieParser("REPLACEME"));
app.use(loopback.json());
app.use(loopback.urlencoded({extended: true}));
app.use(loopback.token({
  cookies: ['access_token'],
  params: ['access_token']
}));


// request pre-processing middleware
app.use(loopback.compress());

// logging pre-processing middleware
app.use(loopback.logger('dev'));

// -- Add your pre-processing middleware here --

// boot scripts mount components like REST API
boot(app, __dirname);


// -- Mount static files here--
// All static middleware should be registered at the end, as all requests
// passing the static middleware are hitting the file system
app.use('/bower_components', loopback.static(__dirname + '/../bower_components'));
app.use(loopback.static(__dirname + '/public'));

// Requests that get this far won't be handled
// by any middleware. Convert them into a 404 error
// that will be handled later down the chain.
app.use(loopback.urlNotFound());

// The ultimate error handler.
app.use(loopback.errorHandler());




app.start = function() {
  // start the web server
  return app.listen(function() {
    app.emit('started');
    console.log('Web server listening at: %s', app.get('url'));
  });
};

// start the server if `$ node server.js`
if (require.main === module) {
  app.start();
}
