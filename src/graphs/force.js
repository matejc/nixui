var layout = {};

module.exports = layout;

layout.init = function(polymer, d3) {
    var force = d3.layout.force();
    polymer.graph_height = polymer.graph_width = 1500;



    return force;
};

layout.update = function(polymer, graph, options, d3, $) {
    var json = {
      "nodes":[],
      "links":[]
    };

    var root_name, root_option = polymer.options;
    if (polymer.position.length > 0) {
        root_name = polymer.position[polymer.position.length-1];
        for (var i in polymer.position) {
            if (polymer.position[i] === "") {
                continue;
            }
            try {
                root_option = root_option[polymer.position[i]];
            } catch (ex) {
                console.log("Not found option: " + name);
            }
        }
    } else {
        root_name = "";
    }

    // groups:
    // 1: up
    // 2: enterable
    // 3: end point (option)
    json.nodes.push({"name": root_name, "group":1});
    var j = 1;
    for (var key in root_option) {
        if (!polymer.query || (new RegExp(polymer.query, "i")).test("" + key)) {
            if (root_option[key].optType) {
                json.nodes.push({"name": key, "group": 3, "type": root_option[key].optType, "val": root_option[key].val});
            } else {
                json.nodes.push({"name": key, "group": 2, "type": undefined, "val": root_option[key].val});
            }
            json.links.push({"source": j++, "target": 0, "value": 1});
        }
    }

    // polymer.graph_width = $(polymer.$.graphoptions).width();
    // polymer.graph_height = $(polymer.$.panel).height() - 3;
    if ($(polymer.$.panel).height() > polymer.graph_height) {
        polymer.graph_height = $(polymer.$.panel).height();
    }
    if ($(polymer.$.panel).width() > polymer.graph_width) {
        polymer.graph_width = $(polymer.$.panel).width();
    }

    if (polymer.editPanelVisible) {
        polymer.graph_width = polymer.graph_width * 0.66;
    }

    polymer.startPoint.x = polymer.graph_width / 2;
    polymer.startPoint.y = polymer.graph_height / 2;

    json.nodes.forEach(function(d, i) {
      if (i === 0) {
        d.x = polymer.startPoint.x;
        d.y = polymer.startPoint.y;
      }
    }.bind(polymer));

    // remove previous graph
    d3.select(polymer.$.graphoptions).select("svg").remove();

    d3.select(polymer.$.graphoptions).append("svg");
    var svg = d3.select(polymer.$.graphoptions).select("svg");

    svg.attr("width", polymer.graph_width)
        .attr("height", polymer.graph_height);

    polymer.$.panel.scrollTop = ( polymer.graph_height - $(polymer.$.panel).height() ) / 2;
    polymer.$.panel.scrollLeft = ( polymer.graph_width - $(polymer.$.panel).width() ) / 2;

    graph
        .gravity(0.1)
        .distance(100)
        .charge(-1400)
        .size([polymer.graph_width, polymer.graph_height]);

    graph
          .nodes(json.nodes)
          .links(json.links)
          .start();

    var link = svg.selectAll(".link")
          .data(json.links)
        .enter().append("line")
          .attr("class", "link");

    var dragging = false;
    var force_drag = graph.drag()
        .on("drag", function() {
            dragging = true;
         });

    var node = svg.selectAll(".node")
          .data(json.nodes)
        .enter()
        .append("g")
          .attr("class", "node")
          .call(force_drag);

    node.append("circle")
         .attr("class", "node")
         .attr("r", 15)
         .attr("class", function(d) {
             if (d.group === 3) {
                 return "option" + (d.val?" value":"");
             } else if (d.group === 2) {
                 return "enterable";
             } else {
                 return "";
             }
         })
         .call(force_drag);

    node.append("text")
          .attr("dx", 16)
          .attr("dy", "0.33em")
          .text(function(d) { return d.name });

    node.append("title")
          .text(function(d) { return d.val });

    graph.on("tick", function() {
      link.attr("x1", function(d) { return d.source.x; })
            .attr("y1", function(d) { return d.source.y; })
            .attr("x2", function(d) { return d.target.x; })
            .attr("y2", function(d) { return d.target.y; });

      node.attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
    });

    d3.select(polymer.$.graphoptions).on('click',function (d,i) {
        if (dragging) {
            dragging = false;
            return;
        }
        // d3.event.preventDefault();
        var d3_target = d3.select(d3.event.target);
        var datum = d3_target.datum();
        if (datum) {
            if (datum.group === 1) {
                if (polymer.editPanelVisible) {
                    polymer.editPanelAnimate(false);
                }
                polymer.position.pop();
            } else if (datum.group === 2) {
                if (polymer.editPanelVisible) {
                    polymer.editPanelAnimate(false);
                }
                polymer.position.push(datum.name);
            } else {
                // 3: end point
                var path = polymer.position.concat([datum.name]);
                polymer.optionDetails = polymer.getOptionByPath(path);
                polymer.optionDetails._path = path.join(".");
                if (!polymer.editPanelVisible) {
                    polymer.editPanelAnimate(true);
                }
                return;
            }
            polymer.startPoint.x = datum.x;
            polymer.startPoint.y = datum.y;
            polymer.query = null;
            polymer.optionsRedraw();
        } else {
            if (polymer.editPanelVisible) {
                polymer.editPanelAnimate(false);
            }
        }
    }.bind(polymer));
};
