{ action ? "run" }:

let

  pkgs = import <nixpkgs> {};

  nodewebkit = pkgs.callPackage ./node-webkit.nix { gconf = pkgs.gnome.GConf; };

  npm2nix_src = pkgs.fetchgit {
    url = "git://github.com/svanderburg/npm2nix";
    rev = "c1b83fa7263f2627f707d2969c48fb643759c3f5";
    sha256 = "19h0br5w99bndls5jsiy145z307qbjgrarl2rjx5kymrrzchrqmn";
  };
  npm2nix = (import "${npm2nix_src}/default.nix" {
    system = pkgs.system;
    inherit pkgs;
  }).build;

  nixui = pkgs.stdenv.mkDerivation rec {
    name = "nixui";
    src = [ { name = "nixui-src"; outPath = ./.; } ];
    buildPhase = "";
    installPhase = ''
      mkdir -p $out/bin
      cp -r $src/node_modules $out
      cp -r $src/bower_components $out
      cp -r $src/src $out
      cp -r $src/package.json $out

      cat > $out/bin/nixui <<EOF
      PATH="${pkgs.nix}/bin:\$PATH" ${nodewebkit}/bin/nw $out "\$@"
      EOF
      chmod +x $out/bin/nixui
    '';
  };

  dispatcher = action:
    if action == "env" then
      pkgs.stdenv.mkDerivation rec {
        name = "nixui-env";
        buildInputs = [ nodewebkit npm2nix ];
        shellHook = ''
          export NODE_PATH="`pwd`/node_modules:$NODE_PATH"
        '';
      }
    else
      pkgs.callPackage ./package.nix { node_webkit = nodewebkit; };

in dispatcher action
