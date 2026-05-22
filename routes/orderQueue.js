const mqtt = require("mqtt")
const db = require("../db")

const MQTT_BROKER =
  process.env.MQTT_BROKER || "mqtt://broker.hivemq.com"

const MQTT_TOPIC =
  process.env.MQTT_TOPIC || "pizza/orders"

const mqttClient = mqtt.connect(MQTT_BROKER)

let machineBusy = false

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

    mqttClient.publish(
      MQTT_TOPIC,
      JSON.stringify(command.command_payload),
      { qos: 1 },
      async (err) => {
        if (err) {
          machineBusy = false
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
    console.error("Queue error ❌", err)
  }
}

function releaseMachine() {
  machineBusy = false
  processNextOrder()
}

module.exports = {
  processNextOrder,
  releaseMachine,
}
