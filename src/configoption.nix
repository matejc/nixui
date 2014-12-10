# run it as:
# nix-instantiate ./configoption.nix --eval --strict --show-trace --argstr attrs "users.extraUsers" -I nixpkgs=/home/matej/workarea/nixpkgs --argstr configurationnix /etc/nixos/configuration.nix
{ attrs ? "", configurationnix ? "/etc/nixos/configuration.nix", json ? false }:
let
  # set allowBroken and allowUnfree to true, so that we minimize error output later on
  pkgs = import <nixpkgs> { config = { allowBroken = true; allowUnfree = true; }; };

  configuration = import configurationnix { inherit pkgs; config = pkgs.config; };

  createEntry = path: root: visitList:
    let
      value = if path == [""] then root else pkgs.lib.attrByPath path "<error>" root;
      val = scrubOptionValue path value visitList;
    in (
      {inherit val path;}
    );

  scrubOptionValue = path: x: visitList:
    let
      t = tryScrubOptionValue path x visitList;
    in
      (if t.success then
        t.value
      else
        "<error>");

  tryScrubOptionValue = path: x: visitList:
    let
      visitList_ = [x] ++ visitList;
    in
      builtins.tryEval (
        if pkgs.lib.any (element: element == x) visitList then "<recursion>"
        else if pkgs.lib.isDerivation x then "<drv>"+(toString x.outPath)+"</drv>"
        else if pkgs.lib.isInt x then x
        else if pkgs.lib.isString x then x
        else if pkgs.lib.isBool x then x
        else if pkgs.lib.isFunction x then "<function>"
        else if pkgs.lib.isList x then (map (y: scrubOptionValue path y visitList_) x)
        else if pkgs.lib.isAttrs x then (pkgs.lib.mapAttrs (n: v: (scrubOptionValue path v visitList_)) x)
        else if builtins.typeOf x == "lambda" then "<lambda>"
        else toString x);

  result = createEntry (pkgs.lib.splitString "." attrs) configuration [];
in
  if json then builtins.toJSON result else result
