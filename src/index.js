import dotenv from "dotenv";
import connectDB from "./db/index.js";
import app from "./app.js";

dotenv.config({
  path:'./.env'
});

connectDB()
  .then(() => {
    app.on("error", (error) => {
      console.log(error);
      throw error;
    });

    app.listen(process.env.PORT || 9000, () => {
      console.log(`App is running on http://localhost:${process.env.PORT}`);
    });
  })
  .catch((err) => {
    console.log(`MONGODB connection error ${err}`);
  });









































// import express from 'express'
// const app = express()

// ; (async() => {
//     try {
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
//         app.on("error", (error) => {
//             console.log(error);
//             throw error;
//         })

//         app.listen(process.env.PORT, () => {
//             console.log(
//               `App is running on http://localhost:${process.env.PORT}`
//             );

//         })
//     } catch (error) {
//         console.error("ERROR:", error);
//         throw error;
//     }
// })()
