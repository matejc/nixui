var console = require('console');
var spawn = require('child_process').spawn;

exports.nixEnv = function(args, callback, error_callback) {
  var output = "";
  var outerr = "";

  var nixProcess = spawn('nix-env', args);

  nixProcess.stdout.on("data", function(data) {
    output += data;
  });
  
  nixProcess.stderr.on("data", function(data) {
    console.error("nix-env error: " + data);
    outerr += data;
  });
  
  nixProcess.on("exit", function(code) {
    if(code == 0)
      callback(output.substring(0, output.length - 1));
    else
      error_callback(outerr+"\nnix-env exited with status: " + code);
  });
};

exports.nixInstantiate = function (args, expression, removeQuotations, callback, error_callback) {
  var output = "";
  var outerr = "";
  
  var nixProcess = spawn("nix-instantiate", args.concat(["-"]));
  
  nixProcess.stdin.write(expression);
  nixProcess.stdin.end();

  nixProcess.stdout.on("data", function(data) {
    output += data;
  });
  
  nixProcess.stderr.on("data", function(data) {
    console.error("nix-instantiate error: " + data);
    outerr += data;
  });
  
  nixProcess.on("exit", function(code) {
    if(code == 0)
      if (removeQuotations) {
        callback(output.substring(1, output.length - 2));
      } else {
        // callback(output.substring(0, output.length - 1));  // why?
        callback(output);
      }
    else
      error_callback(outerr+"\nnix-instantiate exited with status: " + code);
  });
};

createArgsArray = function(prefix_args, file_arg, profile_arg, postfix_args) {
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
}

exports.allPackages = function(file_arg, profile_arg, callback, error_callback) {
  exports.currentSystem(function (currentSystem) {
    var process = function(data) {
      items = [];
      lines = (''+data).split('\n');
      for (var n=0; n<lines.length; n++) {
        arr = /([\w\.\-]+)\s+([\w\.\-\+]+)\s+([\?\=\<\>\-]+\ [\w\.\-\?]+)/.exec(lines[n]);
        if (arr == null) {
          console.warn("line skipped: " + lines[n]);
          continue;
        }

        var attr = arr[1];
        if ((new RegExp(/^nixos\./)).test(attr)) { attr = attr.substring(6); };
        if (!(new RegExp(/^pkgs\./)).test(attr)) { attr = "pkgs." + attr; };
        items.push({attribute: attr, name: arr[2], compare: arr[3]});
      }
      console.log("allPackages: " + items.length);
      callback(items);
    };

    var args = createArgsArray(
      ['-qacP'], file_arg, profile_arg,
      (currentSystem)? ['--system-filter', currentSystem]:[]
    );

    exports.nixEnv(args, process, error_callback);
  }, error_callback);
};

exports.installPackage = function(pkg_attribute, file_arg, profile_arg, callback, error_callback) {
  var args = createArgsArray(
    ['-iA', pkg_attribute], file_arg, profile_arg, []);
  exports.nixEnv(args, doInstall, error_callback);
};

exports.uninstallPackage = function(pkg_name, file_arg, profile_arg, callback, error_callback) {
  var args = createArgsArray(
    ['-e', pkg_name], file_arg, profile_arg, []);
  exports.nixEnv(args, callback, error_callback);
};

exports.packageInfo = function (packageAttrStr, callback, error_callback) {
  exports.nixInstantiate(
    ["--eval", "--strict", "--show-trace"],
    'let \
      pkgs = import <nixpkgs> {}; \
      getAttrFromStr = str: set: (pkgs.lib.getAttrFromPath (pkgs.lib.splitString "." str) set); \
      isDerivation = value: (value ? "type" && value.type == "derivation"); \
      package = (getAttrFromStr "' + packageAttrStr + '" pkgs); \
      getDependencies = list: builtins.map (v: if isDerivation v then {meta = v.meta;} // {name = v.name;} // {path = v.outPath;} else {}) list; \
      data = {meta = package.meta;} // {name = package.name;} // {path = package.outPath;} // {propagatedNativeBuildInputs = getDependencies package.propagatedNativeBuildInputs;} // {nativeBuildInputs = getDependencies package.nativeBuildInputs;}; \
    in builtins.toJSON data',
    false,
    callback,
    error_callback
  );
};

exports.tree = function (startAttr, level, callback, error_callback) {
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
                    else f (path ++ [name]) {attr = (pkgs.lib.concatStringsSep "." (path ++ [name])); type = (if value ? "type" then value.type else "+");}; \
              in mapValues g set; \
          in recurse [] set; \
        valuesOnLevel = level: set: if level == 0 then [set] else pkgs.lib.flatten (recursiveCond (path: value: (pkgs.lib.length path) < level - 1) (path: value: value) set); \
      data = valuesOnLevel ' + level + ' ' + startAttr + '; \
    in data',
    false,
    callback,
    error_callback
  );
};

exports.currentSystem = function (callback, error_callback) {
  exports.nixInstantiate(
    ["--eval", "--strict", "--show-trace"],
    'builtins.currentSystem',
    true,
    callback,
    error_callback
  );
};

// exports.tree("pkgs.config", 4, function(data) {console.log(data)}, function(data) {console.error(data)});
// exports.currentSystem(function(data) {console.log(data)}, function(data) {console.error(data)});
// exports.allPackages(null, function(data) {console.log(data)})

// var neki = /([\w\.\-]+)\s+([\w\.\-\+]+)\s+([\?\=\<\>\-]+\ [\w\.\-\?]+)/.exec("zlib                                                                zlib-1.2.8                                                                    - ?");
// console.log(JSON.stringify(neki))


// console.log( createArgsArray(['a', 'b'], 'null', 'ovce', ['x', 'y']) );
