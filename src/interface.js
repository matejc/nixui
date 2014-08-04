var spawn = require('child_process').spawn;

var nixEnvProcesses = [];

exports.nixEnv = function(args, callback, error_callback) {
  var output = "";
  var outerr = "";

  var nixProcess = spawn('nix-env', args);
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

exports.nixInstantiate = function (prefix_args, expression, removeQuotations, callback, error_callback) {
  var output = "";
  var outerr = "";

  var args = exports.createArgsArray(prefix_args, null, null, ["-"]);

  var nixProcess = spawn("nix-instantiate", args);
  console.log("nix-instantiate: " + args);

  nixProcess.stdin.write(expression);
  nixProcess.stdin.end();

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

exports.iteratePackages = function(file_arg, profile_arg, callback, finish_callback, error_callback) {

    var onProcessed = function (data) {
        var lines = (''+data).split('\n');
        for (var n=0; n<lines.length; n++) {
            var arr = /([\w\.\-]+)\s+([\w\.\-\+]+)\s+([\?\=<\>\-]+\ {0,1}[\w\.\-\?]*)/.exec(lines[n]);
            if (arr === null || arr === undefined) {
                console.warn("line skipped: " + lines[n]);
                continue;
            }

            var attr = arr[1];
            if ((new RegExp(/^nixos\./)).test(attr)) { attr = attr.substring(6); }
            if (!(new RegExp(/^pkgs\./)).test(attr)) { attr = "pkgs." + attr; }

            callback(attr, arr[2], arr[3]);
        }
        finish_callback();
    };

    var onCurrentSystem = function (currentSystem) {
        var args = exports.createArgsArray(
            ['-qacP'], file_arg, profile_arg, ['--system-filter', currentSystem]
        );
        exports.nixEnv(args, onProcessed, error_callback);
    };

    exports.currentSystem(onCurrentSystem, error_callback);

};
exports.allPackages = function(file_arg, profile_arg, callback, error_callback) {
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

    var args = exports.createArgsArray(
      ['-qacP'], file_arg, profile_arg,
      (currentSystem)? ['--system-filter', currentSystem]:[]
    );

    exports.nixEnv(args, process, error_callback);
  }, error_callback);
};

exports.installPackage = function(pkg_attribute, file_arg, profile_arg, callback, error_callback) {
  var args = exports.createArgsArray(
    ['-iA', pkg_attribute], file_arg, profile_arg, []);
  exports.nixEnv(args, callback, error_callback).attribute = pkg_attribute;
};

exports.uninstallPackage = function(pkg_attribute, pkg_name, file_arg, profile_arg, callback, error_callback) {
  var args = exports.createArgsArray(
    ['-e', pkg_name], file_arg, profile_arg, []);
  exports.nixEnv(args, callback, error_callback).attribute = pkg_attribute;
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

exports.packageInfo = function (packageAttrStr, file_arg, callback, error_callback) {
  exports.nixInstantiate(
    ["--eval", "--strict", "--show-trace", "--arg", "nixpkgs", file_arg],
    'let \
      pkgs = import <nixpkgs> {}; \
      getAttrFromStr = str: set: (pkgs.lib.getAttrFromPath (pkgs.lib.splitString "." str) set); \
      isDerivation = value: (value ? "type" && value.type == "derivation"); \
      package = (getAttrFromStr "' + packageAttrStr + '" pkgs); \
      getDependencies = list: builtins.map (v: if isDerivation v then {meta = v.meta; name = v.name; path = v.outPath;} else {}) list; \
      data = {meta = package.meta; name = package.name; path = package.outPath; propagatedNativeBuildInputs = getDependencies package.propagatedNativeBuildInputs; nativeBuildInputs = getDependencies package.nativeBuildInputs;}; \
    in builtins.toJSON data',
    false,
    callback,
    error_callback
  );
};

// for future - (editable) web overview of configuration.nix options
// example output of my configuration with level 2:
// [{
//     attr = "boot.blacklistedKernelModules";
//     type = "list";
// } {
//     attr = "boot.initrd";
//     type = "aattrs";
// } {
//     attr = "boot.loader";
//     type = "aattrs";
// } {
//     attr = "environment.interactiveShellInit";
//     type = "string";
// } {
//     attr = "environment.systemPackages";
//     type = "list";
// } {
//     attr = "fileSystems";
//     type = "list";
// } {
//     attr = "hardware.enableAllFirmware";
//     type = "bool";
// } {
//     attr = "hardware.pulseaudio";
//     type = "aattrs";
// } {
//     attr = "i18n.consoleFont";
//     type = "string";
// } {
//     attr = "i18n.consoleKeyMap";
//     type = "string";
// } {
//     attr = "i18n.defaultLocale";
//     type = "string";
// } {
//     attr = "networking.connman";
//     type = "aattrs";
// } {
//     attr = "networking.firewall";
//     type = "aattrs";
// } {
//     attr = "networking.hostName";
//     type = "string";
// } {
//     attr = "nixpkgs.config";
//     type = "aattrs";
// } {
//     attr = "programs.ssh";
//     type = "aattrs";
// } {
//     attr = "require";
//     type = "list";
// } {
//     attr = "security.pam";
//     type = "aattrs";
// } {
//     attr = "security.sudo";
//     type = "aattrs";
// } {
//     attr = "services.cron";
//     type = "aattrs";
// } {
//     attr = "services.locate";
//     type = "aattrs";
// } {
//     attr = "services.nixosManual";
//     type = "aattrs";
// } {
//     attr = "services.openssh";
//     type = "aattrs";
// } {
//     attr = "services.openvpn";
//     type = "aattrs";
// } {
//     attr = "services.printing";
//     type = "aattrs";
// } {
//     attr = "services.syncthing";
//     type = "aattrs";
// } {
//     attr = "services.xserver";
//     type = "aattrs";
// } {
//     attr = "sound.enable";
//     type = "bool";
// } {
//     attr = "swapDevices";
//     type = "list";
// } {
//     attr = "system.activationScripts";
//     type = "aattrs";
// } {
//     attr = "time.timeZone";
//     type = "string";
// } {
//     attr = "users.extraUsers";
//     type = "aattrs";
// }]
exports.tree = function (level, callback, error_callback) {
  exports.nixInstantiate(
    ["--eval", "--strict", "--show-trace"],
    'let \
      pkgs = import <nixpkgs> {}; \
      mapValues = f: set: (map (attr: f attr (builtins.getAttr attr set)) (builtins.attrNames set)); \
      recursiveCond = cond: f: set: \
          let \
            recurse = path: set: \
              let \
                g = \
                  name: value: \
                  if builtins.isAttrs value && cond path value \
                    then recurse (path ++ [name]) value \
                    else f (path ++ [name]) {attr = (pkgs.lib.concatStringsSep "." (path ++ [name])); type = (pkgs.lib.nixType value);}; \
              in mapValues g set; \
          in recurse [] set; \
        attrsTillLevel = level: set: if level == 0 then [set] else pkgs.lib.flatten (recursiveCond (path: value: (pkgs.lib.length path) < level - 1) (path: value: value) set); \
      configuration = import /etc/nixos/configuration.nix { inherit pkgs; config = pkgs.config; }; \
      data = attrsTillLevel ' + level + ' configuration; \
    in data',
    false,
    callback,
    error_callback
  );
};

// exports.tree(
//     2,
//     function(data) { console.log(data); },
//     function() { console.log("error"); }
// );

exports.currentSystem = function (callback, error_callback) {
  exports.nixInstantiate(
    ["--eval", "--strict", "--show-trace"],
    'builtins.currentSystem',
    true,
    callback,
    error_callback
  );
};
