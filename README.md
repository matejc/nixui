NixUI
=====

NodeWebkit UI for Nix package manager written with Polymer


Requirement
-----------

- Nix package manager
- nwjs
- node (for development)


Just Run It
-----------

To try it out, run the following command:

```
$ make just-run-it
```

and wait for the node-webkit window to appear.


config.json
-----------

Location: `./src/config.json`


Default:

```
{
    "profilePaths": ["/nix/var/nix/profiles"],
    "dataDir": "/tmp",
    "configurations": ["/etc/nixos/configuration.nix"],
    "NIX_PATH": "/nix/var/nix/profiles/per-user/root/channels/nixos:nixpkgs=/etc/nixos/nixpkgs:nixos-config=/etc/nixos/configuration.nix"
}
```


Explanation:

 - `profilePaths`: array of paths to search for profiles
 - `dataDir`: for persistant database files
 - `configurations`: array of file paths to your configuration files
 - `NIX_PATH`: same as `NIX_PATH` environment variable, if you use `nix-channel` to update then leave it as is


Key/mouse bindings
------------------

- `Tab`: circle through list items and fields
- `Enter` or `left click`: open panel
- `ESC` or `right click`: close panel
- `/`: focus the search field


Development
-----------

Build development environment

```
$ make build
```

Run UI

```
$ make develop
```

Development - The classical way
-------------------------------

Install node dependencies

```
$ npm install
```


Run it
```
$ nw .
```


Screenshots
-----------

(from version 0.1.2)

![Configuration Options](img/configoptions.jpg)
![Packages](img/packages.jpg)
![Package Information](img/package.jpg)
