{system ? builtins.currentSystem, pkgs ? import <nixpkgs> {
    inherit system;
  }, overrides ? {}}:

let
  nodeEnv = import ./node-env.nix {
    inherit (pkgs) stdenv fetchurl nodejs python utillinux runCommand;
  };
  registry = (import ./registry.nix {
    inherit (nodeEnv) buildNodePackage;
    inherit (pkgs) fetchurl fetchgit;
    self = registry;
  }) // overrides;
in
{
  inherit registry;
  tarball = nodeEnv.buildNodeSourceDist {
    name = "nixui";
    version = "0.0.1";
    src = ./.;
  };
  build = registry."nixui-0.0.1" {};
}