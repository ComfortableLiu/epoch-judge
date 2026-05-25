import { defineConfig } from '@rspack/cli';
import { rspack } from '@rspack/core';
import ReactRefreshPlugin from '@rspack/plugin-react-refresh';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  experiments: {
    css: true,
  },
  entry: { main: './src/main.tsx' },
  output: {
    path: `${__dirname}/dist`,
    publicPath: '/',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.jsx', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: {
          loader: 'builtin:swc-loader',
          options: {
            jsc: {
              parser: { syntax: 'typescript', tsx: true },
              transform: {
                react: {
                  runtime: 'automatic',
                },
              },
            },
          },
        },
        type: 'javascript/auto',
      },
      {
        test: /\.module\.scss$/,
        use: [{ loader: 'sass-loader' }],
        type: 'css/module',
      },
      {
        test: /\.scss$/,
        exclude: /\.module\.scss$/,
        use: [{ loader: 'sass-loader' }],
        type: 'css',
      },
    ],
  },
  plugins: [
    new rspack.HtmlRspackPlugin({ template: './index.html' }),
    isDev && new ReactRefreshPlugin(),
  ].filter(Boolean),
  devServer: {
    port: Number(process.env.WEB_PORT ?? 8080),
    historyApiFallback: true,
    proxy: [
      {
        context: ['/api'],
        target: 'http://localhost:3000',
      },
    ],
  },
});
