/** @jsx React.DOM */
'use strict';

var React = require('react/addons');

var Accordion = require('react-bootstrap').Accordion;
var Panel = require('react-bootstrap').Panel;
var Label = require('react-bootstrap').Label;
var Badge = require('react-bootstrap').Badge;
var MenuItem = require('react-bootstrap').MenuItem;
var DropdownButton = require('react-bootstrap').DropdownButton;

var emptyInfo = {
  name: "",
  path: "",
  propagatedNativeBuildInputs: [],
  nativeBuildInputs: [],
  meta: {
    description: "",
    longDescription: "",
    maintainers: [],
    position: "",
    homepage: "",
    license: ""
  }
};

var Results = React.createClass({
  displayName: 'Results',
  getInitialState: function() {
    return {pkgInfo: emptyInfo};
  },
  handleClick: function (e) {
    if (
      !(new RegExp(/0\.0\.0$/)).test($(e.target).data("reactid")) ||
      !$(e.target).hasClass("collapsed")
    ) {
      return;
    }

    this.setState({pkgInfo: emptyInfo});

    var pkgName = $(e.target).text()
    var pkgAttribute = "";
    for (var i=0; i<this.props.packages.length; i++) {
      if (pkgName == this.props.packages[i].name) {
        pkgAttribute = this.props.packages[i].attribute;
        break;
      }
    }

    $.ajax({
            url: '/api/info',
            data: {
              'attribute': pkgAttribute
            },
            success: function(data) {
              if (data.error) {
                alert(data.error)
                return;
              }
              this.setState({pkgInfo: JSON.parse(data)});
            }.bind(this)
          });
  },
  render: function() {
    var createMaintainer = function(item){
      return (
        <Label bsStyle="primary" key={"key_"+item}>{item}</Label>
      );
    };
    var handleClickSource = function (e) {
      window.open("file://" + this.state.pkgInfo.meta.position.replace(/\:\d+$/,''));
      console.log("file://" + this.state.pkgInfo.meta.position.replace(/\:\d+$/,''));
      e.preventDefault();
      return false;
    };
    var handleClickStore = function (e) {
      window.open("file://" + this.state.pkgInfo.path);
      return false;
    };
    var createPanel = function(item) {
      var uid = item.attribute.replace(/\./g, '');
      return (
        <Panel header={item.name} key={'key_'+uid}>
          <Badge className="pull-right">{item.attribute}</Badge>
          <DropdownButton title="Open">
            <MenuItem key="1" onClick={handleClickStore.bind(this)}>Nix Store</MenuItem>
            <MenuItem key="2" onClick={handleClickSource.bind(this)}>Source</MenuItem>
          </DropdownButton>
          <div>{this.state.pkgInfo.meta.description}</div>
          <div>{this.state.pkgInfo.meta.longDescription}</div>
          <div>{this.state.pkgInfo.meta.maintainers ? this.state.pkgInfo.meta.maintainers.map(createMaintainer) : null}</div>
          <div>{this.state.pkgInfo.meta.homepage}</div>
          <div>{this.state.pkgInfo.meta.license}</div>
        </Panel>
      );
    };
    return (
      <Accordion onClick={this.handleClick}>
        {this.props.packages.map(createPanel.bind(this))}
      </Accordion>
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
                if (data.error) {
                  alert(data.error)
                  return;
                }
                this.setState({packages: data});
              }.bind(this)
            });
    }
  },
  doFocus: function() {
    this.refs['searchQuery'].getDOMNode().focus();
  },
  render: function() {
    return (
      <div>
        <input className='form-control' type='text'
          id='query' name='query' ref='searchQuery'
          onChange={this.handleChange} onKeyPress={this.handleInput}
          placeholder="Search for packages ...">
        </input>
        <Results packages={this.state.packages}></Results>
      </div>
    );
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
