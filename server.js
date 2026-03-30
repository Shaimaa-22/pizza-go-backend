require("dotenv").config()
const express = require("express")
const bodyParser = require("body-parser")
const cors = require("cors")
const authRoutes = require("./routes/auth")
const orderRoutes = require("./routes/orders")
const paymentRoutes = require("./routes/payment")

const db = require("./db")

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

// إنشاء الجداول والبيانات الأولية
async function createTables() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id SERIAL PRIMARY KEY,
        full_name VARCHAR(100) NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(user_id) ON DELETE SET NULL,
        pizza_size VARCHAR(20) NOT NULL,
        total_price DECIMAL(8,2) NOT NULL,
        payment_status VARCHAR(20) DEFAULT 'pending',
        order_status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS toppings (
        topping_id SERIAL PRIMARY KEY,
        topping_name VARCHAR(50) UNIQUE NOT NULL
      );
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS order_toppings (
        order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
        topping_id INT REFERENCES toppings(topping_id) ON DELETE CASCADE,
        topping_value BOOLEAN DEFAULT TRUE,
        PRIMARY KEY (order_id, topping_id)
      );
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS esp32_commands (
        command_id SERIAL PRIMARY KEY,
        order_id INT REFERENCES orders(order_id) ON DELETE CASCADE,
        command_payload JSONB NOT NULL,
        sent_to_esp BOOLEAN DEFAULT FALSE,
        sent_at TIMESTAMP
      );
    `)

    await db.query(`
      CREATE TABLE IF NOT EXISTS app_settings (
        id SERIAL PRIMARY KEY,
        setting_key VARCHAR(255) UNIQUE NOT NULL,
        setting_value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)

    await db.query(`
      INSERT INTO toppings (topping_name)
      VALUES ('Olive'), ('Mushroom'), ('Tomato')
      ON CONFLICT (topping_name) DO NOTHING;
    `)

    await db.query(`
      INSERT INTO app_settings (setting_key, setting_value)
      VALUES 
        ('dough_count', '100'),
        ('total_revenue', '0')
      ON CONFLICT (setting_key) DO NOTHING;
    `)

    console.log("Tables and initial data created successfully ✅")
  } catch (err) {
    console.error("Error creating tables ❌", err)
  }
}

createTables()

const PORT = process.env.PORT || 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`[v0] Server running on port ${PORT}`)
  console.log(`[v0] Environment: ${process.env.NODE_ENV || "development"}`)
})
