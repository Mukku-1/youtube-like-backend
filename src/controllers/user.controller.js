import { asyncHandler } from "../utils/asyncHandler.js";

const registerUser = asyncHandler(async (req, res) => {
  res.status(200).json({
    message: "Mukku hello world from your server which is running on port 3000",
  });
});

export { registerUser };
