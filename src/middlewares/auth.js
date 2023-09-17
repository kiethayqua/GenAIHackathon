module.exports.verifyToken = (req, res, next) => {
    if (req.body.token == null) return res.status(400).send('Token not found');
    next();
}