if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'react'
], function(React, undefined) {

  var ResultTable = React.createClass({displayName: 'ResultTable',
    render: function() {
      var createRow = function(item) {
        var uid = item.attribute.replace('.', '_');
        return React.DOM.tr({
            key: 'key_'+uid
          },
          React.DOM.td({key: 'pkg_attr'}, item.attribute),
          React.DOM.td({key: 'pkg_name'}, item.name)
        );
      };
      return React.DOM.table({
        key: 'packages-table', className: 'table table-hover table-condensed'
      }, React.DOM.tbody(null, this.props.packages.map(createRow)));
    }
  });

  var Search = React.createClass({
    displayName: 'Search',

    getInitialState: function() {
      return {packages: []};
    },

    handleChange: function(e) {
      this.setState({query: e.target.value});
    },
    handleInput: function(e) {
      if (e.keyCode === 13 && this.state.query.length >= 3) {
        this.refs['searchQuery'].getDOMNode().blur();
        $.ajax({
                url: '/api/search',
                data: {
                  'query': this.state.query
                },
                success: function(data) {
                  this.setState({packages: data});
                }.bind(this)
              });
      }
    },
    doFocus: function() {
      this.refs['searchQuery'].getDOMNode().focus();
    },
    render: function() {
      return React.DOM.div(null,
        React.DOM.input({
          key: 'search-input',
          className: 'form-control',
          type: 'text',
          id: 'query',
          name: 'query',
          ref: 'searchQuery',
          onChange: this.handleChange,
          onKeyPress: this.handleInput
        }),
        ResultTable({packages: this.state.packages})
      )
    }

  });

  return Search;

});
