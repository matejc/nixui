module.exports = function(Packages, Base) {
    var loopback = require("loopback");
    var NixInterface = require("../interface");
    var User = loopback.getModel('user');
    var db = require('../db');

    Packages.getApp(function(err, app){
        db();
    });

    Packages.getNixInterface = function() {
        return NixInterface;
    };

    Packages.beforeRemote('**', function(ctx, user, next) {
        if(ctx.req.accessToken) {
            next();
        } else {
            next(new Error('must be logged in'));
        }
    });

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
            db.delete(user.id);
            cb(null);
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
        db.deleteAll();
        cb(null);
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
            var done_cb = function () {
                console.log("done for uid "+user.id);
                cb(null, {});
            };

            var callback = function(attribute, name, compare, out, description) {
                db.add(user.id, {
                    attribute: attribute,
                    name: name,
                    compare: compare,
                    out: out,
                    description: description
                });
            };

            NixInterface.iteratePackages(
                user.meta.file,
                user.meta.profile,
                callback,
                done_cb,
                function (err) {
                    if (err) {
                        cb(err);
                    }
                }
            );

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
            db.get(user.id, {attribute: attribute}, function(err, data) {
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
            db.filter(user.id, query, function(err, data) {
                if (err) {
                    console.log(err);
                    cb(err);
                }
                cb(null, data.slice(0, 100));
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

    Packages.reset = function(force, req, cb) {
        User.findById(req.accessToken.userId, function(err, user) {
            if (err) {
                console.log(err);
            }
            if (force) {
                Packages.delete(req, function() {
                    Packages.fill(req, cb);
                });
                return;
            } else if (db.isEmpty(user.id)) {
                Packages.fill(req, cb);
                return;
            }
            cb();
        });
    };
    Packages.remoteMethod(
        'reset', {
            accepts: [{
                arg: 'force',
                type: 'boolean'
            }, {
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


};
