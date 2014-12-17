var layout = {};

module.exports = layout;

layout.treenodes = undefined;

layout.init = function(polymer, d3) {
    polymer.graph_height = polymer.graph_width = 1500;

    var tree = d3.layout.tree()
        .nodeSize([0, 20]);

    layout.treenodes = undefined;

    return tree;
};

var recurse = function(position, object) {
    var r = {};

    if (object && object.optType) {
        // groups:
        // 1: up
        // 2: enterable
        // 3: end point (option)
        r = {
            name: position[position.length - 1],
            attribute: object.name,
            type: object.optType,
            group: 3,
            val: object.val,
            level: position.length
        };
    } else if (object !== undefined) {
        var childs = [];
        for (var key in object) {
            if (object.hasOwnProperty(key)) {
                var e = recurse(position.concat([key]), object[key]);
                if (e) {
                    childs.push(e);
                }
            }
        }
        r = {
            name: position[position.length - 1],
            attribute: position.join("."),
            group: 2,
            level: position.length,
            children: childs
        };
    }
    return r;
};


// Toggle children on click.
function toggle(d) {
    if (d.children) {
        d._children = d.children;
        d.children = null;
    } else if (d._children) {
        d.children = d._children;
        d._children = null;
    }
    updategraph(d);
}

var margin = {
        top: 30,
        right: 20,
        bottom: 30,
        left: 20
    },
    barMargin = {
        top: 2,
        right: 5,
        bottom: 2,
        left: 5
    },
    width,
    barWidth,
    duration = 400,
    barHeight = 20,
    height;

function getclass(d) {
    if (d.group === 3) {
        return "option" + (d.val?" value":"");
    } else if (d.group === 2) {
        // require('console').log(d.name + "-" + d.children?"entered":"enterable")
        return d.children?"entered":"enterable";
    } else {
        return "";
    }
}

function ensureOpenState(d, open) {
    if (open && d._children) {
        d.children = d._children;
        d._children = null;
    } else if (!open && d.children) {
        d._children = d.children;
        d.children = null;
    }
}

function normalizeExpandFun(root) {
    if (root.group === 2) {
        if (root.level === 0) {
            ensureOpenState(root, true);
        } else {
            ensureOpenState(root, false);
        }
        if (root._children) {
            for (var i in root._children) {
                normalizeExpandFun(root._children[i]);
            }
        } else if (root.children) {
            for (var j in root.children) {
                normalizeExpandFun(root.children[j]);
            }
        }
    }
}

function updategraph(source) {
    var tree = layout.graph;

    var diagonal = layout.d3.svg.diagonal()
        .projection(function(d) {
            return [d.y, d.x];
        });

    var i = 0;

    width = layout.$(layout.polymer.$.graphoptions).width() - margin.left - margin.right - barMargin.left - barMargin.right;
    barWidth = width * 0.8;

    // Compute the flattened node list. TODO use d3.layout.hierarchy.
    var nodes = layout.graph.nodes(layout.treenodes);
    // var nodes = layout.graph.nodes(normalizeExpandFun(layout.treenodes, normalizeExpand));
    height = Math.max(100, nodes.length * (barHeight+barMargin.top+barMargin.bottom) + margin.top + margin.bottom);

    // var height = Math.max(500, nodes.length * barHeight + margin.top + margin.bottom);

    layout.svg
        .transition()
        .duration(duration)
        .style("height", height + "px");

    layout.svg
        .style("padding-top", margin.top)
        .style("padding-left", margin.left)
        .attr("width", width + margin.left + margin.right)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // layout.d3.select(layout.polymer.$.graphoptions).transition()
    //     .duration(duration)
    //     .style("height", height + "px");

    // Compute the "layout".
    nodes.forEach(function(n, i) {
        n.x = i * (barHeight+barMargin.top+barMargin.bottom);
    });

    // Update the nodes
    var node = layout.svg.selectAll("g.node")
        .data(nodes, function(d) {
            return d.id || (d.id = ++i);
        });

    var nodeEnter = node.enter().append("g")
        .attr("class", "node")
        .attr("transform", function(d) {
            return "translate(" + source.y0 + "," + source.x0 + ")";
        })
        .style("opacity", 1e-6);

    // Enter any new nodes at the parent's previous position.
    nodeEnter.append("rect")
        .attr("y", -barHeight / 2)
        .attr("height", barHeight)
        .attr("width", barWidth)
        .on("click", toggle);

    layout.svg.selectAll("rect").attr("class", getclass);

    nodeEnter.append("text")
        .attr("dy", 3.5)
        .attr("dx", 5.5)
        .text(function(d) {
            return d.attribute;
        });

    // Transition nodes to their new position.
    nodeEnter.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")";
        })
        .style("opacity", 1);

    node.transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + d.y + "," + d.x + ")";
        })
        .style("opacity", 1)
        .select("rect");
        // .style("fill", color);

    // Transition exiting nodes to the parent's new position.
    node.exit().transition()
        .duration(duration)
        .attr("transform", function(d) {
            return "translate(" + source.y + "," + source.x + ")";
        })
        .style("opacity", 1e-6)
        .remove();

    // Update the links
    var link = layout.svg.selectAll("path.link")
        .data(tree.links(nodes), function(d) {
            return d.target.id;
        });

    // Enter any new links at the parent's previous position.
    link.enter().insert("path", "g")
        .attr("class", "link")
        .attr("d", function(d) {
            var o = {
                x: source.x0,
                y: source.y0
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition links to their new position.
    link.transition()
        .duration(duration)
        .attr("d", diagonal);

    // Transition exiting nodes to the parent's new position.
    link.exit().transition()
        .duration(duration)
        .attr("d", function(d) {
            var o = {
                x: source.x,
                y: source.y
            };
            return diagonal({
                source: o,
                target: o
            });
        })
        .remove();

    // Stash the old positions for transition.
    nodes.forEach(function(d) {
        d.x0 = d.x;
        d.y0 = d.y;
    });
}



layout.update = function(polymer, graph, options, d3, $) {
    polymer.graph_width = $(polymer.$.graphoptions).width();
    polymer.graph_height = $(polymer.$.panel).height() - 3;

    if (layout.treenodes === undefined) {
        layout.treenodes = recurse([], options);

        layout.graph = graph;
        layout.d3 = d3;
        layout.options = options;
        layout.polymer = polymer;
        layout.$ = $;

        // remove previous graph
        layout.d3.select(layout.polymer.$.graphoptions).select("svg").remove();

        layout.svg = layout.d3.select(layout.polymer.$.graphoptions).append("svg");
        layout.svg.attr("id", "svg");

        layout.treenodes.y0 = 0;
        layout.treenodes.x0 = 0;

        layout.svg
            .style("display", "none");
        updategraph(layout.treenodes);

        normalizeExpandFun(layout.treenodes);

        updategraph(layout.treenodes);
        layout.svg
            .style("display", "inline");

        d3.select(polymer.$.graphoptions).on('click',function (d,i) {
            var d3_target = d3.select(d3.event.target);
            var datum = d3_target.datum();
            if (datum) {
                var path = datum.attribute?datum.attribute.split("."):[];
                polymer.position = path;
                if (datum.group === 1) {
                    if (polymer.editPanelVisible) {
                        polymer.editPanelAnimate(false);
                    }
                } else if (datum.group === 2) {
                    if (polymer.editPanelVisible) {
                        polymer.editPanelAnimate(false);
                    }
                    d3_target.attr("class", getclass);
                } else {
                    // 3: end point
                    polymer.optionDetails = polymer.getOptionByPath(path);
                    polymer.optionDetails._path = path.join(".");
                    if (!polymer.editPanelVisible) {
                        polymer.editPanelAnimate(true);
                    }
                    return;
                }
                // polymer.startPoint.x = datum.x;
                // polymer.startPoint.y = datum.y;
                // polymer.query = null;
                // polymer.optionsRedraw();
            } else {
                if (polymer.editPanelVisible) {
                    polymer.editPanelAnimate(false);
                }
            }
        }.bind(polymer));
    }

    var root = layout.treenodes;
    for (var i in polymer.position) {
        if (root.children) {
            for (var j in root.children) {
                if (root.children[j].name === polymer.position[i]) {
                    root = root.children[j];
                    break;
                }
            }
        } else if (root._children) {
            for (var k in root._children) {
                if (root._children[k].name === polymer.position[i]) {
                    root = root._children[k];
                    break;
                }
            }
        }
        ensureOpenState(root, true);
    }
    updategraph(layout.treenodes);

    var nodes = polymer.shadowRoot.querySelector('#svg').getElementsByTagName('text');
    // var attribute = polymer.position.concat([polymer.positionName]).join('.');
    var attribute = polymer.position.join('.');
    for (var z in nodes) {
        if (nodes[z].innerHTML === attribute) {
            nodes[z].parentNode.scrollIntoView();
            break;
        }
    }
};
