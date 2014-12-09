clean:
	@rm -rf ./node_modules/.bin
	@rm -rf ./node_modules/*

build: clean node

develop:
	@nix-shell --argstr action env --command "./develop.sh"

test:
	@nix-shell --argstr action env --command "cd ./src && ../node_modules/.bin/mocha --reporter list"

bower: bower.json
	@find ./bower_components/* -type d -print0 | xargs -0 -I {} rm -rf {}
	nix-shell --argstr action env --command "./node_modules/bower/bin/bower install"

node: package.json
	nix-shell --argstr action env --command "npm install"

generate-node: package.json
	nix-shell --argstr action env --command "npm2nix package.json node_modules.nix"

just-run-it: clean node
	nix-shell --argstr action run

package:
	nix-shell --argstr action package

.PHONY: test develop build clean just-run-it
