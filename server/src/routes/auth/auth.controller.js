const User = require("../../models/User");
const ErrorResponse = require("../../utils/errorResponse");
const uuid = require("uuid");
const mailService = require("./services/mail.service");
const generateAndSaveTokens = require("../../utils/generateAndSaveTokens");
const Token = require("../../models/Token");
const jwt = require("jsonwebtoken");
const UserDto = require("../../dtos/user.dto");
const protect = require("../../middleware/auth");
const crypto = require("crypto");

const register = async (req, res, next) => {
  const { username, email, password } = req.body;

  try {
    const candidate = await User.findOne({ email });

    if (candidate) {
      return next(
        new ErrorResponse("User with this email already exists", 401)
      );
    }

    const activationLink = uuid.v4();
    const user = await User.create({
      username,
      email,
      password,
      activationLink,
    });

    await mailService.sendActivationMail(
      email,
      `${process.env.API_URL}/api/auth/activate/${activationLink}`
    );

    return generateAndSaveTokens(user, res);
  } catch (error) {
    next(error);
  }
};

const activate = async (req, res, next) => {
  try {
    const activationLink = req.params.link;
    const user = await User.findOne({ activationLink });

    if (!user) {
      return next(new ErrorResponse("Activation link is invalid", 401));
    }
    user.isActivated = true;
    await user.save();

    return res.redirect(process.env.CLIENT_URL);
  } catch (error) {
    next(error);
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new ErrorResponse("Укажите email и пароль", 400));
  }

  try {
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return next(new ErrorResponse("Пользователь не найден", 404));
    }

    const isMatch = await user.matchPassword(password);

    if (!isMatch) {
      return next(new ErrorResponse("Неправильно указан пароль", 401));
    }

    return generateAndSaveTokens(user, res);
  } catch (error) {
    next(error);
  }
};

const check = async (req, res, next) => {
  try {
    await protect(req, res, next);
    const user = req.user;
    const userDto = new UserDto(user);

    return res.status(200).json({
      ...userDto,
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    const { refreshToken } = req.headers;

    await Token.deleteOne({ refreshToken });

    return res.status(200).json({
      ok: true,
    });
  } catch (error) {
    next(error);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshtoken } = req.headers;
    if (!refreshtoken) {
      return next(new ErrorResponse("Unauthorized", 401));
    }

    const userData = jwt.verify(refreshtoken, process.env.JWT_REFRESH_SECRET);
    const tokenFromDb = await Token.findOne({ refreshtoken });

    if (!userData || !tokenFromDb) {
      return next(new ErrorResponse("Unauthorized", 401));
    }

    const user = await User.findById(userData.id);

    return generateAndSaveTokens(user, res);
  } catch (error) {
    next(error);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return next(new ErrorResponse("Email not found", 404));
    }

    const resetToken = user.getResetPasswordToken();

    await user.save();

    try {
      await mailService.sendResetPasswordMail(
        email,
        `${process.env.CLIENT_URL}/auth/${resetToken}`
      );

      res.status(200).json({ ok: true });
    } catch (error) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;

      await user.save();
      console.log(error);

      return next(new ErrorResponse("Email could not be sent", 500));
    }

    await user.save();
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const resetPasswordToken = crypto
      .createHash("sha256")
      .update(req.params.resetToken)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return next(new ErrorResponse("Invalid reset token", 400));
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(201).json({
      ok: true,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  check,
  forgotPassword,
  resetPassword,
  logout,
  activate,
  refresh,
};
