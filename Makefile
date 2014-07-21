
clean:
	rm node_packages_generated.nix \
		bower_components node_modules

generate:
	output_path=`nix-build --argstr action generate`; test -d "$$output_path" && ln -sfv "$$output_path"/* .

build: generate
	output_path=`nix-build --argstr action build`; test -d "$$output_path" && ln -sfv "$$output_path"/* .

develop: build
	postfix=`if [[ -n "$$NIX_MY_PKGS" ]]; then echo -n "-f $$NIX_MY_PKGS"; else echo -n ""; fi`; nix-shell --command "node src/server.js $$postfix"

.PHONY: develop build generate clean
