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
        }
    });
    return profile;
};

var NixInterface = require("../interface");

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
