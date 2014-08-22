module.exports = function(server) {
    // Install a `/` route that returns server status
    var router = server.loopback.Router();
    var AccessToken = server.loopback.getModel('AccessToken');
    var NixPackages = server.loopback.getModel('nix-packages');
    var User = server.loopback.getModel('user');
    router.get('/status', server.loopback.status());
    // router.get('/', server.loopback.static(__dirname + '/../public/index.html'));
    router.get('/dispatcher', function(req, res) {
        AccessToken.findForRequest(
            req, {
                params: ['access_token'],
                cookies: ['access_token']
            },
            function(err, token) {
                if (err) {
                    console.log(err);
                    res.send({loc: "/login.html"});
                } else {
                    res.send({loc: "/index.html"});
                }
            }
        );
    });

    router.post('/login', function(req, res) {
        User.login({
            username: req.param("username"),
            password: req.param("password")
        }, function(err, token) {
            res.cookie('access_token', token.id, {
                signed: true
            });
            if (err) {
                console.log(err);
                res.send({loc: "/login.html"});
            } else {
                res.send({loc: "/index.html"});
            }
        });
    });
    server.use(router);
};
