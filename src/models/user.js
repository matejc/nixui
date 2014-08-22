module.exports = function(User, Base) {
    var loopback = require("loopback");

    User.list = function(cb) {
        User.find({},
            function(err, arrayOfinstances) {
                users = [];
                for (var i in arrayOfinstances) {
                    users.push({username: arrayOfinstances[i].username, id: arrayOfinstances[i].id});
                }
                cb(err, users);
            }
        );
    };
    User.remoteMethod(
        'list', {
            returns: {
                arg: 'users',
                type: 'object'
            },
            http: {
                verb: 'get'
            }
        }
    );

};
