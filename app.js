const express = require('express');
const dotenv = require('dotenv');
const sequelize = require('./config/db');

dotenv.config();
const app = express();
app.use(express.json());

sequelize.authenticate()
  .then(() => console.log('PostgreSQL Connected'))
  .catch(err => console.error('DB connection error:', err));

app.get('/', (req, res) => {
  res.send('PostgreSQL');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
