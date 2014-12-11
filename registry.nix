{buildNodePackage, fetchurl, fetchgit, self}:

let
  registry = {
    "nixui-0.0.1" = buildNodePackage {
      name = "nixui";
      version = "0.0.1";
      src = ./.;
      dependencies = {
        underscore = {
          "^1.6.0" = {
            version = "1.7.0";
            pkg = self."underscore-1.7.0";
          };
        };
        nedb = {
          "~1.0.0" = {
            version = "1.0.0";
            pkg = self."nedb-1.0.0";
          };
        };
      };
      meta = {
        description = "nix-env frontend written with Polymer";
        homepage = https://github.com/matejc/nixui;
        license = "BSD 2-Clause";
      };
      production = true;
      linkDependencies = false;
    };
    "underscore-1.7.0" = buildNodePackage {
      name = "underscore";
      version = "1.7.0";
      src = fetchurl {
        url = "http://registry.npmjs.org/underscore/-/underscore-1.7.0.tgz";
        sha1 = "6bbaf0877500d36be34ecaa584e0db9fef035209";
      };
      meta = {
        description = "JavaScript's functional programming helper library.";
        homepage = http://underscorejs.org/;
      };
      production = true;
      linkDependencies = false;
    };
    "underscore-^1.6.0" = self."underscore-1.7.0";
    "nedb-1.0.0" = buildNodePackage {
      name = "nedb";
      version = "1.0.0";
      src = fetchurl {
        url = "http://registry.npmjs.org/nedb/-/nedb-1.0.0.tgz";
        sha1 = "0c076960fcee19d28113c86e6390e8d02c3308ed";
      };
      dependencies = {
        async = {
          "0.2.10" = {
            version = "0.2.10";
            pkg = self."async-0.2.10";
          };
        };
        underscore = {
          "~1.4.4" = {
            version = "1.4.4";
            pkg = self."underscore-1.4.4";
          };
        };
        binary-search-tree = {
          "0.2.4" = {
            version = "0.2.4";
            pkg = self."binary-search-tree-0.2.4";
          };
        };
        mkdirp = {
          "~0.3.5" = {
            version = "0.3.5";
            pkg = self."mkdirp-0.3.5";
          };
        };
      };
      meta = {
        description = "File-based embedded data store for node.js";
        homepage = https://github.com/louischatriot/nedb;
      };
      production = true;
      linkDependencies = false;
    };
    "async-0.2.10" = buildNodePackage {
      name = "async";
      version = "0.2.10";
      src = fetchurl {
        url = "http://registry.npmjs.org/async/-/async-0.2.10.tgz";
        sha1 = "b6bbe0b0674b9d719708ca38de8c237cb526c3d1";
      };
      meta = {
        description = "Higher-order functions and common patterns for asynchronous code";
      };
      production = true;
      linkDependencies = false;
    };
    "underscore-1.4.4" = buildNodePackage {
      name = "underscore";
      version = "1.4.4";
      src = fetchurl {
        url = "http://registry.npmjs.org/underscore/-/underscore-1.4.4.tgz";
        sha1 = "61a6a32010622afa07963bf325203cf12239d604";
      };
      meta = {
        description = "JavaScript's functional programming helper library.";
        homepage = http://underscorejs.org/;
      };
      production = true;
      linkDependencies = false;
    };
    "underscore-~1.4.4" = self."underscore-1.4.4";
    "binary-search-tree-0.2.4" = buildNodePackage {
      name = "binary-search-tree";
      version = "0.2.4";
      src = fetchurl {
        url = "http://registry.npmjs.org/binary-search-tree/-/binary-search-tree-0.2.4.tgz";
        sha1 = "14fe106366a59ca8efb68c0ae30c36aaff0cd510";
      };
      dependencies = {
        underscore = {
          "~1.4.4" = {
            version = "1.4.4";
            pkg = self."underscore-1.4.4";
          };
        };
      };
      meta = {
        description = "Different binary search tree implementations, including a self-balancing one (AVL)";
        homepage = https://github.com/louischatriot/node-binary-search-tree;
      };
      production = true;
      linkDependencies = false;
    };
    "mkdirp-0.3.5" = buildNodePackage {
      name = "mkdirp";
      version = "0.3.5";
      src = fetchurl {
        url = "http://registry.npmjs.org/mkdirp/-/mkdirp-0.3.5.tgz";
        sha1 = "de3e5f8961c88c787ee1368df849ac4413eca8d7";
      };
      meta = {
        description = "Recursively mkdir, like `mkdir -p`";
        license = "MIT";
      };
      production = true;
      linkDependencies = false;
    };
    "mkdirp-~0.3.5" = self."mkdirp-0.3.5";
    "nedb-~1.0.0" = self."nedb-1.0.0";
  };
in
registry