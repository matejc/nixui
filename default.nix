{ }:

let

  pkgs = import <nixpkgs> {};

  generated = import <nixpkgs/pkgs/top-level/node-packages.nix> {
    inherit pkgs;
    inherit (pkgs) stdenv nodejs fetchurl fetchgit;
    neededNatives = [ pkgs.python ] ++ pkgs.lib.optional pkgs.stdenv.isLinux pkgs.utillinux;
    self = generated;
    generated = ./package.nix;
  };

  generated_packages = builtins.filter (x: !builtins.elem x [
      "buildNodePackage"
      "by-spec"
      "by-version"
      "nativeDeps"
      "patchLatest"
      "patchSource"
    ]) (builtins.attrNames generated);

  generated_paths = pkgs.lib.attrVals generated_packages generated;

  generated_node_paths = map (
    x: x + "/lib/node_modules/" + (
        builtins.head x.names
      )) generated_paths;

in pkgs.stdenv.mkDerivation {

  name = "nixui";

  buildInputs = with pkgs; [
    nodePackages.npm2nix
  ];

  shellHook = ''
    rm ./node_modules -rf
    mkdir ./node_modules
    for path in ${pkgs.lib.concatStringsSep " " generated_node_paths}; do
      ln -s $path ./node_modules
    done
  '';

}
