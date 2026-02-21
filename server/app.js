const express = require('express');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const http = require('http');
const config = require('./config/config');
const { notFound, errorHandler } = require('./middleware/errorHandler');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const corsOptions = {
  origin: 'http://localhost:3000',
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204,
};

app.use(express.static(path.join(__dirname, 'uploads')));
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

const users = require('./routes/users');
const auth = require('./routes/auth');
const common = require('./routes/common');
const property = require('./routes/property');
const email = require('./routes/email');

app.get('/', (req, res) => { res.status(200).send('Success'); });

app.use('/api/user', users);
app.use('/api/auth', auth);
app.use('/api/common', common);
app.use('/api/property', property);
app.use('/api/email', email);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});