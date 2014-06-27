/** @jsx React.DOM */
'use strict';

var React = require('react/addons');
var Router = require('react-router-component');
var Locations = Router.Locations;
var Location = Router.Location;
var NotFound = Router.NotFound;

var NotFoundPage = React.createClass({
  render: function () {
    return (
      <h1>ERROR! Not found!</h1>
    );
  }
});


var ResultTable = React.createClass({displayName: 'ResultTable',
  render: function() {
    var createRow = function(item) {
      var uid = item.attribute.replace('.', '_');
      return (
        <tr key={'key_'+uid} >
          <td key='pkg_attr'>{item.attribute}</td>,
          <td key='pkg_name'>{item.name}</td>
        </tr>
      );
    };
    return (
      <table key='packages-table' className='table table-hover table-condensed'>
        <tbody>{this.props.packages.map(createRow)}</tbody>
      </table>
    );
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


if (typeof window !== 'undefined') {
  window.React = React;
  var domready = require('domready');
  domready(function () {
    React.renderComponent(
      <Search/>,
      document.body
    );
  });
}

module.exports = Search;
