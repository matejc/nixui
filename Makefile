
build: package.json
	nix-shell --command "./node_modules/webpack/bin/webpack.js --config=./webpack.config.js"

develop:
	nix-shell --command "node src/server.js"

debug:
	nix-shell --command "node debug src/server.js"

generate:
	npm2nix package.json package.nix

package.json: generate

.PHONY: build generate
