module.exports = function(Config, Base) {
    var loopback = require("loopback");
    var NixInterface = require("../interface");
    var User = loopback.getModel('user');

    Config.getNixInterface = function() {
        return NixInterface;
    }

    Config.beforeRemote('**', function(ctx, user, next) {
      if(ctx.req.accessToken) {
        next();
      } else {
        next(new Error('must be logged in'))
      }
    });

    Config.configurationnix = function(query, req, cb) {
        User.findById(req.accessToken.userId, function(err, user) {
            if (err) {
                console.log(err);
            }
            NixInterface.configurationNix(user.meta.file, function(data) {
                var result = JSON.parse(JSON.parse(data));  // query
                cb(null, result);
            }, function(err) {
                cb(err);
            });
        });
    };
    Config.remoteMethod(
        'configurationnix', {
            accepts: [{
                arg: 'query',
                type: 'string'
            },{
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

    Config.configurationnixtree = function(req, cb) {
        User.findById(req.accessToken.userId, function(err, user) {
            if (err) {
                console.log(err);
            }
            NixInterface.configurationNixTree(user.meta.file, function(data) {
                var result = JSON.parse(JSON.parse(data));
                cb(null, result);
            }, function(err) {
                cb(err);
            });
        });
    };
    Config.remoteMethod(
        'configurationnixtree', {
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


};
