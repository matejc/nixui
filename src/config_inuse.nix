let
  pkgs = import <nixpkgs> {};
  mapValues = f: set: (map (attr: f attr (builtins.getAttr attr set)) (builtins.attrNames set));
  recursiveCond = cond: set:
      let
        recurse = path: set:
          let
            g =
              name: value:
              if builtins.isAttrs value && cond path value
                then recurse (path ++ [name]) value
                else {attr = (pkgs.lib.concatStringsSep "." (path ++ [name])); type = (pkgs.lib.nixType value);};
          in mapValues g set;
      in recurse [] set;
  attrsTillLevel = level: set: if level == 0 then [set] else pkgs.lib.flatten (recursiveCond (path: value: (pkgs.lib.length path) < level - 1) set);
  configuration = import /etc/nixos/configuration.nix { inherit pkgs; config = pkgs.config; };
  confignix = import /home/matej/.nixpkgs/config.nix ;
in attrsTillLevel 2 configuration