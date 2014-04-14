if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'react'
], function(React, undefined) {

  var Search = React.createClass({
    displayName: 'Search',

    getInitialState: function() {
      return {results: null};
    },

    check: function() {  // TODO
      /*$.ajax({
        url: '/api/search',
        success: function(data) {
          this.setState({results: data});
          this.stopCheck();
        }.bind(this)
      });*/
    },

    startCheck: function() {
      this.interval = setInterval(this.check, 1000);
    },

    stopCheck: function() {
      clearInterval(this.interval);
    },

    handleChange: function(e) {
      this.setState({query: e.target.value});
    },
    handleInput: function(e) {
      if (e.keyCode === 13) {
        this.setState({results: this.state.query});
      }
    },
    render: function() {
      return React.DOM.div(null,
        React.DOM.input({
          key: 'input', 
          className: 'form-control',
          type: 'text',
          id: 'query',
          name: 'query',
          onChange: this.handleChange,
          onKeyPress: this.handleInput
        }),
        React.DOM.div(null, this.state.results)
      )
    }

  });

  return Search;

});
