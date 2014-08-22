var loopback = require("loopback");

module.exports = function(app) {
    var User = app.models.user;

    var createAndLogin = function(email, username, password, meta) {
        User.findOrCreate({
                where: {
                    username: username
                }
            }, {
                email: email,
                username: username,
                password: password,
                meta: meta
            },
            function(err, user) {
                if (err) {
                    console.log(err);
                }
                User.login({
                        email: email,
                        username: username,
                        password: password
                    },
                    function(err, accesstoken) {
                        if (err) console.log(username + ": " + err);
                        console.log(username + " token is: " + accesstoken.id + " for user id: " + user.id);
                    }
                );
            }
        );
    };

    // createAndLogin("ovca@email.xyz", "ovca", "ovca");
    createAndLogin("admin@email.xyz", "admin", "admin", {"profile": "/home/matej/.nix-profile", "file": "/home/matej/workarea/nixpkgs", "infoOnly": false});
    createAndLogin("demo@email.xyz", "demo", "demo", {"profile": "/home/matej/.nix-profile", "file": "/home/matej/workarea/nixpkgs", "infoOnly": true});
    // if (process.env.TEST_DATA) {}
};
