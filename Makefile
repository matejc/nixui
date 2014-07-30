
clean:
	rm node_packages_generated.nix \
		bower_components node_modules result

generate:
	@output_path=`nix-build --argstr action generate`; test -d "$$output_path" && ln -sfv "$$output_path"/* .

build: generate
	@output_path=`nix-build --argstr action build`; test -d "$$output_path" && ln -sfv "$$output_path"/* .

develop: build
	@echo "Development credentials - U: bob, P: secret"
	@postfix=`if [[ -n "$$NIX_MY_PKGS" ]]; then echo -n "-f $$NIX_MY_PKGS"; else echo -n ""; fi`; nix-shell --command "node src/server.js $$postfix --login bob --sha256 2bb80d537b1da3e38bd30361aa855686bde0eacd7162fef6a25fe97bf527a25b"

test: build
	@nix-shell --command "cd ./src && ../node_modules/.bin/mocha --reporter list"

.PHONY: test develop build generate clean
