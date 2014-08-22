var elasticsearch = require('elasticsearch');
var crypto = require('crypto');
var _ = require('underscore');

module.exports = NixES;

var esclient;
function NixES(settings) {
    esclient = new elasticsearch.Client(settings);
}

NixES.create = function(data, callback) {
    var shasum = crypto.createHash('sha1');
    shasum.update(data.attribute);
    shasum.update(""+data.userId);
    esclient.index({
        index: "packages",
        type: 'package',
        id: shasum.digest('hex'),
        body: {
            attribute: data.attribute,
            name: data.name,
            compare: data.compare,
            out: data.out,
            description: data.description,
            user: data.userId
        }
    }, callback);
    callback();
};

NixES.get = function(attribute, userId, callback) {
    var handleResponse = function(resp) {
        if (_.isEmpty(resp.hits.hits)) {
            callback(null, {});
        } else {
            callback(null, resp.hits.hits[0]._source);
        }
    };
    esclient.search({
        index: 'packages',
        type: 'package',
        size: 1,
        body: {
            query: {
                filtered: {
                    query: {
                        query_string: {
                            query: attribute,
                            fields: ["attribute"]
                        }
                    },
                    filter: {
                        term: {
                            user: ""+userId
                        }
                    }
                }
            },
        }
    }).then(handleResponse);
};

NixES.delete = function(userId, callback) {
    var onDeleted = function(err) {
        if (err) {
            console.warn("onDeleted: " + err);
        }
        callback();
    };
    esclient.indices.delete({
        index: "packages",
        type: 'package',
        body: {
            query: {
                match: {
                    user: userId
                }
            }
        }
    }, onDeleted);
};

NixES.filter = function(query, userId, callback) {
    var installed = false;
    var upgradable = false;
    var limit = 100;

    if (query.length >= 2 && query[0] == "!") {
        if (query[1] == "i") {
            installed = true;
            query = query.substring(3);
        } else if (query[1] == "u") {
            upgradable = true;
            query = query.substring(3);
        }
    }

    var handleResponse = function(resp) {
        var items = [];
        for (var i in resp.hits.hits) {
            items.push(resp.hits.hits[i]._source);
        }
        callback(null, items);
    };

    if (query === "") {
        query = "*";
    }

    if (installed || upgradable) {
        esclient.search({
            index: 'packages',
            type: 'package',
            size: limit,
            body: {
                query: {
                    filtered: {
                        query: {
                            query_string: {
                                query: query,
                                fields: ["attribute", "name", "description"]
                            }
                        },
                        filter: {
                            and: [{
                                regexp: {
                                    compare: installed ? "=@" : "[<\\>]@"
                                }},{
                                term: {
                                    user: ""+userId
                                }
                            }]
                        }
                    }
                }
            }
        }).then(handleResponse);
        return;
    }

    esclient.search({
        index: 'packages',
        type: 'package',
        size: limit,
            body: {
                query: {
                    filtered: {
                        query: {
                            query_string: {
                                query: query,
                                fields: ["attribute", "name", "description"]
                            }
                        },
                        filter: {
                            term: {
                                user: ""+userId
                            }
                        }
                    }
                }
            }
    }).then(handleResponse);
};

NixES.deleteAll = function(callback) {
    var onMappingDeleted = function(err) {
        if (err) {
            console.warn("onMappingDeleted: " + err);
        }
        callback();
    };
    var onDeleted = function(err) {
        if (err) {
            console.warn("onDeleted: " + err);
        }
        esclient.indices.deleteMapping({
            index: "packages",
            type: 'package'
        }, onMappingDeleted);
    };
    esclient.indices.delete({
        index: "packages",
        type: 'package'
    }, onDeleted);
};


NixES.createMappings = function (userId, callback) {
    esclient.indices.create({
        index: "packages",
        body: {
            mappings: {
                "package": {
                    "properties": {
                        "attribute": {
                            "type": "string"
                        },
                        "name": {
                            "type": "string"
                        },
                        "compare": {
                            "type": "string",
                            "index": "not_analyzed"
                        },
                        "out": {
                            "type": "string",
                            "index": "not_analyzed"
                        },
                        "description": {
                            "type": "string"
                        },
                        "user": {
                            "type": "string"
                        }
                    }
                }
            }
        }
    }, function(error, response) {
        if (error) {
            console.log(error);
        }

        callback();
    }, function(err) {
        console.log(err);
    });
}
