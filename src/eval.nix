{ system ? builtins.currentSystem
, optionsWithVal ? false
, configurationnix ? "/etc/nixos/configuration.nix"
, path ? "networking.hostName"
, json ? "" }:

with import <nixpkgs/lib>;

let
  pkgs = import <nixpkgs> { inherit system; };
  eval = import <nixpkgs/nixos> {
    configuration = configuration configurationnix;
    inherit system;
  };
  lib = import <nixpkgs/lib>;
  configuration = configurationnix: (import configurationnix { config = eval.config; inherit pkgs lib; });

  trySubst = x:
    let
      try = builtins.tryEval (subst x);
    in
      (if try.success then
        try.value
      else
        "<error>");
  subst = x:
    if (x.meta.broken or false) then t ("<broken>"+x.outPath+"</broken>")
    else if (x.meta.platforms or null != null && !elem system x.meta.platforms) then t ("<broken>"+x.outPath+"</broken>")
    else if isDerivation x then "<drv>"+x.outPath+"</drv>"
    else if builtins.isAttrs x then mapAttrs (name: trySubst) x
    else if builtins.isList x then map trySubst x
    else if builtins.isFunction x then "<function>"
    else x;

  t = o: builtins.trace (builtins.toJSON o) o;
  tr = o: pass: builtins.trace (builtins.toJSON o) pass;

  optionsList = filter (opt: opt.visible && !opt.internal) (optionAttrSetToDocList eval.options);
  prefix = toString <nixpkgs>;
  stripPrefix = fn:
    if substring 0 (stringLength prefix) fn == prefix then
      substring (stringLength prefix + 1) 1000 fn
    else
      fn;
  optionsList_ = filePath: flip map optionsList (opt:
    let
        path = splitString "." opt.name;
        root = trySubst (configuration filePath);
        val = if path == [""] then root else attrByPath path null root;
    in
    opt // {
      declarations = map (fn: stripPrefix fn) opt.declarations;
    }
    // optionalAttrs (opt ? example) { example = trySubst opt.example; }
    // optionalAttrs (opt ? default) { default = trySubst opt.default; }
    // optionalAttrs (opt ? type) { type = trySubst opt.type; }
    // optionalAttrs (optionsWithVal) { val = trySubst val; });

in {
  options = builtins.toJSON (optionsList_ configurationnix);
  config = builtins.toJSON (trySubst (configuration configurationnix));
  get = let
    pathList = splitString "." path;
    config = trySubst (configuration configurationnix);
    result = if pathList == [""] then config else attrByPath pathList null config;
  in
    builtins.toJSON result;
  parse = builtins.fromJSON json;
}
