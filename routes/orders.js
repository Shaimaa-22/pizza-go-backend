const express = require("express")
const router = express.Router()

const db = require("../db")
const auth = require("../middleware/auth")

const {
  enqueueOrder,
} = require("./orderQueue")

/* =========================
   GET TOPPINGS
========================= */
router.get(
  "/toppings",
  auth,
  async (req, res) => {
    try {

      const result =
        await db.query(
          `
          SELECT *
          FROM toppings
          ORDER BY topping_id ASC
          `
        )

      res.json(result.rows)

    } catch (err) {

      console.error(
        "Get toppings error ❌",
        err
      )

      res.status(500).json({
        error:
          "Server error",
      })
    }
  }
)

/* =========================
   CREATE ORDER
========================= */
router.post(
  "/create",
  auth,
  async (req, res) => {

    const client =
      await db.connect()

    try {

      const userId =
        req.user.user_id

      const {
        pizza_size,
        toppings,
        total_price,
      } = req.body

      if (
        !pizza_size ||
        !total_price
      ) {
        return res
          .status(400)
          .json({
            error:
              "Missing required fields",
          })
      }

      await client.query(
        "BEGIN"
      )

      /* ===== CREATE ORDER ===== */
      const orderResult =
        await client.query(
          `
          INSERT INTO orders
          (
            user_id,
            pizza_size,
            total_price,
            payment_status,
            order_status
          )
          VALUES
          ($1, $2, $3, $4, $5)
          RETURNING *
          `,
          [
            userId,
            pizza_size,
            total_price,
            "paid",
            "queued",
          ]
        )

      const order =
        orderResult.rows[0]

      /* ===== SAVE TOPPINGS ===== */
      if (
        toppings &&
        typeof toppings ===
          "object"
      ) {

        for (const [
          toppingId,
          selected,
        ] of Object.entries(
          toppings
        )) {

          if (
            Number(selected) ===
            1
          ) {

            await client.query(
              `
              INSERT INTO order_toppings
              (
                order_id,
                topping_id
              )
              VALUES
              ($1, $2)
              `,
              [
                order.order_id,
                toppingId,
              ]
            )
          }
        }
      }

      await client.query(
        "COMMIT"
      )

      /* ===== ADD TO MACHINE QUEUE ===== */
      enqueueOrder(
        order.order_id
      )

      console.log(
        `Order #${order.order_id} queued ✅`
      )

      res.json({
        success: true,
        message:
          "Order created successfully",
        order_id:
          order.order_id,
      })

    } catch (err) {

      await client.query(
        "ROLLBACK"
      )

      console.error(
        "Create order error ❌",
        err
      )

      res.status(500).json({
        error:
          "Server error",
      })

    } finally {

      client.release()
    }
  }
)

/* =========================
   GET ORDER STATUS
========================= */
router.get(
  "/status/:orderId",
  auth,
  async (req, res) => {

    try {

      const {
        orderId,
      } = req.params

      const userId =
        req.user.user_id

      const result =
        await db.query(
          `
          SELECT
            order_id,
            payment_status,
            order_status,
            created_at
          FROM orders
          WHERE order_id = $1
          AND user_id = $2
          `,
          [
            orderId,
            userId,
          ]
        )

      if (
        result.rows.length ===
        0
      ) {
        return res
          .status(404)
          .json({
            error:
              "Order not found",
          })
      }

      res.json(
        result.rows[0]
      )

    } catch (err) {

      console.error(
        "Get order status error ❌",
        err
      )

      res.status(500).json({
        error:
          "Server error",
      })
    }
  }
)

/* =========================
   GET MY ORDERS
========================= */
router.get(
  "/my-orders",
  auth,
  async (req, res) => {

    try {

      const userId =
        req.user.user_id

      const result =
        await db.query(
          `
          SELECT
            order_id,
            pizza_size,
            total_price,
            payment_status,
            order_status,
            created_at
          FROM orders
          WHERE user_id = $1
          ORDER BY created_at DESC
          `,
          [userId]
        )

      res.json(
        result.rows
      )

    } catch (err) {

      console.error(
        "Get my orders error ❌",
        err
      )

      res.status(500).json({
        error:
          "Server error",
      })
    }
  }
)

module.exports =
  router
