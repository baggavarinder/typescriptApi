"use strict";

import * as async from "async";
import * as request from "request";
import { Response, Request, NextFunction } from "express";
import { WriteError } from "mongodb";
import * as jwt from "jsonwebtoken";
import * as crypto from "crypto";
import { BitGoHelper, CreatewalletAddressModel } from "../models/bitGoHelper";
import { ResponseModel } from "../models/ResponseModel";

interface IRequest extends Request {
  decoded: string;
}

let start: any;
const bitGoHelper = new BitGoHelper();
export let testapitoken = (req: IRequest, res: Response) => {
  return res.status(401).json(createResponse(401, {}, {}));

};

/* bitgo authenticate*/
export let authenticate = (req: IRequest, res: Response) => {
  start = new Date();
  req.assert("username").notEmpty().withMessage("id is required");
  req.assert("password").notEmpty().withMessage("wallet type is required");
  req.assert("otp").notEmpty().withMessage("2fa token is required");
  const errors = req.validationErrors();
  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }
  const bitGoHelper = new BitGoHelper();
  bitGoHelper.readUserAuthentication(req.body.username, req.body.password, req.body.otp, function(response: any) {
    return res.status(200).json(createResponse(200, response, {}));
  },
    function(error: any) {
      return res.status(400).json(createResponse(400, {}, error));
    });
};

/* Create Wallet */
export let createWallet = (req: IRequest, res: Response) => {
  start = new Date();

  req.assert("label").notEmpty().withMessage("label is required");
  req.assert("passphrase").notEmpty().withMessage("passphrase is required");

  const errors = req.validationErrors();

  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }

  bitGoHelper.accessToken = req.headers.authorization;
  bitGoHelper.createwallet(req.body, function(response: any) {

    return res.status(200).json(createResponse(200, response, {}));
  },
    function(error: any) {
      return res.status(400).json(createResponse(400, {}, error));
    });
};

/* List Wallet Transfers*/
export let getWalletTransactions = (req: IRequest, res: Response) => {
  start = new Date();
  req.assert("coin").notEmpty().withMessage("walllet type is required");
  req.assert("id").notEmpty().withMessage("wallet id is required");

  const errors = req.validationErrors();

  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }

  bitGoHelper.accessToken = req.headers.authorization;
  console.log(bitGoHelper.accessToken);

  bitGoHelper.getWalletTransactions(req.query.coin, req.query.id, function(response: any) {
    return res.status(200).json(createResponse(200, response, {}));
  },
    function(error: any) {
      return res.status(400).json(createResponse(400, {}, error));
    });
};

/* Create Wallet Address*/
export let generateWalletAddress = (req: IRequest, res: Response) => {
  start = new Date();
  req.assert("coin").notEmpty().withMessage("walllet type is required");
  req.assert("id").notEmpty().withMessage("wallet id is required");
  const errors = req.validationErrors();
  if (errors) {
    return res.status(401).json(createResponse(401, {}, errors));
  }
  bitGoHelper.accessToken = req.headers.authorization;
  const createwalletAddressModel = new CreatewalletAddressModel();
  createwalletAddressModel.coin = req.query.coin;
  createwalletAddressModel.id = req.query.id;
  createwalletAddressModel.gasPrice = req.body.gasPrice;
  bitGoHelper.generateAddress(createwalletAddressModel, function(response: any) {
    return res.status(200).json(createResponse(200, response, {}));
  },
    function(error: any) {
      return res.status(400).json(createResponse(400, {}, error));
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
        let notFound: any = {};
        notFound = new Error("There is something went wrong to verify the token. Please try again.");
        notFound.status = 500;
        return next(notFound);
      } else {
        req.decoded = decode;
        next();
      }
    });
  } else {
    // If token not found send error message.
    let notFound: any = {};
    notFound = new Error("Token Required.");
    notFound.status = 500;
    return next(notFound);
  }
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
