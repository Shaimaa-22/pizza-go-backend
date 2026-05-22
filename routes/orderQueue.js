const mqtt = require("mqtt")
const db = require("../db")

const MQTT_BROKER =
  process.env.MQTT_BROKER || "mqtt://broker.hivemq.com"

const MQTT_TOPIC =
  process.env.MQTT_TOPIC || "pizza/orders"

const mqttClient = mqtt.connect(MQTT_BROKER)

let machineBusy = false
let currentOrderId = null
let lastStatusAt = null

const ORDER_TIMEOUT = 5 * 60 * 1000 // 5 minutes
const CHECK_INTERVAL = 30 * 1000 // 30 seconds

mqttClient.on("connect", () => {
  console.log("Queue MQTT connected ✅")
})

async function processNextOrder() {
  if (machineBusy) return

  try {
    const result = await db.query(`
      SELECT
        c.command_id,
        c.order_id,
        c.command_payload
      FROM esp32_commands c
      JOIN orders o ON o.order_id = c.order_id
      WHERE c.sent_to_esp = false
      AND o.order_status = 'queued'
      ORDER BY o.created_at ASC
      LIMIT 1
    `)

    if (result.rows.length === 0) return

    const command = result.rows[0]

    machineBusy = true
    currentOrderId = command.order_id
    lastStatusAt = Date.now()

    mqttClient.publish(
      MQTT_TOPIC,
      JSON.stringify(command.command_payload),
      { qos: 1 },
      async (err) => {
        if (err) {
          machineBusy = false
          currentOrderId = null
          lastStatusAt = null
          console.error("MQTT publish error ❌", err)
          return
        }

        await db.query(
          `
          UPDATE esp32_commands
          SET sent_to_esp = true, sent_at = NOW()
          WHERE command_id = $1
          `,
          [command.command_id]
        )

        await db.query(
          `
          UPDATE orders
          SET order_status = 'dough'
          WHERE order_id = $1
          `,
          [command.order_id]
        )

        console.log(`Order ${command.order_id} sent to ESP32 ✅`)
      }
    )
  } catch (err) {
    machineBusy = false
    currentOrderId = null
    lastStatusAt = null
    console.error("Queue error ❌", err)
  }
}

function updateMachineActivity(orderId = null) {
  if (currentOrderId && orderId && Number(orderId) !== Number(currentOrderId)) {
    return
  }

  lastStatusAt = Date.now()
}

function releaseMachine() {
  machineBusy = false
  currentOrderId = null
  lastStatusAt = null
  processNextOrder()
}

setInterval(async () => {
  if (!machineBusy || !currentOrderId || !lastStatusAt) return

  const diff = Date.now() - lastStatusAt

  if (diff > ORDER_TIMEOUT) {
    try {
      await db.query(
        `
        UPDATE orders
        SET order_status = 'error'
        WHERE order_id = $1
        `,
        [currentOrderId]
      )

      console.error(
        `Order ${currentOrderId} timed out ❌ Machine released`
      )

      releaseMachine()
    } catch (err) {
      console.error("Timeout handler error ❌", err)
    }
  }
}, CHECK_INTERVAL)

module.exports = {
  processNextOrder,
  releaseMachine,
  updateMachineActivity,
}
