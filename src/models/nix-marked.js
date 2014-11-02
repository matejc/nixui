module.exports = function(Marked, Base) {
    var loopback = require("loopback");
    var NixPackages = loopback.getModel('nix-packages');
    var User = loopback.getModel('user');

    Marked.beforeRemote('**', function(ctx, user, next) {
        if(ctx.req.accessToken) {
            next();
        } else {
            next(new Error('must be logged in'));
        }
    });

    Marked.set = function(attribute, mark, req, cb) {
        getPackageByAttribute(attribute, req, function(err, pkg) {
            var result = createMark(pkg, mark);
            if (result.error)
                cb(result.error);
            else
                cb(null, result);
        });
    };
    Marked.remoteMethod(
        'set', {
            accepts: [{
                arg: 'attribute',
                type: 'string'
            }, {
                arg: 'mark',
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
    Marked.afterRemote('set', function(ctx, unused, next) {
        var data = ctx.result.data;
        data.userId = ctx.req.accessToken.userId;

        Marked.findOrCreate({
                where: {
                    userId: data.userId,
                    attribute: data.attribute
                }
            },
            data,
            function(err, instance) {
                if (err) {
                    console.log(err);
                }
                if (!instance) {
                    next();
                    return;
                }
                instance.updateAttributes(data, function(err) {
                    if (err) {
                        console.log(err);
                    }
                    next();
                });
            }
        );
    });

    Marked.toggle = function(attribute, req, cb) {
        getPackageByAttribute(attribute, req, function(err, pkg) {
            getMarkObjByAttribute(attribute, req, function(err, markObj) {
                var result;
                if (err) {
                    console.log(err);
                }

                if (!markObj) {
                    result = createMark(pkg, (pkg.compare[0] == '=' ? 'uninstall' : 'install'));

                } else if (markObj.mark == "install") {
                    markObj.mark = "uninstall";
                    result = markObj;

                } else if (markObj.mark == "uninstall") {
                    markObj.mark = "install";
                    result = markObj;

                } else {
                    result = markObj;
                }

                if (result.error)
                    cb(result.error, result);
                else
                    cb(null, result);
            });
        });
    };
    Marked.remoteMethod(
        'toggle', {
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
    Marked.afterRemote('toggle', function(ctx, unused, next) {
        var data = ctx.result.data;
        data.userId = ctx.req.accessToken.userId;

        Marked.findOrCreate({
                where: {
                    userId: data.userId,
                    attribute: data.attribute
                }
            },
            data,
            function(err, instance) {
                if (err) {
                    console.log(err);
                }
                if (!instance) {
                    next();
                    return;
                }
                instance.updateAttribute("mark", data.mark, function(err) {
                    if (err) {
                        console.log(err);
                    }
                    next();
                });
            }
        );
    });

    Marked.get = function(attribute, req, cb) {
        getMarkObjByAttribute(attribute, req, function(err, markObj) {
            markObj = markObj ? markObj : {};
            if (err) {
                console.log(err);
                cb(err, markObj);
            } else {
                cb(null, markObj);
            }
        });
    };
    Marked.remoteMethod(
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

    Marked.delete = function(attribute, req, cb) {
        Marked.findOne({
                where: {
                    userId: req.accessToken.userId,
                    attribute: attribute
                }
            },
            function(err, instance) {
                if (!instance) {
                    cb("Marked.delete: Not an instance for attribute: "+attribute);
                    return;
                }
                Marked.deleteById(instance.id, function(err){
                    NixPackages.getNixInterface().killNixEnvByAttribute(instance.attribute);
                    cb(err);
                });
            }
        );
    };
    Marked.remoteMethod(
        'delete', {
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

    Marked.delete_all = function(req, cb) {
        Marked.find({
                where: {
                    userId: req.accessToken.userId
                }
            },
            function(err, arrayOfinstances) {
                for (var i in arrayOfinstances) {
                    Marked.deleteById(arrayOfinstances[i].id, function(err){
                        if (err) {
                            console.log(err);
                        }
                    });
                }
                NixPackages.getNixInterface().killNixEnvAll();
                cb();
            }
        );
    };
    Marked.remoteMethod(
        'delete_all', {
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

    Marked.delete_finished = function(req, cb) {
        Marked.find({
                where: {
                    userId: req.accessToken.userId,
                    state: "finish"
                }
            },
            function(err, arrayOfinstances) {
                for (var i in arrayOfinstances) {
                    Marked.deleteById(arrayOfinstances[i].id, function(err){
                        if (err) {
                            console.log(err);
                        }
                    });
                }
                cb();
            }
        );
    };
    Marked.remoteMethod(
        'delete_finished', {
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

    Marked.apply = function(attribute, req, cb) {
        getMarkObjByAttribute(attribute, req, function(err, markObj) {
            if (err) {
                console.log(err);
            }
            applyMark(
                markObj.attribute,
                markObj.name,
                markObj.mark,
                req,
                function(err){console.log(err);},
                function(){}
            );
            cb();
        });
    };
    Marked.remoteMethod(
        'apply', {
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

    Marked.apply_all = function(req, cb) {
        applyAll(req);
        cb();
    };
    Marked.remoteMethod(
        'apply_all', {
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

    Marked.list = function(req, cb) {
        Marked.find({
                where: {
                    userId: req.accessToken.userId
                }
            },
            function(err, arrayOfinstances) {
                cb(err, arrayOfinstances);
            }
        );
    };
    Marked.remoteMethod(
        'list', {
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

    var getPackageByAttribute = function(attribute, req, callback) {
        var handleResponse = function(err, resp) {
            if (err) {
                console.log(err);
            }
            callback(err, resp);
        };
        NixPackages.get(attribute, req, handleResponse);
    };
    var getMarkObjByAttribute = function(attribute, req, callback) {
        Marked.findOne({
                where: {
                    userId: req.accessToken.userId,
                    attribute: attribute
                }
            },
            callback
        );
    };
    var createMark = function(pkg, mark) {
        return {
            "attribute": pkg.attribute,
            "name": pkg.name,
            "mark": mark,
            "state": "wait"
        };
    };

    var getNextInLineMarkObj = function(req, cb) {
        Marked.findOne({
                where: {
                    userId: req.accessToken.userId,
                    state: "wait"
                }
            },
            function(err, instance) {
                cb(err, instance);
            }
        );
    };

    var applyAll = function(req) {
        var callback = function() {
            getNextInLineMarkObj(req, function(err, markObj){
                if (err) {
                    console.log(err);
                }
                if (markObj) {
                    applyMark(
                        markObj.attribute,
                        markObj.name,
                        markObj.mark,
                        req,
                        callback,
                        callback
                    );
                }
            });
        };
        getNextInLineMarkObj(req, function(err, markObj){
            if (err) {
                console.log(err);
            }
            if (markObj) {
                applyMark(
                    markObj.attribute,
                    markObj.name,
                    markObj.mark,
                    req,
                    callback,
                    callback
                );
            }
        });
    };


    var setMarkObjStateByAttribute = function(attribute, state, req, cb) {
        getMarkObjByAttribute(attribute, req, function(err, instance) {
            if (err) {
                console.log(err);
            }
            if (!instance) {
                cb("setMarkObjStateByAttribute: Not an instance for attribute: "+attribute);
                return;
            }
            instance.updateAttribute("state", state, function(err) {
                if (err) {
                    console.log(err);
                }
                cb(err);
            });
        });
    };
    var applyMark = function(attribute, name, mark, req, finish_callback, error_callback) {
        User.findById(req.accessToken.userId, function(err, user) {
            if (err) {
                console.log(err);
            }
            setMarkObjStateByAttribute(attribute, "start", req, function(){});

            var onFinish = function(data) {
                setMarkObjStateByAttribute(attribute, "finish", req, function(){});
                if (finish_callback)
                    finish_callback(data);
            };
            var onError = function(data) {
                setMarkObjStateByAttribute(attribute, "error", req, function(){});
                if (error_callback)
                    error_callback(data);
            };

            if (mark == "install") {
                NixPackages.getNixInterface().installPackage(attribute, user.meta.file, user.meta.profile, onFinish, onError);

            } else if (mark == "uninstall") {
                NixPackages.getNixInterface().uninstallPackage(attribute, name, user.meta.file, user.meta.profile, onFinish, onError);
            }
        });
    };

};
