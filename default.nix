{ action ? "run" }:

let

  pkgs = import <nixpkgs> {};

  nixui = pkgs.stdenv.mkDerivation rec {
    name = "nixui";
    src = [ { name = "nixui-src"; outPath = ./.; } ];
    buildInputs = [ pkgs.git pkgs.nodePackages.npm ];
    propagatedBuildInputs = [ pkgs.nix pkgs.nodejs ];
    buildPhase = "";
    installPhase = ''
      mkdir -p $out/bin
      cp -r $src/node_modules $out
      cp -r $src/bower_components $out
      cp -r $src/src $out

      cat > $out/bin/nixui-server <<EOF
      PATH="${pkgs.nix}/bin:\$PATH" ${pkgs.nodejs}/bin/node $out/src/server.js "\$@"
      EOF
      chmod +x $out/bin/nixui-server
    '';
  };

  current_path = ./.;

  dispatcher = action:
    if action == "env" then
      pkgs.stdenv.mkDerivation rec {
        name = "nixui-env";
        buildInputs = with pkgs; [ nodejs psmisc nettools ];
        shellHook = ''
          export NODE_PATH="`pwd`/packages:`pwd`/node_modules:$NODE_PATH"
        '';
      }
    else  # run
      pkgs.stdenv.mkDerivation rec {
        name = "nixui";
        src = nixui;
        buildInputs = with pkgs; [ psmisc nettools ];
        shellHook = ''
          cleanup() {
            echo "Killing server ..."
            fuser -k 8000/tcp;
          }
          trap cleanup INT TERM EXIT

          ${nixui}/bin/nixui-server
        '';
      };

in dispatcher action
