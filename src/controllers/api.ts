"use strict";

import * as async from "async";
import * as request from "request";
import * as jwt from "jsonwebtoken";
import * as nodemailer from "nodemailer";
import { default as User, UserModel, AuthToken } from "../models/User";
import { Response, Request, NextFunction } from "express";
import { WriteError } from "mongodb";
import * as crypto from "crypto";

import { MandrillHelper, MandrillModel, TemplateContent, MailTo } from "../models/mandrillHelper";
import { AclHelper, AclHelperModel, AllowPermission } from "../models/aclHelper";
import { BitGoHelper, } from "../models/bitGoHelper";
import { ResponseModel } from "../models/ResponseModel";

interface IRequest extends Request {
  decoded: string;
}

let start: any;

/**
 * GET /api
 * List of APIs.
 */
export let getApi = (req: Request, res: Response) => {
  res.render("api/index", {
    title: "APIs"
  });
};

/**
 * POST /authentication/tokens
 * Validate user login and return token
 */
export let getToken = (req: Request, res: Response) => {
  start = +new Date();

  req.assert("login").notEmpty().withMessage("Login is required");
  req.assert("password").notEmpty().withMessage("Password is required");

  const errors = req.validationErrors();
  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }

  User.findOne({ email: req.body.login }, (err, user: any) => {
    if (err) {
      return res.status(500).json(createResponse(500, {}, { status: "There is something went wrong. Please try again." }));
    }
    // If user not found than give login error
    if (!user) {
      return res.status(401).json(createResponse(401, {}, { message: `Login name ${req.body.login} not found.` }));
    }
    // After validate user login name go for password validate
    user.comparePassword(req.body.password, (err: Error, isMatch: boolean) => {
      if (err) {
        return res.status(500).json(createResponse(500, {}, err));
      }
      // If password matched than go for token
      if (isMatch) {
        // Return token
        const expireDate = Math.floor(Date.now() / 1000) + (60 * 60 * 24 * 365 * 20);
        const addData = {
          username: user.email,
          exp: expireDate
        };
        jwt.sign(addData, process.env.JWT_SECRET_KEY, function(err: Error, token: any) {
          if (err) {
            return res.status(500).json(createResponse(500, {}, err));
          }
          User.findById(user._id, (err, user: UserModel) => {
            user.token = token;
            user.save((err: WriteError) => {
              console.log("done");
            });
          });
          const data = {
            token: token,
            lifetime: expireDate
          };

          return res.status(200).json(createResponse(200, data, {}));
        });
      } else {
        // if password didn't match, give error message.
        return res.status(401).json(createResponse(401, {}, { message: `Invalid password for ${req.body.login}.` }));
      }
    });
  });
};

export let testapitoken = (req: IRequest, res: Response) => {
  const bitGoHelper = new BitGoHelper();
 // req.assert("id").notEmpty().withMessage("id is required");
 // req.assert("coin").notEmpty().withMessage("wallet type is required");
  // req.assert("authorization").notEmpty().withMessage("access token is required");
  // console.log(req.headers.authorization);
  // const errors = req.validationErrors();
  // bitGoHelper.accessToken = req.headers.authorization;

  // if (errors) {
  //   return res.status(401).json(createResponse(401, {}, errors));
  // }

  // bitGoHelper.getWalletTransactions(req.query.coin, req.query.id, function(response: any) {
  //   return res.status(200).json(createResponse(200, response, {}));
  // },
  //   function(error: any) {
  //     // return res.status(401).json(error);
  //     return res.status(400).json(createResponse(400, {}, error));
  //   });
  return res.status(200).json(createResponse(200, {message: "true"}, {}));
};

export let revokeToken = (req: Request, res: Response) => {
  start = +new Date();
  req.assert("token").notEmpty().withMessage("Token is required");
  const errors = req.validationErrors();

  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }

  jwt.verify(req.body.token, process.env.JWT_SECRET_KEY, function(err: Error, decode: any) {
    if (err) {
      return res.status(500).json(createResponse(500, {}, err));
    } else {
      User.findOne({ token: req.body.token }, (err, user) => {
        if (err) {
          return res.status(500).json(createResponse(500, {}, err));
        }
        if (user) {
          User.findById(user._id, (err, user: UserModel) => {
            user.token = "";
            user.save((err: WriteError) => {
              if (err) {
                return res.status(500).json(createResponse(500, {}, err));
              }
              else { return res.status(200).json(createResponse(200, { message: "success" }, {})); }
            });
          });
        }
        else {
          return res.status(401).json(createResponse(401, {}, { message: "No Token found." }));
        }
      });
    }
  });
};

/**
 * Middleware: Verify JWT token is validate or not
 */
export let verifyJwtToken = (req: IRequest, res: Response, next: NextFunction) => {
  // Check header or url parameters or post parameters for token
  const token = req.body.token || req.query.token || req.headers["x-access-token"];

  // Verify and decode Token
  if (token) {
      jwt.verify(token, process.env.JWT_SECRET_KEY, function(err: Error, decode: any) {
          if (err) {
            return res.status(401).json(createResponse(401, {}, {message: "Inavlid Token."}));
              // let notFound: any = {};
              // notFound = new Error("There is something went wrong to verify the token. Please try again.");
              // notFound.status = 500;
              // return next(notFound);
          } else {
              req.decoded = decode;
              next();
          }
      });
  } else {
      // If token not found send error message.
     // let notFound: any = {};
     // notFound = new Error("Token Required.");
     // notFound.status = 500;
     // return next(notFound);
      return res.status(401).json(createResponse(401, {}, {message: "No Token found."}));
  }
};
export let sendResetPasswordLink = (req: Request, res: Response) => {
  start = +new Date();
  req.assert("email").notEmpty().withMessage("Email is required");
  const errors = req.validationErrors();

  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) {
      return res.status(500).json(createResponse(500, {}, err));
    }
    if (user) {
      User.findById(user._id, (err, user: UserModel) => {
        crypto.randomBytes(16, (err, buf) => {
          user.passwordResetToken = buf.toString("hex");
          const date = new Date();
          date.setHours(date.getHours() + 1);
          user.passwordResetExpires = date;
          // sending email
          const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            // service: "SendGrid",
            auth: {
              user: process.env.SENDGRID_USER,
              pass: process.env.SENDGRID_PASSWORD
            }
          });
          const mailOptions = {
            to: user.email,
            from: "info@coinmetro.com",
            subject: "Reset your password on CoinMetro",
            html: `<p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
            <p>Please click on the following link, or paste this into your browser to complete the process:</p>
            <p> <a href='http://${req.headers.host}/reset/${user._id}/${user.passwordResetToken}'>click here to reset Password</a></p>
            <p> If you did not request this, please ignore this email and your password will remain unchanged.</p>`
          };
          transporter.sendMail(mailOptions, (err) => {
            if (err) {
              return res.status(500).json(createResponse(500, {}, err));
            }
            else {
              user.save((err: WriteError) => {
                if (err) {
                  return res.status(500).json(createResponse(500, {}, err));
                }
                else {
                  return res.status(200).json(createResponse(200, {
                    message: `An e-mail has been sent to ${user.email} with further instructions.`,
                    resetToken: user.passwordResetToken,
                    tokenExpiryTime: user.passwordResetExpires
                  }, {}));
                }
              });
            }
          });
        });
      });
    }
    else {
      return res.status(500).json(createResponse(500, {}, { message: "Invalid Email address." }));
    }
  });
};

export let resetPassword = (req: Request, res: Response) => {
  start = +new Date();
  req.assert("token").notEmpty().withMessage("Token is required");
  req.assert("password", "Password must be at least 4 characters long.").notEmpty().len({ min: 4 });
  req.assert("confirmPassword", "Passwords must match.").equals(req.body.password);

  const errors = req.validationErrors();
  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }

  User
    .findOne({ passwordResetToken: req.params.token })
    .where("passwordResetExpires").gt(Date.now())
    .exec((err, user: any) => {
      if (err) { return res.status(500).json(createResponse(500, {}, err)); }

      if (!user) {
        return res.status(500).json(createResponse(500, {}, { message: "Password reset token is invalid or has expired." }));
      }

      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;

      user.save((err: WriteError) => {
        if (err) { return res.status(500).json(err); }
        else { return res.status(200).json(createResponse(200, { message: "Password has been updated successfully." }, {})); }
      });
    });
};

export let emailSent = (req: IRequest, res: Response) => {
  start = +new Date();
  const mandril = new MandrillHelper();
  mandril.SendEmail(req.body, function(response: any) {
    return res.status(200).json(createResponse(200, response, {}));
  }, function(error: any) {
    return res.status(400).json(createResponse(400, {}, error));
  });
};

export let assignUserRole = (req: IRequest, res: Response) => {
  start = +new Date();
  req.assert("userId").notEmpty().withMessage("userId is required");
  req.assert("role").notEmpty().withMessage("role is required");
  const errors = req.validationErrors();

  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }
  const aclhelper = new AclHelper();
  aclhelper.assignRole(req.body.userId, req.body.role, function(response: any) {
    console.log("response");
    return res.status(200).json(createResponse(200, response, {}));
  }, function(error: any) {
    return res.status(500).json(createResponse(500, {}, error));
  });
  // return res.status(200).json("response");
};

export let getPermission = (req: IRequest, res: Response) => {
  start = +new Date();
  req.assert("userId").notEmpty().withMessage("userId is required");
  req.assert("resource").notEmpty().withMessage("resource is required");
  const errors = req.validationErrors();

  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }
  const aclhelper = new AclHelper();
  aclhelper.getPermissions(req.body.userId, req.body.resource, function(response: any) {
    console.log("response");
    return res.status(200).json(createResponse(200, response, {}));
  }, function(error: any) {
    return res.status(500).json(createResponse(500, {}, error));
  });
  // return res.status(200).json("response");
};

export let acl_allowed = (req: IRequest, res: Response) => {
  start = +new Date();
  req.assert("userId").notEmpty().withMessage("userId is required");
  req.assert("resource").notEmpty().withMessage("resource is required");
  req.assert("method").notEmpty().withMessage("method is required");
  const errors = req.validationErrors();

  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }
  const aclhelper = new AclHelper();
  aclhelper.allowed(req.body.userId, req.body.resource, req.body.method, function(response: any) {
    console.log("response");
    return res.status(200).json(createResponse(200, response, {}));
  }, function(error: any) {
    return res.status(500).json(createResponse(500, {}, error));
  });
  // return res.status(200).json("response");
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
