{ action ? "run" }:

let

  pkgs = import <nixpkgs> {};

  nodewebkit = pkgs.callPackage ./node-webkit.nix { gconf = pkgs.gnome.GConf; };
  nixui = pkgs.callPackage ./default.nix {
    nixui = { outPath = ./.; name = "nixui"; };
    inherit pkgs;
  };

  dispatcher = action:
    if action == "env" then
      pkgs.stdenv.mkDerivation rec {
        name = "nixui-env";
        buildInputs = [ nodewebkit pkgs.nodePackages.npm2nix ];
        shellHook = ''
          export NODE_PATH="`pwd`/node_modules:$NODE_PATH"
        '';
      }
    else
      pkgs.writeScriptBin "nixui" ''
        #! ${pkgs.stdenv.shell}
        export PATH="${pkgs.nix}/bin:$PATH"
        ${nodewebkit}/bin/nw ${nixui.build}/lib/node_modules/nixui/
      '';

in dispatcher action
