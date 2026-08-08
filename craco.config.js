const webpack = require('webpack');

module.exports = {
    jest: {
        configure: (jestConfig) => {
            // Jest 27 (via react-scripts 5) ignores package.json "exports" maps, so it
            // cannot resolve the react-router/dom subpath that react-router-dom v7 imports.
            jestConfig.moduleNameMapper = {
                ...jestConfig.moduleNameMapper,
                '^react-router/dom$':
                    '<rootDir>/node_modules/react-router/dist/development/dom-export.js',
            };
            return jestConfig;
        },
    },
    webpack: {
        configure: {
            resolve: {
                alias: {
                    // react-router v7 is strict ESM, so ProvidePlugin's extensionless
                    // 'process/browser' request fails to resolve from inside it.
                    "process/browser": require.resolve("process/browser.js")
                },
                fallback: {
                    "assert": require.resolve("assert/"),
                    "crypto": require.resolve("crypto-browserify"),
                    "stream": require.resolve("stream-browserify"),
                    "buffer": require.resolve("buffer/"),
                    "process": require.resolve("process/browser.js"),
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
                    {
                        // Allow extensionless imports from ESM dependencies.
                        test: /\.m?js$/,
                        resolve: { fullySpecified: false },
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