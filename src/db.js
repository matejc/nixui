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
