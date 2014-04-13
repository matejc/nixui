if (typeof define !== 'function') { var define = require('amdefine')(module) }

define([
  'react'
], function(React, undefined) {

  var Login = React.createClass({

    displayName: 'Login',

    render: function() {
      return React.DOM.form({
        action: '/login',
        method: 'post',
        role: 'form'
      }, [
        React.DOM.div({ key: 'field-username', className: 'form-group' }, [
          React.DOM.label({ key: 'label', htmlFor: 'username'}, 'Username'),
          React.DOM.input({
            key: 'input', 
            className: 'form-control',
            type: 'text',
            id: 'username',
            name: 'username'
          })
        ]),
        React.DOM.div({ key: 'field-password', className: 'form-group' }, [
          React.DOM.label({ key: 'label', htmlFor: 'password'}, 'Password'),
          React.DOM.input({
            key: 'input', 
            className: 'form-control',
            type: 'password',
            id: 'password',
            name: 'password'
          })
        ]),
        React.DOM.button({
          key: 'button-submit',
          className: 'btn btn-large btn-primary',
          type: 'submit'
        }, 'Log in')
      ]);
    }

  });

  return Login;

});
