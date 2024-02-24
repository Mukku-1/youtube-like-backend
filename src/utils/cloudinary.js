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

const deleteOnCloudinary = async (public_id) => {
  console.log("this mgs from deletercloudinay func ", public_id);
  try {
    if (!public_id) {
      return null;
    }
    return await cloudinary.uploader.destroy(public_id);
  } catch (error) {
    console.log(error?.message);
  }
};

export { uploadOnCloudinary, deleteOnCloudinary };
