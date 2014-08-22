{ action ? "run" }:

let

  pkgs = import <nixpkgs> {};

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
    if action == "services" then
      nixui_services
    else if action == "env" then
      pkgs.stdenv.mkDerivation rec {
        name = "nixui-env";
        buildInputs = with pkgs; [ nodejs nodePackages.bower psmisc nettools ];
        shellHook = ''
          export NODE_PATH="`pwd`/packages:`pwd`/node_modules:$NODE_PATH"
        '';
      }
    else  # run
      pkgs.stdenv.mkDerivation rec {
        name = "nixui";
        src = nixui;
        buildInputs = with pkgs; [ nixui_services psmisc nettools ];
        shellHook = ''
          cleanup() {
            echo "Shutdown NixUI services ..."
            services-nixui-stop-services

            echo "Killing server ..."
            fuser -k 8000/tcp;
          }
          trap cleanup INT TERM EXIT

          echo "Starting ElasticSearch ..."
          services-nixui-start-services

          echo "Waiting for ElasticSearch ..."
          while netstat -lnt | awk '$4 ~ /:9200$/ {exit 1}'; do sleep 1; done

          echo "Development credentials - U: admin, P: admin"
          ${nixui}/bin/nixui-server
        '';
      };

in dispatcher action
