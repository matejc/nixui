{ system ? builtins.currentSystem
, optionsWithVal ? false
, configurationnix ? "/etc/nixos/configuration.nix"
, path ? "networking.hostName"
, json ? "" }:

with import <nixpkgs/lib>;

let
  emptyPkgs = import <nixpkgs> { inherit system; };
  nixpkgsConfig = (import configurationnix { pkgs = emptyPkgs; config = emptyPkgs.config; }).nixpkgs.config // {allowBroken = true;};
  pkgs = import <nixpkgs> { inherit system; config = nixpkgsConfig; };
  lib = import <nixpkgs/lib>;
  configuration = configurationnix: (import configurationnix { inherit pkgs lib; config = nixpkgsConfig; });
  configurationModuleFun = configuration: filePath: rec {
    _file = filePath;
    # _file = <nixpkgs/nixos/lib/eval-config.nix>;
    key = _file;
    config = {
      nixpkgs.system = mkDefault system;
      _module.args.configuration = mkForce configuration;
      _module.check = false;
    };
  };
  evalConfig = filePath: evalModuleFun (configurationModuleFun (configuration filePath) filePath);
  evalModuleFun = module: evalModules {
    modules = [ module ];
  };

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

  emptyEval = import <nixpkgs/nixos> {
    inherit system;
  };
  optionsList = filter (opt: opt.visible && !opt.internal) (optionAttrSetToDocList emptyEval.options);
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
