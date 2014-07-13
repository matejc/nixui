var webpack = require('webpack');

module.exports = {

  output: {
    path: __dirname + "/_lib/",
    filename: "[name].entry.js"
  },

  debug: false,
  devtool: false,
  entry: {
    client: "./src/client.jsx"
  },

  stats: {
    colors: true,
    reasons: false
  },

  module: {
    preLoaders: [{
      test: "\\.js$",
      exclude: "node_modules",
      loader: "jshint"
    }],
    loaders: [
      { test: /\.html$/,
        loader: "html-loader"
      },
      { test: /\.jsx$/,
        loader: "jsx-loader"
      },
      { test: /\.css$/,
        loaders: [
            "style-loader",
            "css-loader"
        ]
      },
      { test: /\.less$/,
        loaders: [
            "style-loader",
            "css-loader",
            "less-loader"
        ]
      },
      { test: /\.png$/, loader: "url?limit=100000&minetype=image/png" },
      { test: /\.woff$/, loader: "url-loader?limit=10000&minetype=application/font-woff" },
      { test: /\.ttf$/, loader: "file-loader" },
      { test: /\.eot$/, loader: "file-loader" },
      { test: /\.svg$/, loader: "file-loader" }
    ]
  },

  plugins: [
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.AggressiveMergingPlugin(),
    new webpack.ProvidePlugin({
        $: "jquery",
        jQuery: "jquery"
    })
  ]

};
