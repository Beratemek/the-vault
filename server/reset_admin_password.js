const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');
    const result = await mongoose.connection.db.collection('users').updateOne(
        { username: 'admin' },
        { $set: { password: 'admin123' } }
    );
    console.log('Updated:', result.modifiedCount, 'user(s)');
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
