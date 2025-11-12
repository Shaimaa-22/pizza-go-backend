require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const authRoutes = require("./routes/auth")
const orderRoutes = require("./routes/orders")
const paymentRoutes = require("./routes/payment")

const app = express()
app.use(cors())
app.use(bodyParser.json())

app.use("/auth", authRoutes)
app.use("/orders", orderRoutes)
app.use("/payment", paymentRoutes)

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`)
})