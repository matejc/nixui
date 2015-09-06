{ nixui ? { outPath = ./.; name = "nixui"; }
, pkgs ? import <nixpkgs> {}
}:
let
  nodePackages = import <nixpkgs/pkgs/top-level/node-packages.nix> {
    inherit pkgs;
    inherit (pkgs) stdenv nodejs fetchurl fetchgit;
    neededNatives = [ pkgs.python ] ++ pkgs.lib.optional pkgs.stdenv.isLinux pkgs.utillinux;
    self = nodePackages;
    generated = ./node.nix;
  };
in rec {
  tarball = pkgs.runCommand "nixui.tgz" { buildInputs = [ pkgs.nodejs ]; } ''
    cp -r ${nixui} ./nixui
    mv `HOME=$PWD npm pack ./nixui` $out
  '';
  build = nodePackages.buildNodePackage {
    name = "nixui";
    src = [ tarball ];
    buildInputs = nodePackages.nativeDeps."nixui" or [];
    deps = [ nodePackages.underscore nodePackages.nedb ];
    peerDependencies = [];
    passthru.names = [ "nixui" ];
  };
}
