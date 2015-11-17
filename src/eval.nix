/*
Copyright 2014-2015 Matej Cotman

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

---

Certain functions copied from NixOS
Copyright 2013-2015 Eelco Dostra, Domen Kožar, Nicolas B. Pierron

NixOS source code can be obtained from:

    https://github.com/NixOS/nixpkgs/tree/master/nixos

NixOS is licensed under X11/MIT license:

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
*/

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
