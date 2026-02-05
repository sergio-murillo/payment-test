const path = require('path');

module.exports = (options) => {
  return {
    ...options,
    entry: {
      main: './src/main.ts',
      'payments/lambdas/step-functions-handlers':
        './src/payments/lambdas/step-functions-handlers.ts',
    },
    output: {
      ...options.output,
      filename: '[name].js',
      libraryTarget: 'commonjs2',
      path: path.resolve(__dirname, 'dist'),
    },
    externals: [],
    resolve: {
      ...options.resolve,
      modules: [
        path.resolve(__dirname, 'node_modules'),
        path.resolve(__dirname, '../../node_modules'),
        'node_modules',
      ],
    },
  };
};
