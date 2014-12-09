{ stdenv, fetchgit, buildEnv, pkgs }:
let
  version = "0.0.1";

  src = fetchgit {
    url = "git://github.com/matejc/nixui";
    rev = "refs/tags/${version}";
    sha256 = "1yyzpq9j6y1sb05n3dv7lw5d8n5hvnxnkh8gl3fvh0zrxjcb0qpg";
  };

  nodePackages = import "${pkgs.path}/pkgs/top-level/node-packages.nix" {
    inherit pkgs;
    inherit (pkgs) stdenv nodejs fetchurl fetchgit;
    neededNatives = [ pkgs.python ] ++ pkgs.lib.optional pkgs.stdenv.isLinux pkgs.utillinux;
    self = nodePackages;
    generated = "${src}/node_modules.nix";
  };

  deps = buildEnv {
    name = "nixui-deps";
    paths = [ nodePackages.yargs nodePackages.domready
      nodePackages.underscore nodePackages.nedb ];
  };
in
stdenv.mkDerivation rec {
  name = "nixui-${version}";

  inherit version src;

  buildInputs = [ deps ];

  propagatedBuildInputs = [ pkgs.nodejs ];

  buildPhase = "";

  installPhase = ''
    mkdir -p $out/bin

    cp -r ./bower_components $out
    cp -r ./src $out
    cp -r ./package.json $out

    cat > $out/bin/nixui <<EOF
    export NODE_PATH="${deps}/lib/node_modules"
    PATH="${pkgs.nix}/bin:\$PATH" ${pkgs.node_webkit}/bin/nw $out "\$@"
    EOF
    chmod +x $out/bin/nixui
  '';
}
