const express = require("express")
const mqtt = require("mqtt")

const router = express.Router()

const MQTT_BROKER =
  process.env.MQTT_BROKER || "mqtt://broker.hivemq.com"

const HEARTBEAT_TOPIC =
  process.env.MQTT_HEARTBEAT_TOPIC || "pizza/heartbeat"

let lastHeartbeat = 0

const client = mqtt.connect(MQTT_BROKER)

client.on("connect", () => {
  console.log("MQTT heartbeat listener connected ✅")

  client.subscribe(HEARTBEAT_TOPIC, { qos: 1 }, (err) => {
    if (err) {
      console.error("Heartbeat subscribe error ❌", err)
    } else {
      console.log(`Subscribed to ${HEARTBEAT_TOPIC}`)
    }
  })
})

client.on("message", (topic, message) => {
  try {
    const data = JSON.parse(message.toString())

    if (data.status === "online") {
      lastHeartbeat = Date.now()
      console.log("ESP32 heartbeat received ✅")
    }
  } catch (err) {
    console.error("Heartbeat message error ❌", err.message)
  }
})

router.get("/status", (req, res) => {
  const online = Date.now() - lastHeartbeat <= 30000

  res.json({
    online,
    lastHeartbeat,
  })
})

module.exports = router
