/**
 * Module dependencies.
 */
import * as express from "express";
import * as compression from "compression";  // compresses requests
import * as session from "express-session";
import * as bodyParser from "body-parser";
import * as logger from "morgan";
import * as errorHandler from "errorhandler";
import * as lusca from "lusca";
import * as dotenv from "dotenv";
import * as mongo from "connect-mongo";
import * as flash from "express-flash";
import * as path from "path";
import * as mongoose from "mongoose";
import * as acl from "acl";
import * as mongodb from "mongodb";
import * as passport from "passport";
import { WriteError } from "mongodb";
import expressValidator = require("express-validator");
const MongoStore = mongo(session);
const router = express.Router();
/**
 * Load environment variables from .env file, where API keys and passwords are configured.
 */
dotenv.config({ path: ".env" });

/**
 * Create Express server.
 */
const app = express();
// const nev = require("email-verification")(mongoose);
// const User = require("./models/User");

/**
 * Connect to MongoDB.
 */
// mongoose.Promise = global.Promise;
mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI, { useMongoClient: true });
mongoose.connection.on("error", () => {
  console.log("MongoDB connection error. Please make sure MongoDB is running.");
  process.exit();
});

console.log(new Date());
// mongodb.MongoClient.connect(process.env.MONGODB_URI, function(errorRes: any, db: any) {
  // let new_acl: any = "";
  // new_acl  = new acl(new acl.memoryBackend());
  // // new_acl.addUserRoles("test21", "guest");
  // new_acl.allow([
  //   {
  //     roles: ["guest"],
  //     allows: [
  //       {
  //         resources: "/authentication/tokens",
  //         permissions: ["post", "put"]
  //       },
  //     ]
  //   },
  //   {
  //     roles: ["client"],
  //     allows: [
  //       {
  //         resources: "/sso/tokens",
  //         permissions: "post"
  //       },
  //       {
  //         resources: "/users/:userId/passwords/:token",
  //         permissions: "post"
  //       },
  //     ]
  //   },
  //   {
  //     roles: ["agent", "admin"],
  //     allows: [
  //       {
  //         resources: "/authentication/tokens",
  //         permissions: ["post", "put"]
  //       },
  //       {
  //         resources: "/sso/tokens",
  //         permissions: "post"
  //       },
  //       {
  //         resources: "/users/:userId/passwords/:token",
  //         permissions: "put"
  //       },
  //     ]
  //   },
  //   {
  //     roles: ["test"],
  //     allows: [
  //       {
  //         resources: "/testapitoken",
  //         permissions: ["post"]
  //       },
  //     ]
  //   }
  // ]);
// });

/**
 * Express configuration.
 */
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(logger("dev"));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(expressValidator());
app.use(session({
  resave: true,
  saveUninitialized: true,
  secret: process.env.SESSION_SECRET,
  store: new MongoStore({
    url: process.env.MONGODB_URI || process.env.MONGOLAB_URI,
    autoReconnect: true
  })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});
app.use((req, res, next) => {
  // After successful login, redirect back to the intended page
  if (!req.user &&
    req.path !== "/login" &&
    req.path !== "/signup" &&
    !req.path.match(/^\/auth/) &&
    !req.path.match(/\./)) {
    req.session.returnTo = req.path;
  } else if (req.user &&
    req.path == "/account") {
    req.session.returnTo = req.path;
  }
  next();
});
app.use(express.static(path.join(__dirname, "public"), { maxAge: 31557600000 }));

app.use(errorHandler());

/**
 * Start Express server.
 */
app.listen(app.get("port"), () => {
  console.log(("  App is running at http://localhost:%d in %s mode"), app.get("port"), app.get("env"));
  console.log("  Press CTRL-C to stop\n");
});

app.use("/", require("./config/routes"));
module.exports = app;

