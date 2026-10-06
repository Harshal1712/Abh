import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

console.log("URI is:", process.env.MONGODB_URI);

mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log("Connected!"))
  .catch(err => {
    console.error("Error:", err.message);
    console.error("Full error:", err);
  });
