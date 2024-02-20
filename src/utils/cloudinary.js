import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: "dfxt0gflz",
  api_key: "163753623186827",
  api_secret: "PuKQF4YKN2uBMzQb0mD-DqDvqCA",
});

const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });
    fs.unlinkSync(localFilePath);
    return response;
  } catch (error) {
    fs.unlinkSync(localFilePath);
    return null;
  }
};

const deleteOnCloudinary = async (path) => {
  try {
    if (!path) {
      return null;
    }
    await cloudinary.uploader.destroy(path);
  } catch (error) {
    console.log(error?.message);
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
