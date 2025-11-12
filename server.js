require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const authRoutes = require("./routes/auth")
const orderRoutes = require("./routes/orders")
const paymentRoutes = require("./routes/payment")

const app = express()

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
    credentials: true,
  }),
)

app.use(bodyParser.json())

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend API is running",
    timestamp: new Date().toISOString(),
  })
})

app.use("/auth", authRoutes)
app.use("/orders", orderRoutes)
app.use("/payment", paymentRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[v0] Server running on port ${PORT}`)
  console.log(`[v0] Environment: ${process.env.NODE_ENV || "development"}`)
})
