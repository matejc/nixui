/*
Copyright 2014-2015 Matej Cotman

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

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
