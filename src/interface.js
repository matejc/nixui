var spawn = require('child_process').spawn;
var fs = require('fs');
var path = require('path');

var nixEnvProcesses = [];

exports.nixEnv = function(args, env, callback, error_callback) {
  var output = "";
  var outerr = "";

  var options = { env: (env?env:process.env) };

  var nixProcess = spawn('nix-env', args, options);
  var nixEnvProcessesItem = {process: nixProcess};
  nixEnvProcesses.push(nixEnvProcessesItem);

  console.log("nix-env: " + args);

  nixProcess.stdout.on("data", function(data) {
    output += data;
  });

  nixProcess.stderr.on("data", function(data) {
    console.error("nix-env: " + data);
    outerr += data;
  });

  nixProcess.on("close", function(code) {
    for (var i in nixEnvProcesses) {
      if (nixProcess === nixEnvProcesses[i].process) {
        nixEnvProcesses.splice(i, 1);
        break;
      }
    }
    if(code === 0) {
      callback(output.substring(0, output.length - 1));
    } else {
      error_callback(outerr+"\nnix-env exited with status: " + code);
    }
  }.bind(nixProcess));

  return nixEnvProcessesItem;
};

exports.nixInstantiate = function (prefix_args, expression, removeQuotations, useStdin, env, callback, error_callback) {
  var output = "";
  var outerr = "";

  var args = exports.createArgsArray(prefix_args, null, null, useStdin?["-"]:[]);

  var options = { env: (env?env:process.env) };

  var nixProcess = spawn("nix-instantiate", args, options);

  if (useStdin) {
    nixProcess.stdin.write(expression);
    nixProcess.stdin.end();
    console.log("nix-instantiate: " + args + "\n" + expression);
  } else {
    console.log("nix-instantiate: " + args);
  }

  nixProcess.stdout.on("data", function(data) {
    output += data;
  });

  nixProcess.stderr.on("data", function(data) {
    console.error("nix-instantiate: " + data);
    outerr += data;
  });

  nixProcess.on("close", function(code) {
    if(code === 0) {
      if (removeQuotations) {
        callback(output.substring(1, output.length - 2));
      } else {
        // callback(output.substring(0, output.length - 1));  // why?
        callback(output);
      }
    } else
      error_callback(outerr+"\nnix-instantiate exited with status: " + code);
  });
};

exports.nixBuild = function(args, env, callback, error_callback) {
  var output = "";
  var outerr = "";

  var options = { env: (env?env:process.env) };

  var nixProcess = spawn('nix-build', args, options);

  console.log("nix-build: " + args);

  nixProcess.stdout.on("data", function(data) {
    output += data;
  });

  nixProcess.stderr.on("data", function(data) {
    console.error("nix-build: " + data);
    outerr += data;
  });

  nixProcess.on("close", function(code) {
    if(code === 0) {
      callback(output.substring(0, output.length - 1));
    } else {
      error_callback(outerr+"\nnix-build exited with status: " + code);
    }
  }.bind(nixProcess));
};

exports.createArgsArray = function(prefix_args, file_arg, profile_arg, postfix_args) {
  var args = [];

  args.push.apply(args, prefix_args);

  if (file_arg) {
    args.push('-f', file_arg);
  }

  if (profile_arg) {
    if (profile_arg === 'current') {
      args.push('-p', '~/.nix-profile');
    } else {
      args.push('-p', profile_arg);
    }
  }

  args.push.apply(args, postfix_args);

  return args;
};

exports.iteratePackages = function(file_arg, profile_arg, env, callback, finish_callback, error_callback) {

    var onProcessed = function (data) {
        var lines = (''+data).split('\n');
        for (var n=0; n<lines.length; n++) {
            var arr = /([\w\.\-]+)\s+([\w\.\-\+]+)\s+([\?\=<\>\-]+\ {0,1}[\w\.\-\?]*)\s+(.+)/.exec(lines[n]);
            if (arr === null || arr === undefined) {
                console.warn("line skipped: " + lines[n]);
                continue;
            }

            var attr = arr[1];
            if ((new RegExp(/^nixos\./)).test(attr)) { attr = attr.substring(6); }
            if (!(new RegExp(/^pkgs\./)).test(attr)) { attr = "pkgs." + attr; }

            callback(attr, arr[2], arr[3], arr[4]);
        }
        finish_callback();
    };

    var onCurrentSystem = function (currentSystem) {
        file_arg = file_arg?file_arg:exports.nixpkgs()+'/default.nix';
        var args = exports.createArgsArray(
            ['-qacP'], file_arg, profile_arg,
            ['--description', '--system-filter', currentSystem]
        );
        exports.nixEnv(args, env, onProcessed, error_callback);
    };

    exports.currentSystem(env, onCurrentSystem, error_callback);

};
exports.allPackages = function(file_arg, profile_arg, env, callback, error_callback) {
  exports.currentSystem(function (currentSystem) {
    var process = function(data) {
      var items = [];
      var lines = (''+data).split('\n');
      for (var n=0; n<lines.length; n++) {
        var arr = /([\w\.\-]+)\s+([\w\.\-\+]+)\s+([\?\=<\>\-]+\ {0,1}[\w\.\-\?]*)/.exec(lines[n]);
        if (arr === null) {
          console.warn("line skipped: " + lines[n]);
          continue;
        }

        var attr = arr[1];
        if ((new RegExp(/^nixos\./)).test(attr)) { attr = attr.substring(6); }
        if (!(new RegExp(/^pkgs\./)).test(attr)) { attr = "pkgs." + attr; }
        items.push({attribute: attr, name: arr[2], compare: arr[3]});
      }
      console.log("allPackages: " + items.length);
      callback(items);
    };

    file_arg = file_arg?file_arg:exports.nixpkgs()+'/default.nix';
    var args = exports.createArgsArray(
      ['-qacP'], file_arg, profile_arg,
      (currentSystem)? ['--system-filter', currentSystem]:[]
    );

    exports.nixEnv(args, env, process, error_callback);
  }, error_callback);
};

exports.installPackage = function(pkg_attribute, file_arg, profile_arg, env, callback, error_callback) {
  file_arg = file_arg?file_arg:exports.nixpkgs()+'/default.nix';
  var args = exports.createArgsArray(
    ['-iA', pkg_attribute], file_arg, profile_arg, []);
  exports.nixEnv(args, env, callback, error_callback).attribute = pkg_attribute;
};

exports.uninstallPackage = function(pkg_attribute, pkg_name, file_arg, profile_arg, env, callback, error_callback) {
  file_arg = file_arg?file_arg:exports.nixpkgs()+'/default.nix';
  var args = exports.createArgsArray(
    ['-e', pkg_name], file_arg, profile_arg, []);
  exports.nixEnv(args, env, callback, error_callback).attribute = pkg_attribute;
};

exports.killNixEnvByAttribute = function(pkg_attribute) {
  for (var i in nixEnvProcesses) {
    if (pkg_attribute == nixEnvProcesses[i].attribute) {
      nixEnvProcesses[i].process.kill("SIGKILL");
      break;
    }
  }
};

exports.killNixEnvAll = function() {
  for (var i in nixEnvProcesses) {
    nixEnvProcesses[i].process.kill("SIGKILL");
  }
};

exports.packageInfo = function (packageAttrStr, file_arg, env, callback, error_callback) {
  exports.nixInstantiate(
    ["--eval", "--strict", "--show-trace"].concat(file_arg?["-I", "nixpkgs="+file_arg]:["-I", "nixpkgs="+exports.nixpkgs()]),
    'let \
      pkgs = import <nixpkgs> {}; \
      getAttrFromStr = str: set: (pkgs.lib.getAttrFromPath (pkgs.lib.splitString "." str) set); \
      isDerivation = value: (value ? "type" && value.type == "derivation"); \
      package = (getAttrFromStr "' + packageAttrStr + '" pkgs); \
      getDependencies = list: builtins.map (v: if isDerivation v then {meta = v.meta; name = v.name; path = v.outPath;} else {}) list; \
      data = {meta = package.meta; name = package.name; path = package.outPath; propagatedNativeBuildInputs = getDependencies package.propagatedNativeBuildInputs; nativeBuildInputs = getDependencies package.nativeBuildInputs;}; \
    in builtins.toJSON data',
    false,  // remove quotations
    true,  // use stdin
    env,
    callback,
    error_callback
  );
};

exports.currentSystem = function (env, callback, error_callback) {
  exports.nixInstantiate(
    ["--eval", "--strict", "--show-trace"],
    'builtins.currentSystem',
    true,
    true,
    env,
    callback,
    error_callback
  );
};

exports.configTree = function (configurationnix, attrs, file_arg, env, callback, error_callback) {
  exports.nixInstantiate(
    [
        "./src/configoptions.nix", "--eval", "--strict", "--show-trace",
        "-A", "dispatch", "--argstr", "attrs", (attrs?attrs:"configuration")
    ].concat(file_arg?["-I", "nixpkgs="+file_arg]:["-I", "nixpkgs="+exports.nixpkgs()]).concat(["--argstr", "configurationnix", configurationnix?configurationnix:""]),
    null,
    false,
    false,
    env,
    callback,
    error_callback
  );
};

exports.gitRev = function (file_arg, env, callback, error_callback) {
  exports.nixBuild(
    [
        "./src/revision.nix",
        "--arg", "nixpkgs", file_arg?file_arg:exports.nixpkgs()
    ],
    env,
    function (file) { callback(fs.readFileSync(file, {encoding: 'utf8'})); },
    error_callback
  );
};

exports.listProfiles = function (directory, name, depth, result) {
    var abspath = path.join(directory, name);

    if (name === 'manifest.nix') {
        return result.concat([directory]);
    }
    if (depth === 0 || /\-\d+\-link$/.test(name)) {
        return result;
    }
    try {
        var items = fs.readdirSync(abspath);
        var list = [];
        for (var i in items) {
            list = list.concat(exports.listProfiles(abspath, items[i], depth-1, result));
        }
        return list;
    } catch (err) {
        return result;
    }
};

exports.makeProfile = function(id, profilePath) {
    return {
        "id": id+"",
        "name": profilePath.split(path.sep).splice(-2).join(path.sep),
        "path": profilePath,
        "profile": endsWith(profilePath, path.sep+'profile') || endsWith(profilePath, path.sep+'.nix-profile')
    }
}

exports.getProfiles = function (profilePaths) {
    var result = [], id = 0;
    for (var i in profilePaths) {
        var list = exports.listProfiles(profilePaths[i], '', 4, []);
        for (var j in list) {
            result.push(exports.makeProfile(id++, list[j]));
        }
    }
    return result;
};

// console.log(exports.getProfiles(['/nix/var/nix/profiles']))


function endsWith(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

exports.nixpkgs = function () {
    var result;
    process.env.NIX_PATH.split(path.delimiter).forEach(function(el) {
        var a = /^nixpkgs\=(.+)$/.exec(el);
        if (a !== null) {
            result = a[1];
        }
    });

    if (fs.existsSync(result)) {
        return result;
    }

    var userNixpkgs = '/nix/var/nix/profiles/per-user/'+process.env.USER+'/channels/nixos/nixpkgs';
    if (fs.existsSync(userNixpkgs)) {
        return userNixpkgs;
    } else {
        return '/nix/var/nix/profiles/per-user/root/channels/nixos/nixpkgs';
    }
};
