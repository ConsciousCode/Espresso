module.exports = {
    entry:  __dirname + "/src/espresso.js",
    output: {
        path:  __dirname + "/dist",
        filename: "espresso.js",
        libraryTarget: "umd",
        library: "espresso"
    }
}
