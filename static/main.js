requirejs.config({
  paths: {
    'domready': '/bower_components/requirejs-domready/domReady',
    'react' : '/bower_components/react/react-with-addons',
    'react-async' : '/bower_components/react-async/react-async',
    'react-router-component' : '/bower_components/react-router-component/react-router-component',
    'jquery' : '/bower_components/jquery/dist/jquery',
  }
});

require([
  'jquery',
  'domready',
  'react',
  './app'
], function($, domready, React, App, undefined) {

  domready(function() {
    React.renderComponent(App({
      path: window.location.pathname
    }), document.getElementById('maincontainer'));
  });

});
