
var spawn = require('child_process').spawn;
var console = require('console');


var nix_env = function(args, callback) {
    var env = {
        NIX_PATH: "nixpkgs=/home/matej/workarea/nixpkgs:nixos=/home/matej/workarea/nixpkgs/nixos",
        HOME: "/home/matej",
        NIX_STATE_DIR: "/nix/var/nix",
        NIX_REMOTE: "daemon"
    }
    var nixenv = spawn('/run/current-system/sw/bin/nix-env', args, env);

    var storage = '';

    nixenv.stdout.on('data', function (data) {
        storage = storage + data
    });

    nixenv.stderr.on('data', function (data) {
        console.log('stderr: ' + data);
    });

    nixenv.on('close', function (code) {
        callback(storage);
    });
};

exports.search = function(query, callback) {
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
        callback(results);
    };
    nix_env(['-qaP'], process);
};
