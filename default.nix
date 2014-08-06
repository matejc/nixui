{ action ? "env" }:

let

  pkgs = import <nixpkgs> {};

  npm2nix = pkgs.nodePackages.buildNodePackage rec {
    name = "npm2nix-${rev}";
    rev = "d5f32c257dfa806df593a1caeabe52fc5c45fbcf";
    src = [
      (pkgs.fetchgit {
        url = "https://github.com/NixOS/npm2nix";
        inherit rev;
        sha256 = "19adqd5ar19yrcsvmzh8bwhzbwqmymj82wsg4zfj0226fbkdwrx9";
      })
    ];
    buildInputs = [ pkgs.nodePackages.coffee-script ];
    postInstall = ''
      ${pkgs.nodePackages.coffee-script}/bin/coffee --bare --compile --output $out/lib/node_modules/npm2nix/lib $src/src/*.coffee
    '';
    deps = [
      pkgs.nodePackages.by-version."semver"."2.2.1"
      pkgs.nodePackages.by-version."argparse"."0.1.15"
      pkgs.nodePackages.by-version."npm-registry-client"."0.2.27"
      pkgs.nodePackages.by-version."npmconf"."0.1.1"
      pkgs.nodePackages.by-version."tar"."0.1.17"
      pkgs.nodePackages.by-version."temp"."0.6.0"
      pkgs.nodePackages.by-version."fs.extra"."1.2.1"
      pkgs.nodePackages.by-version."findit"."1.1.1"
    ];
    peerDependencies = [
    ];
    passthru.names = [ "npm2nix" ];
  };

  generate_node = pkgs.stdenv.mkDerivation {
    name = "nixui-generate-node";
    inherit packagejson npm2nix;
    buildInputs = [ pkgs.git pkgs.nix ];
    buildCommand = ''
      export OPENSSL_X509_CERT_FILE=${pkgs.cacert}/etc/ca-bundle.crt
      export GIT_SSL_CAINFO=${pkgs.cacert}/etc/ca-bundle.crt
      mkdir -p $out
      echo "running ${npm2nix}/bin/npm2nix"
      ${npm2nix}/bin/npm2nix ${packagejson} $out/node_packages_generated.nix
    '';
  };

  generate_bower = pkgs.stdenv.mkDerivation {
    name = "nixui-generate-bower";
    inherit bowerjson;
    buildInputs = [ pkgs.git pkgs.nix ];
    buildCommand = ''
      export OPENSSL_X509_CERT_FILE=${pkgs.cacert}/etc/ca-bundle.crt
      export GIT_SSL_CAINFO=${pkgs.cacert}/etc/ca-bundle.crt
      mkdir -p $out
      export HOME="/tmp/bower_home"
      echo "running ${pkgs.nodePackages.bower2nix}/bin/bower2nix ${bowerjson} $out/bower_packages_generated.nix"
      ${pkgs.nodePackages.bower2nix}/bin/bower2nix ${bowerjson} $out/bower_packages_generated.nix
      rm -rf /tmp/bower_home
    '';
  };

  generate = pkgs.runCommand "nixui-build" {} ''
    mkdir -p $out
    ln -sv ${generate_node}/node_packages_generated.nix $out/node_packages_generated.nix
    #ln -sv ${generate_bower}/bower_packages_generated.nix $out/bower_packages_generated.nix
  '';

  node_packages_generated_nix = (pkgs.writeText "node_packages_generated.nix" (builtins.readFile ./node_packages_generated.nix));
  bower_packages_generated_nix = (pkgs.writeText "bower_packages_generated.nix" (builtins.readFile ./bower_packages_generated.nix));
  packagejson = (pkgs.writeText "package.json" (builtins.readFile ./package.json));
  bowerjson = (pkgs.writeText "bower.json" (builtins.readFile ./bower.json));

  node_generated = import <nixpkgs/pkgs/top-level/node-packages.nix> {
    inherit pkgs;
    inherit (pkgs) stdenv nodejs fetchurl fetchgit;
    neededNatives = [ pkgs.python ] ++ pkgs.lib.optional pkgs.stdenv.isLinux pkgs.utillinux;
    self = node_generated;
    generated = node_packages_generated_nix;
  };

  generated_node_packages = builtins.filter (x: !builtins.elem x [
    "buildNodePackage"
    "by-spec"
    "by-version"
    "nativeDeps"
    "patchLatest"
    "patchSource"
  ]) (builtins.attrNames node_generated);

  node_env = pkgs.buildEnv {
    name = "node_env";
    paths = (pkgs.lib.attrVals generated_node_packages node_generated);
    pathsToLink = [ "/lib/node_modules" ];
    ignoreCollisions = true;
  };

  fetchbower = name: version: target: outputHash: pkgs.stdenv.mkDerivation {
    name = "${name}-${outputHash}";
    realBuilder = "${pkgs.nodePackages.fetch-bower}/bin/fetch-bower";
    args = [ name version target ];
    outputHashMode = "recursive";
    outputHashAlgo = "sha256";
    inherit outputHash;
    PATH = "${pkgs.git}/bin";
  };

  bower_env = import bower_packages_generated_nix {
    inherit (pkgs) buildEnv;
    inherit fetchbower;
  };

  build_bower = pkgs.stdenv.mkDerivation {
    name = "nixui-build-bower";
    inherit bowerjson;
    buildInputs = [ pkgs.git ];
    buildCommand = ''
      export OPENSSL_X509_CERT_FILE=${pkgs.cacert}/etc/ca-bundle.crt
      export GIT_SSL_CAINFO=${pkgs.cacert}/etc/ca-bundle.crt
      mkdir -p $out
      export HOME="/tmp/bower_home"
      cd $out
      ln -s ${bowerjson} $out/bower.json
      ${pkgs.nodePackages.bower}/bin/bower install
    '';
  };

  build = pkgs.runCommand "nixui-build" {} ''
    mkdir -p $out/bin
    ln -sv ${node_env}/lib/node_modules $out/node_modules
    ln -sv ${build_bower}/bower_components $out/bower_components
    ln -sv ${nixui_services}/bin/services-nixui-* $out/bin
  '';

  nixrehash_src = pkgs.fetchgit {
    url = "https://github.com/kiberpipa/nix-rehash";
    rev = "0fe67d3691a61ed64cfa8f20d03a088880595a9f";
    sha256 = "1q469mplwyvzm3r8nzz5s9afjfq8q9jh72mmwlzcd14hh5h65cpx";
  };

  nixui_services = (import nixrehash_src).reService rec {
    name = "services-nixui";
    configuration = let servicePrefix = "/tmp/${name}/services"; in [
    ({ config, pkgs, ...}: {
      services.elasticsearch.enable = true;
      services.elasticsearch.dataDir = "/tmp/${name}/dataDir";
    })
    ];
  };

  nixui = pkgs.nodePackages.buildNodePackage rec {
    name = "nixui";
    src = [ { name = "nixui-src"; outPath = current_path; } ];
    deps = (pkgs.lib.attrVals generated_node_packages node_generated);
    buildInputs = [ pkgs.nix ];
    postInstall = ''
      mkdir -p $out/bin
      cat > $out/bin/nixui-server <<EOF
      PATH="${pkgs.nix}/bin:\$PATH" ${pkgs.nodejs}/bin/node $out/lib/node_modules/nixui/src/server.js "\$@"
      EOF
      chmod +x $out/bin/nixui-server
      ln -sv ${build_bower}/bower_components $out/lib/node_modules/nixui/bower_components
    '';
    passthru.names = [ "nixui" ];
  };

  current_path = ./.;

  dispatcher = action:
    if action == "generate" then
      generate
    else if action == "build" then
      build
    else if action == "env" then
      pkgs.stdenv.mkDerivation rec {
        name = "nixui-env";
        buildInputs = with pkgs; [ nodejs ];
      }
    else
      pkgs.stdenv.mkDerivation rec {
        name = "nixui";
        src = nixui;
        buildInputs = with pkgs; [ nixui_services ];
        shellHook = ''
          echo "Development credentials - U: bob, P: secret"
          ${nixui}/bin/nixui-server -f ${pkgs.path} --login bob --sha256 2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b
        '';
      };

in dispatcher action
