clean:
	@rm -rf ./node_modules/.bin
	@find ./bower_components/* -type d -print0 | xargs -0 -I {} rm -rf {}
	@find ./node_modules/* -type d -print0 | xargs -0 -I {} rm -rf {}

build: clean node bower

develop:
	@nix-shell --argstr action env --command "./develop.sh"

test:
	@nix-shell --argstr action env --command "cd ./src && ../node_modules/.bin/mocha --reporter list"

bower: bower.json
	nix-shell --argstr action env --command "./node_modules/bower/bin/bower install"

node: package.json
	nix-shell --argstr action env --command "npm install"

just-run-it: clean node bower
	nix-shell --argstr action run

.PHONY: test develop build clean just-run-it
