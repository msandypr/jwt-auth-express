import UserProfile from "../models/allModels/UserProfileModel.js";
import processFile from '../middleware/ProcessFile.js';
import { format } from 'util';
import gcs from '../config/gcs.js';
import model from '../models/index.js';

const storage = gcs;
const bucketName = 'tourista-test.appspot.com';
const bucket = storage.bucket(bucketName);

export const getUserProfileById = async (req, res) => {
  const userId = req.params.id; // Gets the ID from the URL parameter
  const email = req.email; // Using an email from a verified token

  try {
    // Retrieving UserProfile information by ID
    const userProfile = await UserProfile.findOne({
      where: { id: userId, email }
    });

    if (!userProfile) {
      return res.status(404).json({ msg: "You don't have access" });
    }

    res.json(userProfile);
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal server error" });
  }
};


export const createUserProfile = async (req, res) => {
  const { name, phone_number, address, photo_profile, user_lat, user_lot } = req.body;
  const email = req.email; // Using an email from a verified token

  try {
    // Check if a user profile with the same email already exists
    const existingProfile = await UserProfile.findOne({
      where: { email }
    });

    if (existingProfile) {
      return res.status(400).json({ msg: "User profile already exists" });
    }

    // Create a new user profile if it doesn't already exist
    const userProfile = await UserProfile.create({
      name,
      phone_number,
      address,
      photo_profile,
      user_lat,
      user_lot,
      email
    });

    res.json(userProfile);
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal server error" });
  }
};


export const updateUserProfile = async (req, res) => {
  const { name, phone_number, address, photo_profile, user_lat, user_lot } = req.body;
  try {
    const userProfile = await UserProfile.findOne({ where: { email: req.email } });
    if (!userProfile) {
      return res.status(404).json({ msg: "User profile not found" });
    }
    await userProfile.update({
      name,
      phone_number,
      address,
      photo_profile,
      user_lat,
      user_lot
    });
    res.json({ msg: "User profile updated successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal server error" });
  }
};

export const deleteUserProfile = async (req, res) => {
  const email = req.email; // Using an email from a verified token

  try {
    const userProfile = await UserProfile.findOne({ where: { email } });

    if (!userProfile) {
      return res.status(404).json({ msg: "User profile not found" });
    }

    // Added checking whether the authorized email matches the profile email of the user to be deleted
    if (userProfile.email !== email) {
      return res.status(403).json({ msg: "Unauthorized" });
    }

    await userProfile.destroy();
    res.json({ msg: "User profile deleted successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).json({ msg: "Internal server error" });
  }
};

export const uploadFile = async (req, res) => {
  const emailUser = req.email;
  try {
    await model.UserProfile.findOne({
      email: emailUser,
    });
    await processFile(req, res);
    // Create a new blob in the bucket and upload the file data.
    const blob = bucket.file(req.file.originalname);
    const blobStream = blob.createWriteStream({
      resumable: false,
    });

    blobStream.on('error', (err) => {
      res.status(500).send({ message: err.message });
    });

    blobStream.on('finish', async (data) => {
      // Create URL for directly file access via HTTP.
      const publicUrl = format(`https://storage.googleapis.com/${bucket.name}/${blob.name}`);
      await model.UserProfile.update(
        { photo_profile: publicUrl },
        {
          where: {
            email: emailUser,
          },
        }
      );
      res.status(200).send({
        message: 'Your Profile Picture Successfully Updated : ' + req.file.originalname,
        url: publicUrl,
      });
    });

    blobStream.end(req.file.buffer);
  } catch (err) {
    if (err.code == 'LIMIT_FILE_SIZE') {
      return res.status(500).send({
        message: 'Files cannot be larger than 2MB!',
      });
    }
    res.status(500).send({
      message: `Unable to upload file: ${req.file.originalname}. ${err}`,
    });
  }
};