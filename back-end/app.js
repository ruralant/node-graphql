require('./config/config');

const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const graphql = require('express-graphql');

const graphqlSchema = require('./graphql/schema');
const graphqlResolver = require('./graphql/resolvers');
const auth = require('./middleware/auth');
const { clearImage } = require('./util/file');

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'images');
  },
  filename: (req, file, cb) => {
    cb(null, `${new Date().toISOString()}-${file.originalname}`)
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'image/png' || file.mimetype === 'image/jpg' || file.mimetype === 'image/jpeg') {
    cb(null, true)
  } else {
    cb(null, false)
  }
}

// app.use(bodyParser.urlencoded()); // x-www-form-urlencoded <form>
app.use(bodyParser.json());
app.use(multer({ storage: fileStorage, fileFilter }).single('image'));
app.use('/images', express.static(path.join(__dirname, 'images')));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

app.use(auth);

app.put('/upload-image', (req, res, next) => {
  if (!req.isAth) throw new Error('Not authenticated');
  if (!req.file) return res.status(200).json({ message: 'No file provided' });
  
  if (req.body.oldPath) clearImage(req.body.oldPath);

  return res.status(201).json({ message: 'File uploaded', filePath: req.file.path });
})

app.use('/graphql', graphql({
  schema: graphqlSchema,
  rootValue: graphqlResolver,
  graphiql: true,
  formatError(err) {
    if (!err.originalError) return err;
    const data = err.originalError.data;
    const code = err.originalError.code || 500;
    const { message } = err || 'An error occurred';
    return { message, status: code, data };
  }
}))

app.use((error, req, res, next) => {
  console.log(error);
  const { statusCode } = error || 500;
  const { message, data } = error;
  res.status(statusCode).json({ message, data });
});

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true })
  .then(() => {
    app.listen(process.env.PORT);
  })
  .catch(e => console.log(e));