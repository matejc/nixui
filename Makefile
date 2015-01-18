clean:
	@rm -rf ./node_modules/.bin
	@rm -rf ./node_modules/*

build: clean node

develop:
	@nix-shell --argstr action env --command "nw ."

test:
	@nix-shell --argstr action env --command "cd ./src && ../node_modules/.bin/mocha --reporter list"

bower: bower.json
	@rm -rf ./bower_components/*
	nix-shell --argstr action env --command "./node_modules/bower/bin/bower install"

node: package.json
	nix-shell --argstr action env --command "npm install"
	nix-shell --argstr action env --command "npm install bower"

generate-node: package.json
	nix-shell --argstr action env --command "npm2nix --composition node-default.nix"

just-run-it:
	`nix-build --argstr action package`/bin/nixui

package:
	nix-env -f ./default.nix -i --argstr action package

.PHONY: test develop build clean just-run-it
