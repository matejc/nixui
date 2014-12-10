{ stdenv, fetchgit, buildEnv, pkgs, node_webkit }:
let
  version = "0.0.1";

  # src = fetchgit {
  #   url = "git://github.com/matejc/nixui";
  #   rev = "refs/tags/${version}";
  #   sha256 = "1yyzpq9j6y1sb05n3dv7lw5d8n5hvnxnkh8gl3fvh0zrxjcb0qpg";
  # };

  src = { name = "nixui-src"; outPath = ./.; };
in
stdenv.mkDerivation rec {
  name = "nixui-${version}";

  inherit version src;

  buildPhase = "";

  installPhase = ''
    mkdir -p $out/bin

    cp -r $src/node_modules $out
    cp -r $src/bower_components $out
    cp -r $src/src $out
    cp -r $src/package.json $out

    cat > $out/bin/nixui <<EOF
    cd $out
    PATH="${pkgs.nix}/bin:\$PATH" ${node_webkit}/bin/nw $out "\$@"
    EOF
    chmod +x $out/bin/nixui
  '';
}
