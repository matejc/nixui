var loopback = require("loopback");

module.exports = function(app) {
    var User = app.models.user;

    var createAndLogin = function(email, username, password, meta, doNotLogin) {
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
                if (doNotLogin) {
                    return;
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

    for (var i in app.settings.users) {
        var user = app.settings.users[i];
        createAndLogin(user.email, user.username, user.password, user.meta, true);
    }

};
