# { configurationnix ? "/etc/nixos/configuration.nix" }:
{ configurationnix ? "/home/matej/workarea/tmp/nixos/configuration.nix"
, system ? builtins.currentSystem
, optionsWithVal ? true
, path ? "services.nginx" }:
with import <nixpkgs/lib>;
let
  # lib = import <nixpkgs/lib> {};
  # config = { nixpkgs.config = { allowBroken = true; allowUnfree = true; }; };
  # platform = (import <nixpkgs/pkgs/top-level/platforms.nix>).pc64;
  # stdenv = (import <nixpkgs/pkgs/stdenv> {
  #   inherit system platform config lib;
  #   allPackages = args: import <nixpkgs/pkgs/top-level/all-packages.nix> ({ inherit config system; });
  # }).stdenvLinux;
  originalPkgs = import <nixpkgs> { };
  configuration = (import configurationnix { pkgs = originalPkgs; config = originalPkgs.config; });

  # baseModules = import <nixpkgs/nixos/modules/module-list.nix>;

  # eval2 = import <nixpkgs/nixos/lib/eval-config.nix> {
  #   modules = [ configuration ];
  #   # system = builtins.currentSystem;
  #   inherit pkgs;
  #   check = false;
  #   # prefix = [ "boot" ];
  #   # lib = pkgs.lib;
  #   # baseModules = [];
  # };

  eval = import <nixpkgs/nixos> {
    configuration = configuration;
    inherit system;
  };
  pkgs = eval.pkgs;

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
      visitList_ = ([x] ++ visitList);
    in
      builtins.tryEval (
        if x == null then null
        else if any (element: element == x) visitList then "<recursion>"
        else if isDerivation x then "<drv>"+(toString x.outPath)+"</drv>"
        else if isInt x then x
        else if isString x then x
        else if isBool x then x
        else if isFunction x then "<function>"
        else if isList x then (map (y: scrubOptionValue_ path y visitList_) x)
        else if isAttrs x then (mapAttrs (n: v: if isNull v then "<null>" else (scrubOptionValue_ path v visitList_)) x)
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
        // (if opt ? example then { example = scrubOptionValue_ (opt.loc) opt.example []; } else {})
        // (if opt ? default then { default = scrubOptionValue_ (opt.loc) opt.default []; } else {})
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

  optionsList_ = flip map optionsList (opt: let
      path = splitString "." opt.name;
      val = if optionsWithVal then (value path).val else null;
  in opt // {
    declarations = map (fn: stripPrefix fn) opt.declarations;
    # inherit path;
  }
  // optionalAttrs (val != null) rec {
    inherit val;
  }
  // optionalAttrs (opt ? example) { example = substFunction opt.example; }
  // optionalAttrs (opt ? default) { default = substFunction opt.default; }
  // optionalAttrs (opt ? type) { type = substFunction opt.type; });


  createEntry = path: root: visitList:
    let
      value = if path == [""] then root else attrByPath path null root;
      val = scrubOptionValue_ path value visitList;
    in (
      {inherit val path;}
    );
  values = createEntry [""] configuration [];
  value = path: createEntry path configuration [];

in {
  options = (builtins.unsafeDiscardStringContext (builtins.toJSON (listToAttrs (map (o: { name = o.name; value = removeAttrs o ["name" "visible" "internal"]; }) optionsList_))));
  config = builtins.unsafeDiscardStringContext (builtins.toJSON (values));
  get = builtins.unsafeDiscardStringContext (builtins.toJSON (value (splitString "." path)));
}
