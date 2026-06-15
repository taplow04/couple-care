const jwt = require("jsonwebtoken");

const User = require("../modules/users/user.model");

const authenticateUser = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Unauthorized");
    }

    const token = authHeader.split(" ")[1];

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      throw new Error("User not found");
    }

    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = authenticateUser;
