const BrowserSyncPlugin = require('browser-sync-webpack-plugin'),
  { CleanWebpackPlugin } = require('clean-webpack-plugin'),
  CopyWebpackPlugin = require('copy-webpack-plugin'),
  ESLintPlugin = require('eslint-webpack-plugin'),
  execSync = require('child_process').execSync,
  HubSpotAutoUploadPlugin = require('@hubspot/webpack-cms-plugins/HubSpotAutoUploadPlugin'),
  GenerateJsonPlugin = require('generate-json-webpack-plugin'),
  path = require('path'),
  StyleLintPlugin = require('stylelint-webpack-plugin'),
  TerserPlugin = require('terser-webpack-plugin');

const isProductionMode = process.env.NODE_ENV === 'production';
const currentBranch = execSync('git symbolic-ref -q --short HEAD').toString('utf-8').trim();
const skipWarnings = false;

module.exports = ({ account, autoupload, production, proxyUrl }) => {

  console.log('account: ', account); // 'local'
  console.log('autoupload: ', autoupload); // true
  console.log('mode: ', isProductionMode ? 'production' : 'development');

  if(!currentBranch) {
    console.log('Initialize git repository before trying to upload!');
    process.exit(1);
  }

  if(!skipWarnings) {
    // Assumes that 'master' is the production branch
    // If this is production branch, require --production flag
    if(production && currentBranch !== 'master') {
      console.log('Wrong branch. Use master branch for production files\n');
      process.exit(1);
    }

    if(currentBranch === 'master' && !production) {
      console.log('Master (production!) branch needs to be built with `npm run build`');
      console.log('For development purposes create another branch.');
      process.exit(1);
    }
  }

  const config = {
    mode: isProductionMode ? 'production' : 'development',
    entry: {
      js: './src/js/master.js',
      css: './src/scss/master.scss'
    },
    output: {
      filename: 'static/js/[name].bundle.js',
      chunkFilename: 'static/js/[name].bundle.[contenthash].js',
      publicPath: `/branches/${currentBranch}/`,
      path: path.resolve(__dirname, `dist/${currentBranch}/`)
    },
    plugins: [
      new HubSpotAutoUploadPlugin({
        autoupload,
        account,
        src: `dist/${currentBranch}`,
        dest: `website/${currentBranch}`,
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'src/img', to: 'static/img' },
          { from: 'src/modules', to: 'modules' },
          { from: 'src/templates', to: 'templates' },
          { from: 'src/*.json', to: '[name][ext]' },
        ]}),
      // Generate HubSpot theme.json file to get theme features enabled
      new GenerateJsonPlugin('theme.json', {
        'enable_domain_stylesheets': false,
        'label': isProductionMode ? 'HubSpot CMS Practicum' : currentBranch,
        'preview_path': './templates/home.html',
        'screenshot_path': './static/img/COVER.png'
      }),
      // Run lint tests for scripts and styles
      new ESLintPlugin(),
      new StyleLintPlugin({
        configFile: '.stylelintrc',
        context: 'src',
        files: '**/*.scss',
        failOnError: false,
        quiet: false,
        emitErrors: true // by default this is to true to check the CSS lint errors
      }),
      // Clean folders
      new CleanWebpackPlugin(),
    ],
    optimization: {
      minimizer: [new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
        },
        extractComments: false,
      })],
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: [
            {loader: 'babel-loader', options: {
              presets: ['@babel/preset-env']
            }}
          ],
        },
        // Use this if you want keep styles in js-file like normally in webpack
        /*{
          test: /\/src\/scss\/.+\.(?:s[ac]ss|css)$/,
          use: [
            // Creates `style` nodes from JS strings
            'style-loader',
            // Translates CSS into CommonJS
            {loader: 'css-loader', options: {sourceMap: true, url: false}},
            // Compiles Sass to CSS
            {loader: 'sass-loader', options: {sourceMap: true}},
          ],
        },*/
        {
          // Export style files from webpacking and write them as normal files to dist

          test: /\.scss$/,
          use: [
            // Write CSS files
            {
              loader: 'file-loader',
              options: {
                name: 'static/css/[name].css'
              }
            },
            // Extract files from JS
            {loader: 'extract-loader'},
            // Translates CSS into CommonJS
            {loader: 'css-loader?-url'},
            //Process CSS (lint + autporefix + minify with cssnano)
            {loader: 'postcss-loader', options: {
              postcssOptions: {
                plugins: [
                  //'stylelint',
                  'autoprefixer',
                  'postcss-focus',
                  'cssnano'
                ],
              },
            },},
            // Compiles Sass to CSS
            {loader: 'sass-loader'}
          ]
        }
      ],
    },
  };

  if (!production && proxyUrl) {
    config.plugins.push(new BrowserSyncPlugin({
      proxy: proxyUrl,
      serveStatic: [`dist/${currentBranch}/static/`],
      files: [
        `dist/${currentBranch}/**`,
      ],
      rewriteRules: [
        { // Search server file paths and replace with local
          // "\/.*(css.bundle|js.bundle).*?"
          match: /"\/.*(css.bundle|js.bundle).*?"/g,
          replace: 'js/$1.js'
        }
      ],
    }));
  }

  return config;
};
