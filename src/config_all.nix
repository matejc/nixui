{ createEntry }:
let
  pkgs = import <nixpkgs> {};
  mapValues = f: set: (map (attr: f attr (builtins.getAttr attr set)) (builtins.attrNames set));
  recursiveCond = cond: set:
      let
        recurse = path: set:
          let
            g =
              name: value:
              if (name == "passthru" || (toString path == "kde" && name == "extraPackages")) then
              builtins.trace ("skipping deprecated: "+(pkgs.lib.concatStringsSep "." (path++[name]))) null else
              if (isInternal value) then
              builtins.trace ("skipping internal: "+(pkgs.lib.concatStringsSep "." (path++[name]))) null else
              if (name == "_definedNames" || name == "_type") then
              builtins.trace ("skipping _: "+(pkgs.lib.concatStringsSep "." (path++[name]))) null else
              (if builtins.isAttrs value && cond path value
                then recurse (path ++ [name]) value
                else createEntry path name value);
          in mapValues g set;
      in recurse [] set;
  attrsTillLevel = level: set: if level == 0 then [set] else pkgs.lib.flatten (recursiveCond (path: value: ((pkgs.lib.length path) < level - 1)) set);

  isInternal = x: pkgs.lib.isAttrs x && x ? internal && x.internal;
  extraArgs = { modules = []; inherit pkgs baseModules; inherit (pkgs) modulesPath; pkgs_i686 = import <nixpkgs/nixos/lib/nixpkgs.nix> { system = "i686-linux"; config.allowUnfree = true; }; utils = import <nixpkgs/nixos/lib/utils.nix> pkgs; };
  baseModules = import <nixpkgs/nixos/modules/module-list.nix>;
  stableBranch = false; revCount = 56789; shortRev = "gfedcba";
  versionModule =
  { system.nixosVersionSuffix = pkgs.lib.nixpkgsVersion;
    system.nixosRevision = pkgs.rev or shortRev;
  };
  eval = pkgs.lib.evalModules {
    modules = [ versionModule ] ++ baseModules;
    args = extraArgs;
  };
in (level: attrsTillLevel level eval.options)
#in attrsTillLevel 3 eval.options
#in pkgs.lib.optionAttrSetToDocList eval.options
