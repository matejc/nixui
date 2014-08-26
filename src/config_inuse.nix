let
  pkgs = import <nixpkgs> {};
  mapValues = f: set: (map (attr: f attr (builtins.getAttr attr set)) (builtins.attrNames set));
  recursiveCond = cond: set:
      let
        recurse = path: set:
          let
            g =
              name: value:
              if builtins.isList value
                then pkgs.lib.imap (i: v: createEntry path (name+"["+toString i+"]") v) value
                else
              if builtins.isAttrs value && cond path value
                then recurse (path ++ [name]) value
                else createEntry path name value;
          in mapValues g set;
      in recurse [] set;
  attrsTillLevel = level: set: if level == 0 then [set] else pkgs.lib.flatten (recursiveCond (path: value: (pkgs.lib.length path) < level - 1) set);

  createEntry = path: name: value: rec {attr = (pkgs.lib.concatStringsSep "." (path ++ [name])); type = (pkgs.lib.nixType value); val = (valueToString attr type value);};

  valueToString = a: t: v:
    if t == "string" then v else
    if t == "bool" then toString v else
    if t == "int" then toString v else
    if t == "aattrs" then a else
    if t == "derivation" then v.outPath else
    null;

  configuration = import /etc/nixos/configuration.nix { inherit pkgs; config = pkgs.config; };
  confignix = import /home/matej/.nixpkgs/config.nix ;
in attrsTillLevel 3 configuration
