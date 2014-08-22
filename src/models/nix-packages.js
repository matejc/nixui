module.exports = function(Packages, Base) {
    var loopback = require("loopback");
    var NixInterface = require("../interface");
    var User = loopback.getModel('user');
    var NixES = require('../elasticsearch');
    NixES({host: "localhost:9200"});

    Packages.getNixInterface = function() {
        return NixInterface;
    }

    Packages.info = function(attribute, req, cb) {
        if ((new RegExp(/^[\-\.\w]+$/)).test(attribute)) {
            User.findById(req.accessToken.userId, function(err, user) {
                if (err) {
                    console.log(err);
                }
                NixInterface.packageInfo(attribute, user.meta.file, function(data) {
                    cb(null, JSON.parse(JSON.parse(data)));  // data is double json encoded :)
                }, function(data) {
                    cb(data);
                });
            });
        } else {
            cb("NOT_ATTRIBUTE");
        }
    };
    Packages.remoteMethod(
        'info', {
            accepts: [{
                arg: 'attribute',
                type: 'string'
            }, {
                arg: 'req',
                type: 'object',
                'http': {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'data',
                type: 'object'
            },
            http: {
                verb: 'get'
            }
        }
    );

    Packages.delete = function(req, cb) {
        User.findById(req.accessToken.userId, function(err, user) {
            if (err) {
                cb(err);
            }
            NixES.delete(user.id, function(err){
                if (err) {
                    cb(err);
                }
                cb(null, {});
            });
        });
    };
    Packages.remoteMethod(
        'delete', {
            accepts: [{
                arg: 'req',
                type: 'object',
                'http': {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'data',
                type: 'object'
            },
            http: {
                verb: 'get'
            }
        }
    );
    Packages.delete_all = function(cb) {
        NixES.deleteAll(function(err){
            if (err) {
                cb(err);
                return;
            }
            cb(null);
        });
    };
    Packages.remoteMethod(
        'delete_all', {
            http: {
                verb: 'get'
            }
        }
    );

    Packages.fill = function(req, cb) {
        User.findById(req.accessToken.userId, function(err, user) {
            if (err) {
                cb(err);
                return;
            }
            NixES.createMappings(user.id, function() {
                var done_cb = function () {
                    console.log("done for uid "+user.id);
                    cb(null, {});
                };

                var callback = function(attribute, name, compare, out, description) {
                    NixES.create({
                        attribute: attribute,
                        name: name,
                        compare: compare,
                        out: out,
                        description: description,
                        userId: user.id
                    }, function() {});
                }

                NixInterface.iteratePackages(
                    user.meta.file,
                    user.meta.profile,
                    callback,
                    done_cb,
                    function (err) {
                        if (err) {
                            cb(error);
                        }
                    }
                );
            });

        });
    };
    Packages.remoteMethod(
        'fill', {
            accepts: [{
                arg: 'req',
                type: 'object',
                'http': {
                    source: 'req'
                }
            }],
            http: {
                verb: 'get'
            }
        }
    );

    Packages.get = function(attribute, req, cb) {
        User.findById(req.accessToken.userId, function(err, user) {
            if (err) {
                console.log(err);
            }
            NixES.get(attribute, user.id, function(err, data) {
                if (err) {
                    console.log(err);
                    cb(err);
                }
                cb(null, data);
            });
        });
    };
    Packages.remoteMethod(
        'get', {
            accepts: [{
                arg: 'attribute',
                type: 'string'
            }, {
                arg: 'req',
                type: 'object',
                'http': {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'data',
                type: 'object'
            },
            http: {
                verb: 'get'
            }
        }
    );



    Packages.filter = function(query, req, cb) {
        User.findById(req.accessToken.userId, function(err, user) {
            if (err) {
                console.log(err);
            }
            NixES.filter(query, user.id, function(err, data) {
                if (err) {
                    console.log(err);
                    cb(err);
                }
                cb(null, data);
            });
        });
    };
    Packages.remoteMethod(
        'filter', {
            accepts: [{
                arg: 'query',
                type: 'string'
            }, {
                arg: 'req',
                type: 'object',
                'http': {
                    source: 'req'
                }
            }],
            returns: {
                arg: 'data',
                type: 'object'
            },
            http: {
                verb: 'get'
            }
        }
    );

};
