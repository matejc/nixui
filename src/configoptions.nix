{ attrs ? "configuration", useConfiguration ? true, configurationnix ? "/etc/nixos/configuration.nix" }:
let
  pkgs = import <nixpkgs> { config = { allowBroken = true; allowUnfree = true; }; };

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
          // pkgs.lib.optionalAttrs (opt ? example) { example = scrubOptionValue opt.example []; }
          // pkgs.lib.optionalAttrs (opt ? default) { default = scrubOptionValue opt.default []; }
          // pkgs.lib.optionalAttrs (opt ? defaultText) { default = opt.defaultText; }
          // pkgs.lib.optionalAttrs (opt ? type) { optType = opt.type.name; }
          // pkgs.lib.optionalAttrs (useConfiguration) (createEntry opt.loc configuration []));

        subOptions =
          let ss = opt.type.getSubOptions opt.loc;
          in if ss != {} then optionAttrSetToDocListMod opt.loc ss else [];
      in
        [ docOption ] ++ subOptions ++ rest) [] (pkgs.lib.collect pkgs.lib.isOption options);

  attrsToStr = attr: visitList: pkgs.lib.mapAttrsToList (n: v: (toString n)+" = "+(scrubOptionValue v visitList) ) attr;

  configuration = import configurationnix { inherit pkgs; config = pkgs.config; };

  scrubOptionValue = x: visitList:
    let
      t = tryScrubOptionValue x visitList;
    in
      (if t.success then
        t.value
      else
        "<error>");

  tryScrubOptionValue = x: visitList:
    let
      visitList_ = [x] ++ visitList;
    in
      builtins.tryEval (
        if pkgs.lib.any (element: element == x) visitList then "<recursion>"
        else if pkgs.lib.isDerivation x then ("<drv>"+x.name+"</drv>")
        else if (x ? _type && x._type=="literalExample") then x.text
        else if pkgs.lib.isInt x then toString x
        else if pkgs.lib.isString x then "''"+(toString x)+"''"
        else if pkgs.lib.isBool x then (if x then "true" else "false")
        else if pkgs.lib.isFunction x then "<function>"
        else if pkgs.lib.isList x then "[ "+(pkgs.lib.concatStringsSep " " (map (y: scrubOptionValue y visitList_) x))+" ]"
        else if pkgs.lib.isAttrs x then ''{ ''+(pkgs.lib.concatStringsSep "; " (attrsToStr (builtins.removeAttrs x ["_args"]) visitList_))+(if x != {} then "; }" else " }")
        else if builtins.typeOf x == "lambda" then "<function>"
        else toString x);

  createEntry = path: start: visitList:
    let
      value = pkgs.lib.attrByPath path null start;
      val = scrubOptionValue value visitList;
      #expandablePath = if (builtins.length path > 2) && ((builtins.elemAt path ((builtins.length path) - 2)) == "*") then pkgs.lib.take (builtins.length path - 2) path else null;
    in (
      #if expandablePath != null then ( (map (n: createEntry (expandablePath ++ [n.name]) object) (pkgs.lib.getAttrFromPath expandablePath object))) else
      # if pkgs.lib.any (x: x=="*") path then {} else
      # if pkgs.lib.any (x: x=="<name>") path then {} else
      # if pkgs.lib.any (x: x=="<name?>") path then {} else
      {inherit val;}
    );

  extraArgs = { modules = []; inherit pkgs baseModules; inherit (pkgs) modulesPath; pkgs_i686 = import <nixpkgs/nixos/lib/nixpkgs.nix> { system = "i686-linux"; config.allowUnfree = true; }; utils = import <nixpkgs/nixos/lib/utils.nix> pkgs; };
  baseModules = import <nixpkgs/nixos/modules/module-list.nix>;
  shortRev = "gfedcba";
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

in {
  dispatch = builtins.toJSON (
    if attrs == "configuration" then (zipSets (listOptionVals)) else
    (createEntry (pkgs.lib.splitString "." attrs) configuration [])
  );
}
