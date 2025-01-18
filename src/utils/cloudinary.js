import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } from "../constants-private.js";

// Configuration
    cloudinary.config({
        cloud_name: CLOUDINARY_CLOUD_NAME,
        api_key: CLOUDINARY_API_KEY,
        api_secret: CLOUDINARY_API_SECRET,
});
    
// cloudinary.config({
//     cloud_name: 'dcmnkxmla',
//     api_key: '276922275822296',
//     api_secret: 'bMdwJJC53XvAppGO-0AoLiRObPk' 
// });

const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null
        //upload file 
        const response = await cloudinary.uploader.upload(
            localFilePath, {
              resource_type:"auto"
          }
        );
        console.log("File upload successfully!!", response.url);
        fs.unlinkSync(localFilePath);
        return response;
    } catch (error) {
        console.log(error);
        fs.unlinkSync(localFilePath); //remove file from local server on failur , as it's Sync fucntion so code will wait to complate the task
        return null;
    }
}

export default uploadOnCloudinary;