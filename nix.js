
var spawn = require('child_process').spawn;
var console = require('console');

var nix_env = function(bin_prefix, args, callback) {
  var nixenv = spawn(
      bin_prefix + '/nix-env', args, process.env);

  var storage = '';

  nixenv.stdout.on('data', function (data) {
    storage = storage + data
  });

  nixenv.stderr.on('data', function (data) {
    console.error('stderr: ' + data);
  });

  nixenv.on('close', function (code) {
    callback(storage);
  });
};

exports.all_pkgs = function(bin_prefix, file_arg, callback) {
  var process = function(data) {
    items = [];
    lines = (''+data).split('\n');
    for (var n in lines) {
      arr = /([\w\.\-]+)\s+([\w\.\-]+)/.exec(lines[n]);
      if (arr == null) {
        continue;
      }
      items.push({attribute: arr[1], name: arr[2]});
    }
    callback(items);
  };
  var args = ['-qaP'];
  if (file_arg !== null) {
    args.unshift('-f', file_arg);
  }
  nix_env(bin_prefix, args, process);
};
