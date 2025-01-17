import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Configuration
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload file 
        const response = await cloudinary.uploader.upload(
            localFilePath, {
              resource_type:"auto"
          }
        );
        console.log("File upload successfully!!",response.url);
        return response;
    } catch (error) {
        fs.unlinkSync(localFilePath); //remove file from local server on failur , as it's Sync fucntion so code will wait to complate the task
        return null;
    }
}