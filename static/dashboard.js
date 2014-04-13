if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'react'
], function(React, undefined) {

  var Dashboard = React.createClass({
    displayName: 'Dashboard',
    render: function() {
      return React.DOM.div({}, 'Dashboard')
    }
  });

  return Dashboard;

});
