import * as mongoose from "mongoose";
import * as acl from "acl";
import * as mongodb from "mongodb";

let new_acl: any = "";
new_acl  = new acl(new acl.memoryBackend());
// new_acl.addUserRoles("test21", "guest");
new_acl.allow([
  {
    roles: ["guest"],
    allows: [
      {
        resources: "/authentication/tokens",
        permissions: ["post", "put"]
      },
    ]
  },
  {
    roles: ["client"],
    allows: [
      {
        resources: "/sso/tokens",
        permissions: "post"
      },
      {
        resources: "/users/:userId/passwords/:token",
        permissions: "post"
      },
    ]
  },
  {
    roles: ["agent", "admin"],
    allows: [
      {
        resources: "/authentication/tokens",
        permissions: ["post", "put"]
      },
      {
        resources: "/sso/tokens",
        permissions: "post"
      },
      {
        resources: "/users/:userId/passwords/:token",
        permissions: "put"
      },
    ]
  },
  {
    roles: ["test"],
    allows: [
      {
        resources: "/testapitoken",
        permissions: ["post"]
      },
    ]
  }
]);

export class AclHelperModel {
  roles: any;
  allows: AllowPermission[];
}

export class AllowPermission {
  resources: string;
  permissions: any;
}

export class AclHelper {

  //     invokeRolesPolicies = (model: any, done: Function, error: Function) => {
  //             // const permissionModel = new AllowPermission();
  //       mongodb.MongoClient.connect(process.env.MONGODB_URI, function(errors: any, db: any) {
  //           if (errors) {
  //               error(errors);
  //            }
  //         let new_acl: any = "";
  //    // Using the memory backend
  //   /**
  //    * Invoke Articles Permissions
  //    */
  //     //  console.log("option");
  //   //  console.log(model);
  //    new_acl = new acl(new acl.mongodbBackend(db, "", true));
  //     // new_acl = new acl(new acl.mongodbBackend(db, "", true));
  //     new_acl.allow([
  //         {
  //             roles: ["guest", "member"],
  //             allows: [
  //                 {resources: "blogs", permissions: "get"},
  //                 // {resources:['forums', 'news'], permissions:['get', 'put', 'delete']}
  //             ]
  //         }],  function(err: any) {
  //             if (err) {
  //                 error(err);
  //             } else {
  //                 done({Message: "Test"});
  //             }
  //          });
  // });
  // }


  assignRole = (userid: string, role: string, done: Function, error: Function) => {
    // mongodb.MongoClient.connect(process.env.MONGODB_URI, function(errorRes: any, db: any) {
    //  let new_acl: any = "";
    //  new_acl = new acl(new acl.memoryBackend());
      new_acl.addUserRoles(userid, role, function(err: any) {
        if (err) {
          error(err);
        } else {
          done({ Message: "Role Added" });
        }
      });
    // });
  }

  getPermissions = (userid: string, resources: any, done: Function, error: Function) => {
   // mongodb.MongoClient.connect(process.env.MONGODB_URI, function(errorRes: any, db: any) {
   //   let new_acl: any = "";
    //  new_acl = new acl(new acl.memoryBackend());
      new_acl.allowedPermissions(userid, resources, function(err: any, permissions: any) {
        if (err) {
          error(err);
        } else {
          console.log(permissions);
          done(permissions);
        }
      });
  //  });
  }
  allowed = (userid: string, resources: any, method: any, done: Function, error: Function) => {
    mongoose.connect(process.env.MONGODB_URI || process.env.MONGOLAB_URI, { useMongoClient: true });
    mongoose.connection.on("error", () => {
      console.log("MongoDB connection error. Please make sure MongoDB is running.");
      process.exit();
    });
    mongodb.MongoClient.connect(process.env.MONGODB_URI, function(errorRes: any, db: any) {
      let new_acl: any = "";
      new_acl = new acl(new acl.mongodbBackend(db));
      new_acl.isAllowed(userid, resources, method, function(err: any, res: any) {
        if (err) {
          error(err);
        } else {
          console.log(res);
          done(res);
        }
      });
    });
  }

  isAllowedT = function(req: any, res: any, done: Function, error: Function) {
    const roles = (req.user) ? req.user.roles : ["guest"];
    console.log(req.user);
    // If an article is being processed and the current user created it then allow any manipulation
    // if (req.article && req.user && req.article.user && req.article.user.id === req.user.id) {
    //   return next();
    // }
    // Check for user roles
    mongodb.MongoClient.connect(process.env.MONGODB_URI, function(errorRes: any, db: any) {
      let new_acl: any = "";
      new_acl = new acl(new acl.mongodbBackend(db));
      new_acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function(err: any, isAllowed: any) {
        if (err) {
          // An authorization error occurred.
          error(err);
        } else {
          if (isAllowed) {
            // Access granted! Invoke next middleware
            done(isAllowed);
          } else {
            error(err);
          }
        }
      });
    });
  };
  //   acl.allowedPermissions('james', ['blogs', 'forums'], function(err, permissions){
  //     console.log(permissions)
  // })

  // exports.invokeRolesPolicies = function(acl: any) {
  //   acl.allow([{
  //     roles: ["guest"],
  //     allows: [, {
  //       resources: "/testtokens",
  //       permissions: ["get"]
  //     }]
  //   }]);
  // };

  // isAllowed = function(req: any, res: any, next: any) {
  //   const roles = (req.user) ? req.user.roles : ["guest"];
  //   console.log(req.user);
  //   // If an article is being processed and the current user created it then allow any manipulation
  //   if (req.article && req.user && req.article.user && req.article.user.id === req.user.id) {
  //     return next();
  //   }

  //   // Check for user roles
  //   acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function(err: any, isAllowed: any) {
  //     if (err) {
  //       // An authorization error occurred.
  //       return res.status(500).send("Unexpected authorization error");
  //     } else {
  //       if (isAllowed) {
  //         // Access granted! Invoke next middleware
  //         return next();
  //       } else {
  //         return res.status(403).json({
  //           message: "User is not authorized"
  //         });
  //       }
  //     }
  //   });
  isAllowsed = function(req: any, res: any, next: any) {
    console.log("isAllowsed");
    // const roles: any = (req.body.roles) ? req.body.roles : ["test"];
    const roles: any = (req.body.roles) ? req.body.roles : ["test"];
    console.log(req.body.roles);
    console.log(req.body.user);
    // If an article is being processed and the current user created it then allow any manipulation
    // if ( req.user && req.article.user && req.article.user.id === req.body.user) {
    //   return next();
    // }
    // let new_acl: any = "";
    // new_acl  = new acl(new acl.memoryBackend());
    // Check for user roles
    console.log(roles);
    console.log(req.route.path);
    console.log(req.method.toLowerCase());
  new_acl.areAnyRolesAllowed(roles, req.route.path, req.method.toLowerCase(), function(err: any, isAllowed: any) {
      if (err) {
        // An authorization error occurred.
        return res.status(500).send("Unexpected authorization error");
      } else {
        if (isAllowed) {
          // Access granted! Invoke next middleware
          return next();
        } else {
          return res.status(403).json({
            message: "User is not authorized"
          });
        }
      }
    });
  };
}
