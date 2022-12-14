require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/error");

connectDB();

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);

app.use("/api/auth", require("./routes/auth/auth.router"));
app.use("/api/private", require("./routes/private/private.router"));

// should be last
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log("Listening on port " + PORT);
});

process.on("unhandledRejection", (err) => {
  console.log("unhandledRejection error: " + err);
  server.close(() => process.exit(1));
});
