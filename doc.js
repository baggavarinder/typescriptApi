const Docs = require('express-api-doc');
const app = require('./src/server'); // your app.js
const docs = new Docs(app);
docs.generate({
  path:     './Api-Doc/template.html',
});