{ configurationnix ? "/etc/nixos/configuration.nix" }:
with import <nixpkgs/lib>;
let
  pkgs = import <nixpkgs> { config = { allowBroken = true; allowUnfree = true; }; system = builtins.currentSystem; };

  configuration = (import configurationnix { inherit pkgs; config = pkgs.config;}) // {nixpkgs.system = builtins.currentSystem;};

  baseModules = import <nixpkgs/nixos/modules/module-list.nix>;

  eval = import <nixpkgs/nixos/lib/eval-config.nix> {
    modules = [ configurationnix ] ++ baseModules;
    # system = builtins.currentSystem;
    inherit pkgs;
    # check = true;
    # prefix = [ "boot" ];
    # lib = pkgs.lib;
    # baseModules = [];
  };


  scrubOptionValue_ = path: x: visitList:
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
        else if pkgs.lib.isList x then (map (y: scrubOptionValue_ path y visitList_) x)
        else if pkgs.lib.isAttrs x then (pkgs.lib.mapAttrs (n: v: (scrubOptionValue_ path v visitList_)) x)
        else if builtins.typeOf x == "lambda" then "<lambda>"
        else toString x);

  optionAttrSetToDocList_ = prefix: options:
    fold (opt: rest:
      let
        docOption = rec {
          name = showOption opt.loc;
          description = opt.description or (builtins.trace "Option `${name}' has no description." "");
          declarations = filter (x: x != unknownModule) opt.declarations;
          internal = opt.internal or false;
          visible = opt.visible or true;
          type = opt.type.name or null;
        }
        // (if opt ? example then { example = scrubOptionValue_ (pkgs.lib.splitString "." opt.loc) opt.example []; } else {})
        // (if opt ? default then { default = scrubOptionValue_ (pkgs.lib.splitString "." opt.loc) opt.default []; } else {})
        // (if opt ? defaultText then { default = opt.defaultText; } else {});

        subOptions =
          let ss = opt.type.getSubOptions opt.loc;
          in if ss != {} then optionAttrSetToDocList_ opt.loc ss else [];
      in
        # FIXME: expensive, O(n^2)
        [ docOption ] ++ subOptions ++ rest) [] (collect isOption options);


  prefix = toString <nixpkgs>;

  # Remove invisible and internal options.
  optionsList = filter (opt: opt.visible && !opt.internal) (optionAttrSetToDocList_ [] eval.options);

  stripPrefix = fn:
  if substring 0 (stringLength prefix) fn == prefix then
    substring (stringLength prefix + 1) 1000 fn
  else
    fn;

  substFunction = x:
    if builtins.isAttrs x then mapAttrs (name: substFunction) x
    else if builtins.isList x then map substFunction x
    else if builtins.isFunction x then "<function>"
    else x;

  # Clean up declaration sites to not refer to the NixOS source tree.
  optionsList_ = flip map optionsList (opt: opt // {
    declarations = map (fn: stripPrefix fn) opt.declarations;
  }
  // optionalAttrs (opt ? example) { example = substFunction opt.example; }
  // optionalAttrs (opt ? default) { default = substFunction opt.default; }
  // optionalAttrs (opt ? type) { type = substFunction opt.type; });


  createEntry = path: root: visitList:
    let
      value = if path == [""] then root else pkgs.lib.attrByPath path "<error>" root;
      val = scrubOptionValue_ path value visitList;
    in (
      {inherit val path;}
    );
  values = attrs: createEntry (pkgs.lib.splitString "." attrs) configuration [];
  getValue = path:
    let
      value = pkgs.lib.attrByPath path null (values "");
    in
      { val = scrubOptionValue_ [""] value []; };
      # { val = scrubOptionValue_ [""] value []; };

in {
  # output = optionAttrSetToDocList_ [] eval.options;
  options = (builtins.unsafeDiscardStringContext (builtins.toJSON (listToAttrs (map (o: { name = o.name; value = removeAttrs o ["name" "visible" "internal"]; }) optionsList_))));
  config = builtins.toJSON (values "services");
}
