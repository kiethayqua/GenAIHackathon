const app = require("./app");

const port = process.env.PORT || 9999;
app.listen(port, () => {
    console.log(`Listening: http://localhost:${port}`);
});