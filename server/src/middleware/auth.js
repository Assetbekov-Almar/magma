const jwt = require("jsonwebtoken");
const User = require("../models/User");
const ErrorResponse = require("../utils/errorResponse");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.accesstoken) {
    token = req.headers.accesstoken;
  }
  if (!token) {
    return next(new ErrorResponse("Not authorized to access this route", 401));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new ErrorResponse("No user found with this id"), 404);
    }

    req.user = user;

    next();
  } catch (error) {
    return next(new ErrorResponse("Not authorized to access this route"), 401);
  }
};

module.exports = protect;
