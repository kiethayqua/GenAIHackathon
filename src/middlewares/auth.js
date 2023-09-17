module.exports.verifyAccessToken = (req, res, next) => {
    const authorization = req.headers.authorization;
    const items = authorization.split(/[ ]+/);

    if (items.length > 1 && items[0].trim() == "Bearer") {
        next();
    } else {
        res.status(401).send("Please Login!");
    }
}