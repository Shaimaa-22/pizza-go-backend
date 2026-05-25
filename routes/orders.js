const express = require("express")
const router = express.Router()
const db = require("../db")
const auth = require("../middleware/auth")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)
const { processNextOrder } = require("./orderQueue")
/* =========================
   GET TOPPINGS
========================= */

router.get("/toppings", auth, async (req, res) => {
  try {
    const result = await db.query(
      "SELECT * FROM toppings ORDER BY topping_id"
    )

    res.json(result.rows)
  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: "Server error",
    })
  }
})

/* =========================
   CREATE ORDER
========================= */

router.post("/create", auth, async (req, res) => {
  const {
    pizza_size,
    total_price,
    toppings,
    payment_status,
    payment_intent_id,
  } = req.body

  const user_id = req.user.user_id

  if (!pizza_size || !total_price || !toppings) {
    return res.status(400).json({
      error: "Missing fields",
    })
  }

  try {
    /* =========================
       VERIFY STRIPE PAYMENT
    ========================= */

    if (payment_intent_id) {
      const paymentIntent =
        await stripe.paymentIntents.retrieve(payment_intent_id)

      if (paymentIntent.status !== "succeeded") {
        return res.status(400).json({
          error: "Payment not completed",
        })
      }

      const expectedAmount = Math.round(total_price * 100)

      if (paymentIntent.amount !== expectedAmount) {
        return res.status(400).json({
          error: "Payment amount mismatch",
        })
      }
    } else if (payment_status !== "success") {
      return res.status(400).json({
        error: "Payment not successful",
      })
    }

    /* =========================
       INSERT ORDER AS QUEUED
    ========================= */

    const orderQ = `
      INSERT INTO orders
      (
        user_id,
        pizza_size,
        total_price,
        payment_status,
        order_status
      )
      VALUES
      (
        $1,
        $2,
        $3,
        'success',
        'queued'
      )
      RETURNING order_id, created_at
    `

    const orderRes = await db.query(orderQ, [
      user_id,
      pizza_size,
      total_price,
    ])

    const order_id = orderRes.rows[0].order_id

    /* =========================
       INSERT TOPPINGS
    ========================= */

    for (const [name, val] of Object.entries(toppings)) {
      if (
        name.toLowerCase() === "cheese" ||
        name.toLowerCase() === "sauce"
      ) {
        continue
      }

      const tQ = `
        SELECT topping_id
        FROM toppings
        WHERE LOWER(topping_name) = LOWER($1)
      `

      const tRes = await db.query(tQ, [name])

      if (tRes.rows.length > 0) {
        const topping_id = tRes.rows[0].topping_id

        await db.query(
          `
          INSERT INTO order_toppings
          (
            order_id,
            topping_id,
            topping_value
          )
          VALUES ($1, $2, $3)
          `,
          [order_id, topping_id, val ? true : false]
        )
      }
    }

    /* =========================
       ESP32 PAYLOAD
    ========================= */

    const espPayload = {
      order_id,
      ...toppings,
      cheese: 1,
      sauce: toppings.sauce || toppings.Sauce ? 1 : 0,
    }

    /* =========================
       SAVE COMMAND ONLY
    ========================= */

    const espQ = `
      INSERT INTO esp32_commands
      (
        order_id,
        command_payload,
        sent_to_esp
      )
      VALUES ($1, $2, false)
      RETURNING command_id
    `

    await db.query(espQ, [
      order_id,
      JSON.stringify(espPayload),
    ])

    /* =========================
       START QUEUE
    ========================= */

    processNextOrder()

    res.json({
      order_id,
      message: "Order saved in queue",
    })
  } catch (err) {
    console.error(err)

    res.status(500).json({
      error: "Server error",
    })
  }
})

/* =========================
   GET ORDER STATUS
========================= */

router.get("/status/:orderId", auth, async (req, res) => {
  try {
    const orderId = req.params.orderId
    const userId = req.user.user_id

    const result = await db.query(
      `
      SELECT
        order_id,
        order_status,
        payment_status,
        created_at
      FROM orders
      WHERE order_id = $1
      AND user_id = $2
      `,
      [orderId, userId]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: "Order not found",
      })
    }

    res.json(result.rows[0])
  } catch (err) {
    console.error("Get order status error ❌", err)

    res.status(500).json({
      error: "Server error",
    })
  }
})

module.exports = router
