var dirty = require('dirty');

var config = process.env.NIXUI_CONFIG ? require(process.env.NIXUI_CONFIG) : require("./config.json"),
    dbs = {},
    data = {};

module.exports = dbs;

dbs.profiles = function() {
    data.profiles = dirty();
    for (var i in config.profiles) {
        var obj = {
            "id": i,
            "name": config.profiles[i].name,
            "profile": config.profiles[i].profile,
            "file": config.profiles[i].file,
            "env": config.profiles[i].env
        };
        data.profiles.set(obj.name, obj);
    }
};

dbs.profiles.all = function() {
    var result = [];
    data.profiles.forEach(function(key, val) {
        result.push(val);
    });
    return result;
};

dbs.profiles.current = function(id) {
    if (id) {
        data.currentProfileId = id;
    }
    return data.currentProfileId;
};

dbs.profiles.get = function(profileId) {
    var id = (profileId===undefined) ? dbs.profiles.current() : profileId;
    var profile = null;
    data.profiles.forEach(function(key, val) {
        if (val.id == id) {
            profile = val;
            return false;
        }
    });
    return profile;
};



var NixInterface = require("../interface.js");

dbs.configs = function(profileId, attrs, cb) {
    var profile = dbs.profiles.get(profileId);
    NixInterface.configTree(attrs, profile.file, profile.env, function(data) {
        var result = JSON.parse(JSON.parse(data));
        data.configs = result;
        cb(null, result);
    }, function(err) {
        cb(err);
    });
};

dbs.configs.all = function() {
    return data.configs;
};



var db = require('../db');
data.packages = db();

dbs.packages = function() {
};

dbs.packages.delete = function(profileId, cb) {
    db.delete(profileId);
    cb(null);
};

dbs.packages.delete_all = function(profileId, cb) {
    db.deleteAll();
    cb(null);
};

dbs.packages.fill = function(profileId, cb) {
    var done_cb = function () {
        console.log("done for uid "+profileId);
        cb(null, {});
    };

    var callback = function(attribute, name, compare, out, description) {
        db.add(profileId, {
            attribute: attribute,
            name: name,
            compare: compare,
            out: out,
            description: description
        });
    };

    var profile = dbs.profiles.get(profileId);

    NixInterface.iteratePackages(
        profile.file,
        profile.profile,
        profile.env,
        callback,
        done_cb,
        function (err) {
            if (err) cb(err);
        }
    );
};

dbs.packages.filter = function(profileId, query, cb) {
    db.filter(profileId, query, function(err, data) {
        if (err) {
            console.log(err);
            cb(err);
        }
        cb(null, data.slice(0, 100));
    });
};

dbs.packages.info = function(profileId, attribute, cb) {
    if ((new RegExp(/^[\-\.\w]+$/)).test(attribute)) {
        var profile = dbs.profiles.get(profileId);

        NixInterface.packageInfo(attribute, profile.file, profile.env, function(data) {
            cb(null, JSON.parse(JSON.parse(data)));  // data is double json encoded :)
        }, function(data) {
            cb(null, data);
        });
    } else {
        cb("NOT_ATTRIBUTE");
    }
};

dbs.packages.get = function(profileId, attribute, cb) {
    db.get(profileId, {attribute: attribute}, function(err, data) {
        if (err) {
            console.log(err);
            cb(err);
        }
        cb(null, data);
    });
};

dbs.packages.reset = function(profileId, force, cb) {
    if (force) {
        dbs.packages.delete(profileId, function() {
            dbs.packages.fill(profileId, cb);
        });
        return;
    } else if (db.isEmpty(profileId)) {
        dbs.packages.fill(profileId, cb);
        return;
    }
    cb();
};



dbs.markeds = function() {
    data.markeds = dirty();
};

dbs.markeds.set = function(profileId, attribute, mark, cb) {
    getPackageByAttribute(profileId, attribute, function(err, pkg) {
        var result = createMark(pkg, mark);
        result.profileId = profileId;
        data.markeds.set(result.attribute+result.profileId, result);
        cb(null, result);
    });
};

dbs.markeds.get = function(profileId, attribute, cb) {
    getMarkObjByAttribute(profileId, attribute, function(err, markObj) {
        markObj = markObj ? markObj : {};
        if (err) {
            console.log(err);
            cb(err, markObj);
        } else {
            cb(null, markObj);
        }
    });
};

dbs.markeds.toggle = function(profileId, attribute, cb) {
    getPackageByAttribute(profileId, attribute, function(err, pkg) {
        if (err) {
            console.log(err);
        }
        getMarkObjByAttribute(profileId, attribute, function(err, markObj) {
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
            else {
                dbs.markeds.set(profileId, attribute, result.mark, cb);
            }
        });
    });
};

dbs.markeds.delete = function(profileId, attribute, cb) {
    data.markeds.rm(attribute+profileId);
    NixInterface.killNixEnvByAttribute(attribute);
    cb();
};

dbs.markeds.delete_all = function(profileId, cb) {
    data.markeds.forEach(function(key, val) {
        if (val.profileId == profileId) {
            data.markeds.rm(key);
        }
    });
    NixInterface.killNixEnvAll();
    cb();
};

dbs.markeds.delete_finished = function(profileId, cb) {
    data.markeds.forEach(function(key, val) {
        if (val.profileId == profileId && val.state === "finish") {
            data.markeds.rm(key);
        }
    });
    cb();
};

dbs.markeds.apply = function(profileId, attribute, cb) {
    getMarkObjByAttribute(profileId, attribute, function(err, markObj) {
        if (err) {
            console.log(err);
        }
        applyMark(
            profileId,
            markObj.attribute,
            markObj.name,
            markObj.mark,
            function(err){console.log(err);},
            function(){}
        );
        cb();
    });
};

dbs.markeds.apply_all = function(profileId, cb) {
    applyAll(profileId);
    cb();
};

dbs.markeds.list = function(profileId, cb) {
    var arrayOfInstances = [];
    data.markeds.forEach(function(key, val) {
        arrayOfInstances.push(val);
    });
    cb(null, arrayOfInstances);
};

var getPackageByAttribute = function(profileId, attribute, callback) {
    var handleResponse = function(err, resp) {
        if (err) {
            console.log(err);
        }
        callback(err, resp);
    };
    dbs.packages.get(profileId, attribute, handleResponse);
};
var getMarkObjByAttribute = function(profileId, attribute, callback) {
    var mark = null;
    data.markeds.forEach(function(key, val) {
        if (key === attribute+profileId) {
            mark = val;
            return false;
        }
    });
    callback(null, mark);
};
var createMark = function(pkg, mark) {
    return {
        "attribute": pkg.attribute,
        "name": pkg.name,
        "mark": mark,
        "state": "wait"
    };
};
var getNextInLineMarkObj = function(profileId, cb) {
    var mark = null;
    data.markeds.forEach(function(key, val) {
        if (val.profileId == profileId && val.state === "wait") {
            mark = val;
            return false;
        }
    });
    cb(null, mark);
};
var applyAll = function(profileId) {
    var callback = function() {
        getNextInLineMarkObj(profileId, function(err, markObj){
            if (err) {
                console.log(err);
            }
            if (markObj) {
                applyMark(
                    profileId,
                    markObj.attribute,
                    markObj.name,
                    markObj.mark,
                    callback,
                    callback
                );
            }
        });
    };
    getNextInLineMarkObj(profileId, function(err, markObj){
        if (err) {
            console.log(err);
        }
        if (markObj) {
            applyMark(
                profileId,
                markObj.attribute,
                markObj.name,
                markObj.mark,
                callback,
                callback
            );
        }
    });
};
var setMarkObjStateByAttribute = function(profileId, attribute, state, cb) {
    getMarkObjByAttribute(profileId, attribute, function(err, instance) {
        if (err) {
            console.log(err);
        }
        if (!instance) {
            cb("setMarkObjStateByAttribute: Not an instance for attribute: "+attribute);
            return;
        }
        instance.state = state;
        cb();
    });
};
var applyMark = function(profileId, attribute, name, mark, finish_callback, error_callback) {
    var profile = dbs.profiles.get(profileId);
    setMarkObjStateByAttribute(profileId, attribute, "start", function(){});

    var onFinish = function(data) {
        setMarkObjStateByAttribute(profileId, attribute, "finish", function(){});
        if (finish_callback)
            finish_callback(data);
    };
    var onError = function(data) {
        setMarkObjStateByAttribute(profileId, attribute, "error", function(){});
        if (error_callback)
            error_callback(data);
    };

    if (mark == "install") {
        NixInterface.installPackage(attribute, profile.file, profile.profile, profile.env, onFinish, onError);

    } else if (mark == "uninstall") {
        NixInterface.uninstallPackage(attribute, name, profile.file, profile.profile, profile.env, onFinish, onError);
    }
};
