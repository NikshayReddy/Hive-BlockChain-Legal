module.exports = {
    resolve: {
        fallback: {
            "vm": require.resolve("vm-browserify"),
            "buffer": require.resolve("buffer/"),
            "stream": require.resolve("stream-browserify"),
            "crypto": require.resolve("crypto-browserify"),
            "process": require.resolve("process/browser")
        }
    }
}; 