import * as async from "async";
import * as crypto from "crypto";
import * as nodemailer from "nodemailer";
import * as passport from "passport";
import { default as User, UserModel, AuthToken } from "../models/User";
import { Request, Response, NextFunction } from "express";
import { LocalStrategyInfo } from "passport-local";
import { WriteError } from "mongodb";
import { ResponseModel } from "../models/ResponseModel";
const phoneReg = require("../lib/phoneVerification")(process.env.AUTHY_API_KEY);
const helpers = require("../lib/helpers")();
const nev = require("email-verification");

let start: any;
const authyClient = require("authy-client").Client;
const authy = new authyClient({ key: process.env.AUTHY_API_KEY });

/**
 * Function for request phone verification.
 * @param {number} phone - phone number.
 * @param {number} phoneCode - phone code.
 * @returns {Promise}
 */
const requestPhoneVerification = (phone: number, phoneCode: number) => {
  return new Promise((resolve, reject) => {
    if (phone && phoneCode) {
      phoneReg.requestPhoneVerification(phone, phoneCode, "sms", function(err: Error, res: Response) {
        if (err) {
          console.log(phone + ": " + phoneCode);
          reject(err);
        }
        // console.log(phone + ": " + phoneCode);
        // console.log(res);
        resolve(res);
      });
    } else {
      reject(new Error("Phone or Phone Code fields missing"));
    }
  });
};

const verifyPhoneToken = (phone: number, phoneCode: number, token: number) => {
  return new Promise((resolve, reject) => {
    if (phone && phoneCode && token) {
      phoneReg.verifyPhoneToken(phone, phoneCode, token, function(err: Error, res: Response) {
        if (err) {
          reject(err);
          console.log(phone + ":err " + phoneCode);
        }

        console.log(phone + ":res " + phoneCode);
        resolve(res);
      });
    } else {
      reject(new Error("Phone or Phone Code or Token fields missing"));
    }
  });
};

/**
 * Method for generate 2FA auth token.
 */
export let generateToken = (req: Request, res: Response, next: NextFunction) => {
  const user = req.session.user;
  // req.assert("phone", "Phone field is required").notEmpty();
  // req.assert("countryCode", "Country Code field is required").notEmpty();
  const errors = req.validationErrors();

  if (!user) {
    res.status(400).json({ error: "You need to create user firstly" });
  } else if (errors) {
    res.status(400).json({ error: errors });
  } else {
    requestPhoneVerification(user.phone, user.countryCode)
      .then(() => {
        res.status(200).json({
          "success": true,
          "message": "Message was send!"
        });
      })
      .catch((err: Error) => {
        res.status(400).json(err);
      });
  }
};

/**
 * Method for verify 2FA token.
 */
export let verifyToken = (req: Request, res: Response) => {
  req.checkParams("token", "Token field is required").notEmpty();
  req.checkParams("token", "Token must be 4 characters long").len({ min: 4 });

  const user = req.session.user;
  const errors = req.validationErrors();

  if (!user) {
    res.status(400).json({ error: "You need to create user firstly" });
  } else if (errors) {
    res.status(400).json({ error: errors });
  } else {
    verifyPhoneToken(user.phone, user.countryCode, req.body.code).then(() => {
      req.logIn(user, () => {

        res.status(200).json({
          "success": true,
          "message": "Token verified!"
        });

        delete req.session.user;
      });

    }).catch((err: Error) => {
      res.status(500).json(err);
    });
  }

};


/**
 * GET /verify
 * Verify page.
 */
export let getVerify = (req: Request, res: Response) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  res.render("account/verify", {
    title: "Verify"
  });
};

/**
 * Post /verify
 * Verify page.
 */
export let postVerify = (req: Request, res: Response, next: NextFunction) => {
  start = +new Date();
  const user = req.session.user;
  const phone = user.phone;
  const phoneCode = user.phoneCode;

  if (!phone && !phoneCode) {
    return res.status(400).json(createResponse(400, {}, { meassge: false }));
  }
  req.assert("userId").notEmpty().withMessage("user Id is required");
  req.assert("code").notEmpty().withMessage("auth code is required");
  req.assert("code", "Code must be 4 characters long").len({ min: 4 });
  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json(createResponse(400, {}, errors));
  }

  User.findById(req.body.userId, (err, existingUser) => {
    if (err) {
      return res.status(400).json(createResponse(400, {}, {
        "success": false,
        "error": true,
        "message": "please enter the valid user ID"
      }));
      // return next(err);
    }
    if (!existingUser) {
      res.status(400).json(createResponse(400, {}, {
        "success": false,
        "error": true,
        "message": "User is not found"
      }));
    }
    verifyPhoneToken(phone, phoneCode, req.body.code).then(() => {
      return res.status(200).json(createResponse(200, { message: "verify", userId: user._id }, {}));
    }).catch((err: Error) => {
      return res.status(500).json(createResponse(500, {}, err));
    });
  });
};

/**
 * GET /login
 * Login page.
 */
export let getLogin = (req: Request, res: Response) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("account/login", {
    title: "Login"
  });
};

/**
 * POST /login
 * Sign in using email and password.
 */
export let postLogin = (req: Request, res: Response, next: NextFunction) => {
  start = +new Date();
  req.assert("email", "Email is not valid").isEmail();
  req.assert("password", "Password cannot be blank").notEmpty();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json(createResponse(400, {}, errors));
  }

  passport.authenticate("local", (err: Error, user: UserModel, info: LocalStrategyInfo) => {
    if (err) {
      return res.status(400).json(createResponse(400, {}, err));
    }

    if (!user) {
      return res.status(400).json(createResponse(400, {}, info.message));
    }

    requestPhoneVerification(user.phone, user.phoneCode).then(() => {
      return res.status(200).json(createResponse(200, {
        message: "auth code is sent on your mobile",
        userId: user._id,
        sucess: true
      }, {}));
    }).catch((err: Error) => {
      return res.status(400).json(createResponse(400, {}, err));
    });
  })(req, res, next);
};

export let loginpost = (req: Request, res: Response, next: NextFunction) => {
  start = +new Date();
  req.assert("email", "Email is not valid").isEmail();
  req.assert("password", "Password cannot be blank").notEmpty();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json(createResponse(400, {}, errors));
  }

  passport.authenticate("local", (err: Error, user: UserModel, info: LocalStrategyInfo) => {
    if (err) {
      return res.status(400).json(createResponse(400, {}, err));
    }

    if (!user) {
      return res.status(400).json(createResponse(400, {}, info.message));
    }

    req.session.user = user;
    return res.status(200).json(createResponse(200, {
      message: "login successfully",
      userId: user._id,
      sucess: true
    }, {}));
    // requestPhoneVerification(user.phone, user.phoneCode).then(() => {
    //        return res.status(200).json(createResponse(200, {
    //     message: "auth code is sent on your mobile",
    //     userId: user._id,
    //     sucess: true
    //   }, {}));
    // }).catch((err: Error) => {
    //   return res.status(400).json(createResponse(400, {}, err));
    // });
  })(req, res, next);
};

/**
 * GET /logout
 * Log out.
 */
export let logout = (req: Request, res: Response) => {
  req.logout();
  res.redirect("/");
};

/**
 * GET /signup
 * Signup page.
 */
export let getSignup = (req: Request, res: Response) => {
  if (req.user) {
    return res.redirect("/");
  }
  res.render("account/signup", {
    title: "Create Account"
  });
};

/**
 * POST /signup
 * Create a new local account.
 */
export let postSignup = (req: Request, res: Response, next: NextFunction) => {
  start = +new Date();
  req.assert("email", "Email is not valid").isEmail();
  req.assert("phone", "Phone is required").notEmpty();
  req.assert("phoneCode", "Phone Code is required").notEmpty();
  req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
  req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    return res.status(400).json(createResponse(400, {}, errors));
  }

  const user = new User({
    email: req.body.email,
    password: req.body.password,
    phone: req.body.phone,
    phoneCode: req.body.phoneCode,
  });

  // nev.createTempUser(user, function(err, existingPersistentUser, newTempUser) {
  //   // some sort of error
  //   if (err)
  //   // handle error...
  //
  //   // user already exists in persistent collection...
  //     if (existingPersistentUser)
  //     // handle user's existence... violently.
  //
  //     // a new user
  //       if (newTempUser) {
  //         const URL = newTempUser[nev.options.URLFieldName];
  //         nev.sendVerificationEmail('test@mail.com', URL, function(err, info) {
  //           if (err) {
  //
  //           }
  //           // handle error...
  //
  //           // flash message of success
  //           });
  //
  //         // user already exists in temporary collection...
  //       } else {
  //         // flash message of failure...
  //       }
  // });

  User.findOne({ email: req.body.email }, (err, existingUser) => {
    if (err) {
      console.log(err);

      res.status(400).json(createResponse(500, {}, {
        "success": false,
        "error": true,
        "message": "Account with that email address already exists"
      }));
    }

    if (existingUser) {
      res.status(400).json(createResponse(400, {}, {
        "success": false,
        "error": true,
        "message": "Account with that email address already exists"
      }));
    }

    authy.registerUser({
      countryCode: helpers.getCountryCode(req.body.phoneCode),
      email: req.body.email,
      phone: req.body.phone,
    }).then(function(response: any) {
      user.save((err) => {
        if (err) {
          return res.status(400).json(createResponse(400, {}, err));
        }
        req.session.user = user;
        res.status(200).json(createResponse(200, {
          "success": true,
          "message": "User created, please verify user",
            "userId": user._id,
        }, {}));
      });
      // return response.user.id;
    }).catch(function(error: any) {
      console.log("test");
      return res.status(400).json(createResponse(400, {}, error));
    });
  });
};

/**
 * GET /account
 * Profile page.
 */
export let getAccount = (req: Request, res: Response) => {
  res.render("account/profile", {
    title: "Account Management"
  });
};

/**
 * POST /account/profile
 * Update profile information.
 */
export let postUpdateProfile = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Please enter a valid email address.").isEmail();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("/account");
  }

  User.findById(req.user.id, (err, user: UserModel) => {
    if (err) { return next(err); }
    user.email = req.body.email || "";
    user.profile.name = req.body.name || "";
    user.profile.gender = req.body.gender || "";
    user.profile.location = req.body.location || "";
    user.profile.website = req.body.website || "";
    user.save((err: WriteError) => {
      if (err) {
        if (err.code === 11000) {
          req.flash("errors", { msg: "The email address you have entered is already associated with an account." });
          return res.redirect("/account");
        }
        return next(err);
      }
      req.flash("success", { msg: "Profile information has been updated." });
      res.redirect("/account");
    });
  });
};

/**
 * POST /account/password
 * Update current password.
 */
export let postUpdatePassword = (req: Request, res: Response, next: NextFunction) => {
  req.assert("password", "Password must be at least 4 characters long").len({ min: 4 });
  req.assert("confirmPassword", "Passwords do not match").equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("/account");
  }

  User.findById(req.user.id, (err, user: UserModel) => {
    if (err) { return next(err); }
    user.password = req.body.password;
    user.save((err: WriteError) => {
      if (err) { return next(err); }
      req.flash("success", { msg: "Password has been changed." });
      res.redirect("/account");
    });
  });
};

/**
 * POST /account/delete
 * Delete user account.
 */
export let postDeleteAccount = (req: Request, res: Response, next: NextFunction) => {
  User.remove({ _id: req.user.id }, (err) => {
    if (err) { return next(err); }
    req.logout();
    req.flash("info", { msg: "Your account has been deleted." });
    res.redirect("/");
  });
};

/**
 * GET /account/unlink/:provider
 * Unlink OAuth provider.
 */
export let getOauthUnlink = (req: Request, res: Response, next: NextFunction) => {
  const provider = req.params.provider;
  User.findById(req.user.id, (err, user: any) => {
    if (err) { return next(err); }

    user[provider] = undefined;
    user.tokens = user.tokens.filter((token: AuthToken) => token.kind !== provider);

    user.save((err: WriteError) => {
      if (err) { return next(err); }

      req.flash("info", { msg: `${provider} account has been unlinked.` });
      res.redirect("/account");
    });
  });
};

/**
 * GET /reset/:token
 * Reset Password page.
 */
export let getReset = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  User
    .findOne({ passwordResetToken: req.params.token })
    .where("passwordResetExpires").gt(Date.now())
    .exec((err, user) => {
      if (err) { return next(err); }

      if (!user) {
        req.flash("errors", { msg: "Password reset token is invalid or has expired." });
        return res.redirect("/forgot");
      }

      res.render("account/reset", {
        title: "Password Reset"
      });
    });
};

/**
 * POST /reset/:token
 * Process the reset password request.
 */
export let postReset = (req: Request, res: Response, next: NextFunction) => {
  req.assert("password", "Password must be at least 4 characters long.").len({ min: 4 });
  req.assert("confirm", "Passwords must match.").equals(req.body.password);

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("back");
  }

  async.waterfall([
    function resetPassword(done: Function) {
      User
        .findOne({ passwordResetToken: req.params.token })
        .where("passwordResetExpires").gt(Date.now())
        .exec((err, user: any) => {
          if (err) { return next(err); }

          if (!user) {
            req.flash("errors", { msg: "Password reset token is invalid or has expired." });
            return res.redirect("back");
          }

          user.password = req.body.password;
          user.passwordResetToken = undefined;
          user.passwordResetExpires = undefined;

          user.save((err: WriteError) => {
            if (err) { return next(err); }

            req.logIn(user, (err) => {
              done(err, user);
            });
          });
        });
    },
    function sendResetPasswordEmail(user: UserModel, done: Function) {
      const transporter = nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USER,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
      const mailOptions = {
        to: user.email,
        from: "express-ts@starter.com",
        subject: "Your password has been changed",
        text: `Hello,\n\nThis is a confirmation that the password for your account ${user.email} has just been changed.\n`
      };
      transporter.sendMail(mailOptions, (err) => {
        req.flash("success", { msg: "Success! Your password has been changed." });
        done(err);
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect("/");
  });
};

/**
 * GET /forgot
 * Forgot Password page.
 */
export let getForgot = (req: Request, res: Response) => {
  if (req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("account/forgot", {
    title: "Forgot Password"
  });
};

/**
 * POST /forgot
 * Create a random token, then the send user an email with a reset link.
 */
export let postForgot = (req: Request, res: Response, next: NextFunction) => {
  req.assert("email", "Please enter a valid email address.").isEmail();
  req.sanitize("email").normalizeEmail({ gmail_remove_dots: false });

  const errors = req.validationErrors();

  if (errors) {
    req.flash("errors", errors);
    return res.redirect("/forgot");
  }

  async.waterfall([
    function createRandomToken(done: Function) {
      crypto.randomBytes(16, (err, buf) => {
        const token = buf.toString("hex");
        done(err, token);
      });
    },
    function setRandomToken(token: AuthToken, done: Function) {
      User.findOne({ email: req.body.email }, (err, user: any) => {
        if (err) { return done(err); }

        if (!user) {
          req.flash("errors", { msg: "Account with that email address does not exist." });
          return res.redirect("/forgot");
        }

        user.passwordResetToken = token;
        user.passwordResetExpires = Date.now() + 3600000; // 1 hour

        user.save((err: WriteError) => {
          done(err, token, user);
        });
      });
    },
    function sendForgotPasswordEmail(token: AuthToken, user: UserModel, done: Function) {
      const transporter = nodemailer.createTransport({
        service: "SendGrid",
        auth: {
          user: process.env.SENDGRID_USER,
          pass: process.env.SENDGRID_PASSWORD
        }
      });
      const mailOptions = {
        to: user.email,
        from: "info@coinmetro.com",
        subject: "Reset your password on CoinMetro",
        text: `You are receiving this email because you (or someone else) have requested the reset of the password for your account.\n\n
          Please click on the following link, or paste this into your browser to complete the process:\n\n
          http://${req.headers.host}/reset/${token}\n\n
          If you did not request this, please ignore this email and your password will remain unchanged.\n`
      };
      transporter.sendMail(mailOptions, (err) => {
        req.flash("info", { msg: `An e-mail has been sent to ${user.email} with further instructions.` });
        done(err);
      });
    }
  ], (err) => {
    if (err) { return next(err); }
    res.redirect("/forgot");
  });
};
const calculateRequestTime = () => {
  return +new Date();
};

const getMetaData = () => {
  const meta = {
    version: "1.0",
    received: start,
    executed: +new Date()
  };

  return meta;
};

const createResponse = (responseCode: number, data: any, errors: any) => {
  const respnseModel: ResponseModel = {
    data: data,
    meta: getMetaData(),
    response: {
      code: responseCode,
      errors: errors,
      message: responseCode == 200 ? "OK" : "Error"
    }
  };

  return respnseModel;
};
