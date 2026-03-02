import mongoose from "mongoose";

const getMongoUri = () => {
  const rawUri = process.env.MONGODB_URI;
  if (!rawUri) {
    throw new Error("MONGODB_URI is not set");
  }

  const parsed = new URL(rawUri);

  // If DB name is not provided in URI path, force the app DB.
  if (!parsed.pathname || parsed.pathname === "/") {
    parsed.pathname = "/greencart";
  }

  return parsed.toString();
};

const connectDB = async () => {
  try {
    mongoose.connection.on("connected", () => console.log("Database connected"));
    await mongoose.connect(getMongoUri());
  } catch (error) {
    console.error("Database connection failed:", error.message);
    throw error;
  }
};


export default connectDB;
