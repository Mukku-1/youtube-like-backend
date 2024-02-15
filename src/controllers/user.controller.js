import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "../models/user.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
  //get all the user information from front
  //validation of the information that is meeting our requirement
  //checking user is new or already registered
  //checking for avatar and cover image because it is our requirement
  //upload file on cloudinary
  //checking the file upload is success full or not in the local environment or cloud both
  //create a user object -> create entry in db
  //remove password and refresh token from the response field
  //checking for user creation
  //return response
  const { email, fullName, username, password } = req.body;

  if (
    [email, fullName, username, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "all field is required");
  }
  const exitedUser = await User.findOne({
    $or: [{ email }, { username }],
  });
  if (exitedUser) {
    throw new ApiError(409, "email and username is already registered");
  }
  let avatarImageLocal = req.files?.avatar[0]?.path;

  if (!avatarImageLocal) {
    throw new ApiError(403, "Avatar is required");
  }
  let coverImageLocal = null;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.converImage.length > 0
  ) {
    coverImageLocal = req.files.coverImage[0].path;
  }
  let avatar = await uploadOnCloudinary(avatarImageLocal);
  let converImage = await uploadOnCloudinary(coverImageLocal);

  if (!avatar) {
    throw new ApiError(404, "Avatar image is required");
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
    avatar: avatar.url,
    converImage: converImage.url,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(
      500,
      "something went wrong while creating user try again"
    );
  }

  return res
    .status(200)
    .json(new ApiResponse(200, createdUser, "user created successfully"));
});

export { registerUser };
