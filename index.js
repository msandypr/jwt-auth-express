import express from "express";
import db from "./config/Database.js";
import Users from "./models/UserModel.js";
import UserProfile from "./models/UserProfileModel.js";
import router from "./routes/index.js";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

dotenv.config();
const app = express();

try{
    await db.authenticate();
    console.log('Database Successfuly Connected');
    await Users.sync(); //Automatically generate table if not exists
    await UserProfile.sync(); //Automatically generate table if not exists
} catch(error){
    console.error(error);
}

app.use(cors({ credentials: true, origin: 'http://localhost:3000'})) //Origin aplikasi front-endnya
app.use(cookieParser());
app.use(express.json());
app.use(router);

app.listen(5000, () => console.log('Server running on port 5000'));