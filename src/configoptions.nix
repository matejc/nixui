let
  pkgs = import <nixpkgs> {};

  optionAttrSetToDocListMod = prefix: options:
    pkgs.lib.fold (opt: rest:
      let
        docOption = 
          if (opt?internal && opt.internal) || (opt?visible && !opt.visible) then null else
          pkgs.lib.setAttrByPath opt.loc (rec {
            name = pkgs.lib.showOption opt.loc;
            description = opt.description or "";
            declarations = pkgs.lib.filter (x: x != pkgs.lib.unknownModule) opt.declarations;
            internal = opt.internal or false;
            visible = opt.visible or true;
          }
          // pkgs.lib.optionalAttrs (opt ? example) { example = scrubOptionValue opt.example; }
          // pkgs.lib.optionalAttrs (opt ? default) { default = scrubOptionValue opt.default; }
          // pkgs.lib.optionalAttrs (opt ? defaultText) { default = opt.defaultText; }
          // (createEntry opt.loc configuration));

        subOptions =
          let ss = opt.type.getSubOptions opt.loc;
          in if ss != {} then optionAttrSetToDocListMod opt.loc ss else [];
      in
        # FIXME: expensive, O(n^2)
        [ docOption ] ++ subOptions ++ rest) [] (pkgs.lib.collect pkgs.lib.isOption options);

  configuration = import <nixos-config> { inherit pkgs; config = pkgs.config; };
  scrubOptionValue = x:
    if pkgs.lib.isDerivation x then
      { type = "derivation"; drvPath = x.name; outPath = x.name; name = x.name; }
    else if pkgs.lib.isList x then map scrubOptionValue x
    else if pkgs.lib.isAttrs x then pkgs.lib.mapAttrs (n: v: scrubOptionValue v) (builtins.removeAttrs x ["_args"])
    else if pkgs.lib.isFunction x then { type = "function"; }
    else toString x;
  createEntry = path: object:
    let
      #value = pkgs.lib.attrByPath path null object;
      #valueIsList = pkgs.lib.isList value;
      #expandablePath = if (builtins.length path > 2) && ((builtins.elemAt path ((builtins.length path) - 2)) == "*") then pkgs.lib.take (builtins.length path - 2) path else null;
    in (
      #if expandablePath != null then ( (map (n: createEntry (expandablePath ++ [n.name]) object) (pkgs.lib.getAttrFromPath expandablePath object))) else
      #if valueIsList then (map (i: getStringVal path i) value) else
      if pkgs.lib.any (x: x=="*") path then {} else
      if pkgs.lib.any (x: x=="<name>") path then {} else
      if pkgs.lib.any (x: x=="<name?>") path then {} else
      (getStringVal path object)
    );

  getStringVal = path: object:
    let
      v = pkgs.lib.attrByPath path null object;
      t = pkgs.lib.nixType v;
    in
    {attr = (pkgs.lib.concatStringsSep "." path); type = t;} // (
    if t == "string" then {val = (if builtins.typeOf == "lambda" then "<lambda>" else toString v);} else
    if t == "bool" then {val = (if v == true then "true" else "false");} else
    if t == "int" then {val = toString v;} else
    if t == "aattrs" then {val = "{..}";} else
    if t == "list" then {val = "[..]";} else
    if t == "derivation" then {val = v.outPath;} else
    if t == "function" then {val = "type:"+t;} else
    {val = "type:"+t;});

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

  zipSets = (list: pkgs.lib.zipAttrsWith (n: v: if builtins.tail v != [] then zipSets v else builtins.head v ) list);

  listOptionVals = pkgs.lib.remove null (optionAttrSetToDocListMod [] eval.options);

in builtins.toJSON (zipSets (listOptionVals))
