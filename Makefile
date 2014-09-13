clean:
	@rm -f result bin/services-nixui-*
	@rm -rf ./node_modules/.bin
	@find ./bower_components/* -type d -print0 | xargs -0 -I {} rm -rf {}
	@find ./node_modules/* -type d -print0 | xargs -0 -I {} rm -rf {}

build: clean node bower services

services:
	@output_path=`nix-build --argstr action services`; test -d "$$output_path" && ln -sfv "$$output_path"/bin/services-nixui-* ./bin/

develop: services
	@nix-shell --argstr action env --command "./develop.sh"

test:
	@nix-shell --argstr action env --command "cd ./src && ../node_modules/.bin/mocha --reporter list"

bower: bower.json
	nix-shell --argstr action env --command "./node_modules/bower/bin/bower install"

node: package.json
	nix-shell --argstr action env --command "npm install"

just-run-it: clean bower node
	nix-shell --argstr action run

.PHONY: test develop build generate clean just-run-it
