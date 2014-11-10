module.exports = function(server) {
    var router = server.loopback.Router();
    var AccessToken = server.loopback.getModel('AccessToken');
    var User = server.loopback.getModel('user');

    router.get('/dispatcher', function(req, res) {
        AccessToken.findForRequest(
            req, {
                cookies: ['access_token']
            },
            function(err, token) {
                if (token) {
                    res.send({loc: "/index.html"});
                } else {
                    res.send({loc: "/login.html"});
                }
            }
        );
    });

    router.post('/login', function(req, res) {
        User.login({
            username: req.param("username"),
            password: req.param("password")
        }, function(err, token) {
            if (token) {
                res.cookie('access_token', token.id, {
                    signed: true
                });
                res.send({loc: "/index.html"});
            } else {
                res.send({loc: "/login.html"});
            }
        });
    });

    router.get('/', function(req, res) {
        res.redirect('/login.html');
    });

    router.get('/users_list', function(req, res) {
        User.find({},
            function(err, arrayOfinstances) {
                users = [];
                for (var i in arrayOfinstances) {
                    users.push({username: arrayOfinstances[i].username, id: arrayOfinstances[i].id});
                }
                res.send({"users": users});
            }
        );
    });

    router.get('/user', function(req, res) {
        AccessToken.findForRequest(
            req, {
                cookies: ['access_token']
            },
            function(err, token) {
                if (token) {
                    User.findById(token.userId, function(err, user) {
                        if (user) {
                            res.send({"user": user.username});
                        } else {
                            res.send({"user": null});
                        }
                    });
                } else {
                    res.send({"user": null});
                }
            }
        );
    });

    server.use(router);
};
