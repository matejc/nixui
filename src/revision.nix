{ nixpkgs ? <nixpkgs> }:
let
  pkgs = import nixpkgs { };

  nixpkgsGitRev =
    pkgs.runCommand "nixpkgs-rev"
      { # Pointless to do this on a remote machine.
        preferLocalBuild = true;
        buildInputs = [ pkgs.git ];
      }
      ''
        n=$out
        touch $n
        echo -n "`git -C '${nixpkgs}' rev-parse HEAD || cat '${nixpkgs}/.git-revision' || cat '${nixpkgs}/nixpkgs/.git-revision' || echo master`" > "$n"
      '';
in
  nixpkgsGitRev
