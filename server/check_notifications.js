const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI)
  .then(async () => {
    console.log('Connected to DB');
    const notifications = await mongoose.connection.db.collection('notifications').find({}).toArray();
    console.log('Notifications found:', notifications.length);
    notifications.forEach(n => console.log(`- [${n.type}] To: ${n.recipient} | From: ${n.sender} | ${n.body?.substring(0, 30)}...`));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
