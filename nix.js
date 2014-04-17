
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

exports.search = function(bin_prefix, query, file_arg, callback) {
    var process = function(data) {
        results = [];
        lines = (''+data).split('\n');
        for (i=0; i<lines.length; i++) {
            if (false == (new RegExp(query, 'i')).test(lines[i])) {
                continue;
            };
            arr = /([\w\.\-]+)\s+([\w\.\-]+)/g.exec(lines[i]);
            if (arr == null) {
                continue;
            };
            results.push([arr[1], arr[2]]);
        };
        callback(query, results);
    };
    var args = ['-qaP'];
    if (file_arg !== null) {
        args.unshift('-f', file_arg);
    }
    nix_env(bin_prefix, args, process);
};
