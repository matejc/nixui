/*
Copyright 2014-2015 Matej Cotman

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

var fs = require('fs');
var path = require('path');
var NixInterface = require("./interface.js");
var nedb = require('nedb');

if (process.env.NIXUI_DEBUG !== undefined) {
    var gui = window.require('nw.gui');
    gui.Window.get().showDevTools();
}

var config = process.env.NIXUI_CONFIG ? require(process.env.NIXUI_CONFIG) : require("./config.json"),
    dbs = {},
    data = {},
    dataDir = config.dataDir ? config.dataDir : '/tmp',
    env = {};

env.NIX_PATH = config.NIX_PATH ? config.NIX_PATH : process.env.NIX_PATH;
env.NIX_REMOTE = process.env.NIX_REMOTE;
env.HOME = process.env.HOME;

console.log("Environment:", env)

module.exports = dbs;


// profiles - nix environments/profiles

dbs.profiles = function() {
    var profiles = NixInterface.getProfiles(config.profilePaths.concat([path.join(process.env.HOME, '.nix-profile')]));
    data.profiles = new nedb();
    profiles.forEach(function(el) {
        data.profiles.insert(el, function(err) {
            if (err) {
                console.log(err);
            }
        });
    });
};

dbs.profiles.all = function(cb) {
    data.profiles.find({}).sort({name: 1}).exec(cb);
};

dbs.profiles.current = function(id) {
    if (id) {
        data.currentProfileId = id;
    }
    if (data.currentProfileId === undefined) {
        data.currentProfileId = '-1';
    }
    return data.currentProfileId;
};

dbs.profiles.get = function(profileId, cb) {
    var id = (profileId===undefined) ? dbs.profiles.current() : profileId;
    if (id === '-1') {
        cb(null, {id: "-1", name: "None"});
    } else {
        data.profiles.findOne({id: id}, cb);
    }
};


// configurations - nix configuration files

dbs.configurations = function() {
    data.configurations = new nedb({
        filename: path.join(dataDir, 'configurations.nedb'),
        autoload: true
    });
    var configurations = config.configurations ? config.configurations : ['/etc/nixos/configuration.nix'];
    configurations.forEach(function(cfg) {
        if (fs.statSync(cfg).isFile()) {
            dbs.configurations.set(cfg, function(err) {
                if (err) {
                    console.log(err);
                }
            });
        }
    });
};

dbs.configurations.all = function(cb) {
    data.configurations.find({}, cb);
};

dbs.configurations.current = function(id) {
    if (id) {
        data.currentConfigurationId = id;
    }
    if (data.currentConfigurationId === undefined) {
        data.currentConfigurationId = '-1';
    }
    return data.currentConfigurationId;
};

dbs.configurations.get = function(configurationId, cb) {
    var id = (configurationId===undefined) ? dbs.configurations.current() : configurationId;
    if (id == '-1') {
        cb(null, {path: "None", _id: "-1"});
    } else {
        data.configurations.findOne({_id: id}, cb);
    }
};

dbs.configurations.set = function(configuration, cb) {
    if (fs.existsSync(configuration) && fs.statSync(configuration).isFile()) {
        data.configurations.update({path: configuration}, {path: configuration}, {upsert: true}, function(err, numReplaced, docs){
            data.configurations.findOne({path: configuration}, cb);
        }.bind(data));
    } else {
        cb("Configuration file does not exist");
    }
};


// configs - config options

dbs.configs = function(configurationId, attrs, cb) {
    var configurationnix, path, optionsWithVal;
    if (configurationId === null || configurationId === '-1') {
        configurationnix = null;
        path = null;
        optionsWithVal = false;
    } else {
        path = attrs;
        optionsWithVal = true;
    }

    dbs.configurations.get(configurationId, function(err, o) {
        if (configurationId !== null && o) {
            configurationnix = o.path;
        }
        NixInterface.options(configurationnix, path, optionsWithVal, undefined, env, function(out) {
            var result = JSON.parse(out);
            data.configs = new nedb();
            data.configslist = result;
            data.configs.ensureIndex({fieldName: 'name', unique: true}, function(err) {
                if (err) console.error(err);
                fillConfigs(result);
                dbs.configs_isSet = true;
                cb(null, result);
            });
        }, function(err) {
            cb(err);
        });
    });
};

dbs.configs.list = function() {
    return data.configslist;
};

dbs.configs.all = function(cb) {
    if (!dbs.configs_isSet) {
        return cb(null, []);
    }
    data.configs.find({}, cb);
};

dbs.configs.filter = function(query, cb) {
    if (!dbs.configs_isSet) {
        return cb(null, []);
    }
    var requery = new RegExp(query, 'i');
    var refind = {$or: [{name: {$regex: requery}}, {description: {$regex: requery}}, {val: {$regex: requery}}]};
    data.configs.find(refind).sort({name: 1}).limit(100).exec(function(err, data) {
        if (err) {
            console.error(err);
            cb(err);
        }
        cb(null, data);
    });
};

// dbs.configs.get = function(attrs, cb) {
//     dbs.configurations.get(undefined, function(err, o) {
//         NixInterface.get(o.path, attrs, undefined, env, function(result) {
//             cb(null, result);
//         }, function(err) {
//             cb(err);
//         });
//     });
// };

dbs.configs.get = function(attrs, cb) {
    if (!dbs.configs_isSet) {
        return cb(null, {});
    }
    data.configs.findOne({name: attrs}, function(err, data) {
        if (err) {
            console.error(err);
            cb(err);
        }
        cb(null, data);
    });
};

dbs.configs.toNixString = function(json, cb) {
    if (typeof json === 'undefined') {
        return cb(null, '');
    }
    NixInterface.toNixString(json, env, function(result) {
        cb(null, result);
    }, function(err) {
        cb(err);
    });
};



// packages

data.packages = {};

dbs.packages = function() {
};

dbs.packages.delete = function(profileId, cb) {
    if (data.packages[profileId] === undefined) {
        cb();
    } else {
        data.packages[profileId].remove({}, { multi: true }, function(err){
            data.packages[profileId] = undefined;
            cb(err);
        });
    }
};

dbs.packages.delete_all = function(profileId, cb) {
    var errfun = function(err) {
        if (err) console.log(err);
    };
    for (var i in data.packages) {
        data.packages[i].remove({}, { multi: true }, errfun);
    }
    cb(null); // not very usefull
};

dbs.packages.fill = function(profileId, cb) {
    if (data.packages[profileId] !== undefined) {
        cb(null, {});
        return;
    }
    data.packages[profileId] = new nedb();
    data.packages[profileId].ensureIndex({fieldName: 'attribute', unique: true}, function(err) {
        if (err) console.log(err);


        dbs.profiles.get(profileId, function(err, profile) {
            if (err) console.log(err);

            var done_cb = function () {
                console.log("done for profile id "+profileId);
                cb(null, {});
            };

            var callback = function(attribute, name, compare, description) {
                data.packages[profileId].insert({
                    attribute: attribute,
                    name: name,
                    compare: compare,
                    description: description
                }, function(err) {
                    if (err) console.log(err);
                });
            };

            NixInterface.iteratePackages(
                undefined,
                profile.path,
                env,
                callback,
                done_cb,
                function (err) {
                    if (err) cb(err);
                }
            );
        });
    });

};

dbs.packages.filter = function(profileId, query, cb) {
    var installFilter = false;
    if (query[0] == "!" && query[1] == "i") {
        query = query.substring(query[2] == " "?3:2);
        installFilter = true;
    }
    var requery = new RegExp(query, 'i');
    var refind = {$or: [{attribute: {$regex: requery}}, {description: {$regex: requery}}, {name: {$regex: requery}}]};
    if (installFilter) {
        refind.compare = {$regex: /^\=.*/};
    }
    data.packages[profileId].find(refind).sort({name: 1}).limit(100).exec(function(err, data) {
        if (err) {
            console.log(err);
            cb(err);
        }
        cb(null, data);
    });
};

dbs.packages.info = function(profileId, attribute, cb) {
    if ((new RegExp(/^[\-\.\w]+$/)).test(attribute)) {

        NixInterface.packageInfo(attribute, undefined, env, function(data) {
            cb(null, JSON.parse(JSON.parse(data)));  // data is double json encoded :)
        }, function(data) {
            cb(null, data);
        });
    } else {
        cb("NOT_ATTRIBUTE");
    }
};

dbs.packages.get = function(profileId, attribute, cb) {
    data.packages[profileId].findOne({attribute: attribute}, function(err, data) {
        if (err) {
            console.log(err);
            cb(err);
        }
        cb(null, data);
    });
};

dbs.packages.reset = function(profileId, cb) {
    dbs.packages.delete(profileId, function(err) {
        if (err) console.log(err);
        dbs.packages.fill(profileId, cb);
    });
};


// markeds - marked packages for install/uninstall

dbs.markeds = function() {
    data.markeds = {};
};

dbs.markeds.set = function(profileId, attribute, mark, cb) {
    getPackageByAttribute(profileId, attribute, function(err, pkg) {
        var result = createMark(pkg, mark);
        result.profileId = profileId;

        if (!data.markeds[profileId]) {
            data.markeds[profileId] = new nedb();
            data.markeds[profileId].ensureIndex({fieldName: 'attribute', unique: true}, function(err) {
                if (err) console.log(err);
                data.markeds[profileId].insert(result, cb);
            });
        } else {
            data.markeds[profileId].update({attribute: result.attribute}, result, {upsert: true}, function(err, numReplaced, data){
                cb(err, result);
            });
        }
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
    if (!data.markeds[profileId]) { cb(); return; }
    data.markeds[profileId].remove({attribute: attribute}, {}, function(err) {
        if (err) console.log(err);
        NixInterface.killNixEnvByAttribute(attribute);
        cb(err);
    });
};

dbs.markeds.delete_all = function(profileId, cb) {
    if (!data.markeds[profileId]) { cb(); return; }
    data.markeds[profileId].remove({}, { multi: true }, function(err) {
        if (err) console.log(err);
        NixInterface.killNixEnvAll();
        cb(err);
    });
};

dbs.markeds.delete_finished = function(profileId, cb) {
    if (!data.markeds[profileId]) { cb(); return; }
    data.markeds[profileId].remove({state: 'finish'}, { multi: true }, function(err) {
        if (err) console.log(err);
        cb(err);
    });
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
    if (data.markeds[profileId]) {
        data.markeds[profileId].find({}, cb);
    } else {
        cb(undefined, []);
    }
};


// actions - views supported

dbs.actions = function() {
    data.actions = [
        { id: 0, label: "Package Manager", url: "package-manager.html", tabindex: '1' },
        { id: 1, label: "Configuration Options", url: "configuration.html", tabindex: '2' },
        { id: 2, label: "Planet", url: "planet.html", tabindex: '3' }
    ];
};

dbs.actions.all = function() {
    return data.actions;
};

dbs.actions.get = function(id) {
    for (var i in data.actions) {
        if (id == data.actions[i].id) {
            return data.actions[i];
        }
    }
};

dbs.actions.set = function(id) {
    data.action = data.actions[id];
};

dbs.actions.current = function() {
    return data.action;
};


// meta - meta data

dbs.meta = function() {
    data.meta = { package: require('../package.json'), config: config };
};

dbs.meta.all = function() {
    return data.meta;
};


// helper functions

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
    if (data.markeds[profileId]) {
        data.markeds[profileId].findOne({attribute: attribute}, callback);
    } else {
        callback();
    }
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
    if (!data.markeds[profileId]) { cb(); return; }
    data.markeds[profileId].findOne({state: 'wait'}, cb);
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
        data.markeds[profileId].update({_id: instance._id}, instance, {}, function(err, numReplaced, data){
            cb(err, data);
        });
    });
};
var applyMark = function(profileId, attribute, name, mark, finish_callback, error_callback) {
    dbs.profiles.get(profileId, function(err, profile){
        if (err) {
            console.log(err);
        }

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
            NixInterface.installPackage(attribute, undefined, profile.path, env, onFinish, onError);

        } else if (mark == "uninstall") {
            NixInterface.uninstallPackage(attribute, name, undefined, profile.path, env, onFinish, onError);
        }
    });
};

var recurseConfigs = function(position, object) {
    if (object && object.optType) {
        data.configs.update({name: position.join(".")}, object, {upsert: true});
    } else {
        for (var key in object) {
            if (object.hasOwnProperty(key)){
                recurseConfigs(position.concat([key]), object[key]);
            }
        }
    }
};

var fillConfigs = function(object) {
    for (var key in object) {
        if (object.hasOwnProperty(key)){
            data.configs.update({name: key}, object[key], {upsert: true});
        }
    }
};
