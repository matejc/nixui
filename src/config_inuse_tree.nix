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
                else createEntry path name value;
          in mapValues g set;
      in recurse [] set;
  attrsTillLevel = level: set: if level == 0 then [set] else pkgs.lib.flatten (recursiveCond (path: value: (pkgs.lib.length path) < level - 1) set);

  createEntry = path: name: value: pkgs.lib.setAttrByPath (path ++ [name]) ((valueToString (pkgs.lib.concatStringsSep "." (path ++ [name])) (pkgs.lib.nixType value) value));

  valueToString = a: t: v:
    let
      val_ = (if t == "list" then (map (i: getStringVal a (pkgs.lib.nixType i) i) v) else (getStringVal a t v));
    in val_;

  getStringVal = a: t: v: 
    {attr = a; type = t;} // (
    if t == "string" then {val = (if (builtins.typeOf v) == "lambda" then "<lambda>" else toString v);} else
    if t == "bool" then {val = (if v == true then "true" else "false");} else
    if t == "int" then {val = toString v;} else
    if t == "aattrs" then {val = "{..}";} else
    if t == "list" then {val = "[..]";} else
    if t == "derivation" then {val = v.outPath;} else
    if t == "function" then {val = t;} else
    {val = "null";});

  zipSets = (list: pkgs.lib.zipAttrsWith (n: v: if builtins.tail v != [] then zipSets v else builtins.head v ) list);

  configuration = import <nixos-config> { inherit pkgs; config = pkgs.config; };
  confignix = import /home/matej/.nixpkgs/config.nix;

  configall = import ./config_all.nix { inherit createEntry; };
  configoptions = import ./configoptions.nix;
#in builtins.toJSON ((zipSets (configoptions))//(zipSets (attrsTillLevel 3 configuration)))
#in builtins.toJSON ((zipSets (pkgs.lib.remove null (configall 3)))//(zipSets (attrsTillLevel 3 configuration)))
#in builtins.toJSON(zipSets (pkgs.lib.remove null (configall 3)))
in (zipSets ((configoptions) ++ (attrsTillLevel 3 configuration)))
#in ((pkgs.lib.remove null (configall 3)))
#in builtins.toJSON(zipSets (attrsTillLevel 3 configuration))
