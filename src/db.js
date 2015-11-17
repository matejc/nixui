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

var _ = require('underscore');

module.exports = DB;

var db;
function DB() {
    db = {};
}

var createId = function(id) {
    return "profile"+id;
}

DB.isEmpty = function(id) {
    id = createId(id);
    return _.isEmpty(db[id]);
};

DB.add = function(id, data) {
    id = createId(id);
    if (!_.isArray(db[id])) {
        db[id] = [];
    }
    db[id].push(data);
};

DB.get = function(id, data, callback) {
    id = createId(id);
    var i;
    for (i in db[id]) {
        var j;
        var found;
        for (j in data) {
            if (data[j] === db[id][i][j]) {
                found = true;
            } else {
                found = false;
                break;
            }
        }
        if (found) {
            callback(null, db[id][i]);
            return;
        }
    }
    callback("get: no match", {});
};

DB.filter = function(id, query, callback) {
    id = createId(id);
    if (!query) {
        callback(null, db[id]);
        return;
    }

    var installFilter = false;
    if (query[0] == "!" && query[1] == "i") {
        installFilter = true;
        query = query.substring(query[2] == " "?3:2);
    }

    var result = [];
    var i;
    for (i in db[id]) {
        var j;
        var found = false;
        for (j in db[id][i]) {
            if ( (new RegExp(query, "i")).test("" + db[id][i][j]) ) {
                found = true;
                break;
            }
        }
        if (found && ((installFilter && db[id][i]["compare"][0] == "=") || !installFilter)) {
            result.push(db[id][i]);
        }
    }
    callback(null, result);
};

DB.deleteAll = function() {
    db = {};
};

DB.delete = function(id) {
    id = createId(id);
    db[id] = [];
};
