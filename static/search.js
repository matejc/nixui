if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'react'
], function(React, undefined) {

  var ResultTable = React.createClass({displayName: 'ResultTable',
    render: function() {
      var createRow = function(item) {
        return React.DOM.tr({key: 'result-'+item[0]},
          React.DOM.td({key: 'result-attr'}, item[0]),
          React.DOM.td({key: 'result-name'}, item[1])
        );
      };
      return React.DOM.table({
        key: 'results-table', className: 'table table-hover'
      }, React.DOM.tbody(null, this.props.results.map(createRow)));
    }
  });

  var Search = React.createClass({
    displayName: 'Search',

    getInitialState: function() {
      return {query: '', results: []};
    },

    check: function() {
      $.ajax({
        url: '/api/search',
        data: {'query': this.state.query},
        success: function(data) {
          if (data.query == this.state.query) {
            this.stopCheck();
            this.setState({query: data.query, results: data.results});
          }
        }.bind(this)
      });
    },

    startCheck: function() {
      this.interval = setInterval(this.check, 1000);
      this.timeout = setTimeout(this.stopCheck, 10000);
    },

    stopCheck: function() {
      clearInterval(this.interval);
      clearTimeout(this.timeout);
    },

    handleChange: function(e) {
      this.setState({query: e.target.value});
    },
    handleInput: function(e) {
      if (e.keyCode === 13 && this.state.query.length >= 3) {
        $.ajax({
                url: '/api/search',
                type: 'POST',
                data: {
                  'query': this.state.query
                },
                success: function() {
                  $('#query').blur();
                  this.startCheck();
                }.bind(this)
              });
        // this.setState({results: this.state.query});
      }
    },
    render: function() {
      return React.DOM.div(null,
        React.DOM.input({
          key: 'search-input',
          className: 'form-control',
          type: 'text',
          id: 'query',
          name: 'query',
          onChange: this.handleChange,
          onKeyPress: this.handleInput
        }),
        ResultTable({results: this.state.results})
      )
    }

  });

  return Search;

});
