
clean:
	rm node_packages_generated.nix \
		bower_components node_modules

generate:
	output_path=`nix-build --argstr action generate`; test -d "$$output_path" && ln -sfv "$$output_path"/* .

build: generate
	output_path=`nix-build --argstr action build`; test -d "$$output_path" && ln -sfv "$$output_path"/* .

develop: build
	nix-shell --command "node src/server.js -f /home/matej/workarea/nixpkgs/default.nix"

.PHONY: develop build generate clean
