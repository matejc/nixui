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
