process.on('uncaughtException', (error, origin) => {
    console.log('----- Uncaught exception -----')
    console.log(error)
    console.log('----- Exception origin -----')
    console.log(origin)
});

process.on('unhandledRejection', (reason, promise) => {
    console.log('----- Unhandled Rejection at -----')
    console.log(promise)
    console.log('----- Reason -----')
    console.log(reason)
});
setInterval(() => {
    console.log('app still running')
}, 1000);
const app = require("./app");

const port = process.env.PORT || 9999;
app.listen(port, () => {
    console.log(`Listening: http://localhost:${port}`);
});