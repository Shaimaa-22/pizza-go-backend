const express = require("express")
const router = express.Router()
const db = require("../db")
const auth = require("../middleware/auth")
const mqtt = require("mqtt")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com"
const MQTT_TOPIC = process.env.MQTT_TOPIC || "pizza/orders"

const mqttClient = mqtt.connect(MQTT_BROKER)
mqttClient.on("connect", () => console.log("Connected to MQTT broker"))

router.get("/toppings", auth, async(req, res) => {
    try {
        const result = await db.query("SELECT * FROM toppings ORDER BY topping_id")
        res.json(result.rows)
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Server error" })
    }
})

router.post("/create", auth, async(req, res) => {
    const { pizza_size, total_price, toppings, payment_status, payment_intent_id } = req.body
    const user_id = req.user.user_id

    if (!pizza_size || !total_price || !toppings) {
        return res.status(400).json({ error: "Missing fields" })
    }

    try {
        if (payment_intent_id) {
            const paymentIntent = await stripe.paymentIntents.retrieve(payment_intent_id)

            if (paymentIntent.status !== "succeeded") {
                return res.status(400).json({ error: "Payment not completed" })
            }

            // Verify amount matches
            const expectedAmount = Math.round(total_price * 100)
            if (paymentIntent.amount !== expectedAmount) {
                return res.status(400).json({ error: "Payment amount mismatch" })
            }
        } else if (payment_status !== "success") {
            // Fallback: check payment_status if no payment_intent_id
            return res.status(400).json({ error: "Payment not successful" })
        }

        // 1) Insert order
        const orderQ = `INSERT INTO orders (user_id, pizza_size, total_price, payment_status, order_status)
                    VALUES ($1,$2,$3,'success','processing') RETURNING order_id, created_at`
        const orderRes = await db.query(orderQ, [user_id, pizza_size, total_price])
        const order_id = orderRes.rows[0].order_id

        // 2) Insert order_toppings for each provided topping if exists in toppings table
        for (const [name, val] of Object.entries(toppings)) {
            if (name.toLowerCase() === "cheese" || name.toLowerCase() === "sauce") continue
            const tQ = `SELECT topping_id FROM toppings WHERE LOWER(topping_name)=LOWER($1)`
            const tRes = await db.query(tQ, [name])
            if (tRes.rows.length > 0) {
                const topping_id = tRes.rows[0].topping_id
                await db.query(`INSERT INTO order_toppings (order_id, topping_id, topping_value) VALUES ($1,$2,$3)`, [
                    order_id,
                    topping_id,
                    val ? true : false,
                ])
            }
        }

        // 3) Create esp32 command payload
        const espPayload = {
            order_id,
            cheese: 1,
            sauce: 1,
            ...toppings,
        }

        // 4) Insert to esp32_commands
        const espQ = `INSERT INTO esp32_commands (order_id, command_payload, sent_to_esp) VALUES ($1,$2,$3) RETURNING command_id`
        const espRes = await db.query(espQ, [order_id, JSON.stringify(espPayload), false])
        const command_id = espRes.rows[0].command_id

        // 5) Publish to MQTT
        mqttClient.publish(MQTT_TOPIC, JSON.stringify(espPayload), { qos: 1 }, async(err) => {
            if (err) {
                console.error("MQTT publish error", err)
            } else {
                await db.query(`UPDATE esp32_commands SET sent_to_esp=true, sent_at=NOW() WHERE command_id=$1`, [command_id])
            }
        })

        res.json({ order_id, message: "Order saved and sent to ESP32" })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Server error" })
    }
})

module.exports = router