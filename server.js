const express = require("express");
const mongoose = require("mongoose");

const app = express();

app.use(express.json());

app.use(
  "/api/linkedin",
  require("./routes/linkedinWebhook")
);

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
  });

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});