import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const uri = process.env.MONGODB_URI || 'mongodb+srv://hjkhairnar2104_db_user:Harsh%40123@cluster0.h4mrmmh.mongodb.net/resqgrid?retryWrites=true&w=majority&appName=Cluster0';

async function cleanRawEntries() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) {
    console.error('No DB connection');
    return;
  }

  // Filter raw mock domains to purge
  const rawDomains = ['example.com', 'gov.in', 'resqgrid.com', 'resqgrid.gov.in'];
  const filter = {
    $or: rawDomains.map(d => ({ email: new RegExp(d + '$', 'i') }))
  };

  const usersDeleted = await db.collection('users').deleteMany(filter);
  console.log('Deleted raw dummy users count:', usersDeleted.deletedCount);

  const recipientsDeleted = await db.collection('recipients').deleteMany(filter);
  console.log('Deleted raw dummy recipients count:', recipientsDeleted.deletedCount);

  // Remove mock ananya.barua dummy if exists
  await db.collection('users').deleteMany({ email: /ananya\.barua/i });
  await db.collection('recipients').deleteMany({ email: /ananya\.barua/i });

  // List remaining real users
  const remainingUsers = await db.collection('users').find().toArray();
  console.log('\n--- REMAINING REAL USERS (' + remainingUsers.length + ') ---');
  remainingUsers.forEach(u => console.log('Real User:', u.name, '| Email:', u.email, '| Role:', u.role));

  const remainingRecipients = await db.collection('recipients').find().toArray();
  console.log('\n--- REMAINING REAL RECIPIENTS (' + remainingRecipients.length + ') ---');
  remainingRecipients.forEach(r => console.log('Real Recipient:', r.name, '| Email:', r.email));

  await mongoose.disconnect();
}

cleanRawEntries().catch(console.error);
