const webpack = require('webpack');

module.exports = {
    webpack: {
        configure: {
            resolve: {
                fallback: {
                    "assert": require.resolve("assert/"),
                    "crypto": require.resolve("crypto-browserify"),
                    "stream": require.resolve("stream-browserify"),
                    "buffer": require.resolve("buffer/"),
                    "process": require.resolve("process/browser"),
                    "vm": require.resolve("vm-browserify")
                }
            },
            module: {
                rules: [
                    {
                        test: /\.m?js$/,
                        enforce: 'pre',
                        use: ['source-map-loader'],
                        exclude: [/jsbi/],
                    },
                ],
            },
            ignoreWarnings: [
                /Failed to parse source map/,
            ],
            plugins: [
                new webpack.ProvidePlugin({
                    Buffer: ['buffer', 'Buffer'],
                    process: 'process/browser'
                }),
                new webpack.DefinePlugin({
                    'process.env.NODE_DEBUG': JSON.stringify(process.env.NODE_DEBUG)
                })
            ]
        }
    }
}; 