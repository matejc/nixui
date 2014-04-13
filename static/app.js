if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'react',
  'react-router-component',
  './dashboard',
  './login',
  './search'
], function(React, Router, Dashboard, Login, Search, undefined) {

  var App = React.createClass({
    displayName: 'App',
    render: function() {
      return (
        Router.Locations({ path: this.props.path }, [
          Router.Location({ path: '/', handler: Search }),
          Router.Location({ path: '/login', handler: Login }),
          Router.Location({ path: '/search', handler: Search })
        ])
      );
    }
  });

  return App;

});
