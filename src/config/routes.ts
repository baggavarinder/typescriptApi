import * as express from "express";
const app = express();
import * as homeController from "../controllers/home";
import * as userController from "../controllers/user";
import * as apiController from "../controllers/api";
import * as passportConfig from "../config/passport";
import { AclHelper, AclHelperModel, AllowPermission } from "../models/aclHelper";
const router = express.Router();
const aclHelper = new AclHelper();

/**
 * API without authentication routes.
 */
router.get("/api", apiController.getApi);
router.post("/assignUserRole", apiController.assignUserRole);
router.post("/getPermission", apiController.getPermission);
router.post("/testapitoken", aclHelper.isAllowsed, apiController.testapitoken);
router.post("/authentication/tokens", apiController.getToken);
router.post("/signup", userController.postSignup);
/**
 * Token authentication for all routes.
 */
router.use(apiController.verifyJwtToken);
/**
 * API authentication routes.
 */
// get methods
router.get("/", homeController.index);
router.get("/verify", userController.getVerify);
router.get("/login", userController.getLogin);
router.get("/logout", userController.logout);
router.get("/forgot", userController.getForgot);
router.get("/reset/:token", userController.getReset);
router.get("/signup", userController.getSignup);
// post methods
router.post("/login", userController.postLogin);
router.post("/verify", userController.postVerify);
router.post("/forgot", userController.postForgot);
router.post("/reset/:token", userController.postReset);
router.post("/sso/tokens", apiController.sendResetPasswordLink);
// put methods
router.put("/users/:userId/passwords/:token", apiController.resetPassword);
router.put("/authentication/tokens", apiController.revokeToken);
/**
 * API keys and Passport configuration.
 */
//  Passport get endpoints
router.get("/account", passportConfig.isAuthenticated, userController.getAccount);
router.get("/account/unlink/:provider", passportConfig.isAuthenticated, userController.getOauthUnlink);
// Passport post endpoints
router.post("/account/profile", passportConfig.isAuthenticated, userController.postUpdateProfile);
router.post("/account/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
router.post("/account/delete", passportConfig.isAuthenticated, userController.postDeleteAccount);

// 2FA get auth endpoints.
router.get("/2fa/tokens/:token", userController.verifyToken);
router.get("/2fa/tokens", userController.verifyToken);
// 2FA auth post endpoints
router.post("/2fa/tokens", userController.generateToken);
// testapitoken endpoints.
router.get("/testapitokens", aclHelper.isAllowsed, apiController.testapitoken);
module.exports = router;