{ stdenv, fetchgit, buildEnv, pkgs, node_webkit }:
let
  nixui = (import ./node-default.nix { }).build;
in
stdenv.mkDerivation rec {
  name = nixui.name;

  unpackPhase = "true";

  installPhase = ''
    mkdir -p $out/bin

    cat > $out/bin/nixui <<EOF
    cd ${nixui}/lib/node_modules/nixui/
    export PATH="${pkgs.nix}/bin:\$PATH"
    ${node_webkit}/bin/nw ${nixui}/lib/node_modules/nixui/ "\$@"
    EOF
    chmod +x $out/bin/nixui
  '';
}
