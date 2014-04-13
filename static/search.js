if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'react'
], function(React, undefined) {

  var Search = React.createClass({
    displayName: 'Search',

    getInitialState: function() {
      return {results: null};
    },

    check: function() {
      $.ajax({
        url: '/search/get',
        success: function(data) {
          this.setState({results: data});
          this.stopCheck();
        }.bind(this)
      });
    },

    startCheck: function() {
      this.interval = setInterval(this.check, 1000);
    },

    stopCheck: function() {
      clearInterval(this.interval);
    },

    handleSubmit: function(e) {
      e.preventDefault();
      this.startCheck();
    },

    render: function() {
      return React.DOM.div(null,
        React.DOM.form({
          action: '/search',
          method: 'post',
          role: 'form',
          onSubmit: this.handleSubmit
        }, [
          React.DOM.div({ key: 'field-query', className: 'form-group' }, [
            React.DOM.label({ key: 'label', htmlFor: 'query'}, 'Query'),
            React.DOM.input({
              key: 'input', 
              className: 'form-control',
              type: 'text',
              id: 'query',
              name: 'query'
            })
          ]),
          React.DOM.button({
            key: 'button-submit',
            className: 'btn btn-large btn-primary',
            type: 'submit'
          }, 'Search')
        ]),
        React.DOM.div(null, this.state.results)
      );
    }

  });

  return Search;

});
