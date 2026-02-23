module.exports = {
  outputDir: 'dist',
  assetsDir: 'static',
  indexPath: 'index.html',
  chainWebpack: config => {
    config.module
      .rule('vue')
      .use('vue-loader')
      .loader('vue-loader')
      .tap(options => {
        options.compilerOptions = {
          ...(options.compilerOptions || {}),
          whitespace: 'condense'
        }
        return options
      })
  },
  configureWebpack: {
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
          options: {
            compilerOptions: {
              whitespace: 'condense',
              delimiters: [['<', '>'], ['<%', '%>']],
              comments: true
            }
          }
        }
      ]
    },
    resolve: {
      extensions: ['.js', '.vue', '.json']
    }
  },
  devServer: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:8081',
        changeOrigin: true
      }
    }
  }
}
