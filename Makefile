
build:
	nix-shell --command "./node_modules/webpack/bin/webpack.js --config=./webpack.config.js"

develop:
	nix-shell --command "node src/server.js -f /home/matej/workarea/nixpkgs/default.nix"

debug:
	nix-shell --command "node debug src/server.js"

bower:
	rm -rf ./bower_components
	bower install

generate:
	npm2nix package.json package.nix

package.json: generate

.PHONY: develop bower build generate
