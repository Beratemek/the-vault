
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('Users found:', users.length);
    users.forEach(u => console.log(`- ${u.username} (${u.email})`));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
