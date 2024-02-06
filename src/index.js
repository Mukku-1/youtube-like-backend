import dotenv from "dotenv";
import connectDB from "./db/index.js";
import { app } from "./app.js";

dotenv.config({
  path: "./env",
});

connectDB()
  .then(() => {
    app.on("error", (err) => {
      console.log("Can't connect to DB !!!", err);
      throw err;
    });
    app.listen(`${process.env.PORT}`, () => {
      console.log("server is linstening port 3000");
    });
  })
  .catch();
