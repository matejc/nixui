clean:
	@rm -rf ./node_modules/.bin
	@rm -rf ./node_modules/*

build: clean node

develop:
	@nix-shell dispatcher.nix --argstr action env --command "nw ."

test:
	@nix-shell dispatcher.nix --argstr action env --command "cd ./src && ../node_modules/.bin/mocha --reporter list"

bower: bower.json
	@rm -rf ./bower_components/*
	nix-shell dispatcher.nix --argstr action env --command "./node_modules/bower/bin/bower install"

node: package.json
	nix-shell dispatcher.nix --argstr action env --command "npm install"
	nix-shell dispatcher.nix --argstr action env --command "npm install bower"

generate-node: package.json
	nix-shell dispatcher.nix --argstr action env --command "npm2nix package.json node.nix"

just-run-it:
	`nix-build dispatcher.nix --argstr action package`/bin/nixui

package:
	nix-env -f ./dispatcher.nix -i --argstr action package

.PHONY: test develop build clean just-run-it
