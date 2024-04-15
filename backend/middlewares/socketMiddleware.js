const attachSocketMiddleware = (io) => (req, res, next) => {
    req.io = io;
    next();
  };

  

module.exports = {attachSocketMiddleware}