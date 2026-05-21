const mqtt = require("mqtt");
const db = require("../db");

const MQTT_BROKER = process.env.MQTT_BROKER || "mqtt://broker.hivemq.com";
const MQTT_STATUS_TOPIC = process.env.MQTT_STATUS_TOPIC || "pizza/status";

const allowedStatuses = [
  "paid",
  "queued",
  "dough",
  "sauce",
  "cheese",
  "toppings",
  "heating",
  "ready",
  "error",
];

function startMqttStatusListener() {
  const client = mqtt.connect(MQTT_BROKER);

  client.on("connect", () => {
    console.log("MQTT status listener connected ✅");
    client.subscribe(MQTT_STATUS_TOPIC, { qos: 1 }, (err) => {
      if (err) console.error("MQTT status subscribe error ❌", err);
      else console.log(`Subscribed to ${MQTT_STATUS_TOPIC}`);
    });
  });

  client.on("message", async (topic, message) => {
    try {
      const data = JSON.parse(message.toString());

      const orderId = data.orderId || data.order_id;
      const status = data.status;
      const statusMessage = data.message || "";

      if (!orderId || !status) return;

      if (!allowedStatuses.includes(status)) {
        console.log("Ignored invalid status:", status);
        return;
      }

      await db.query(
        `
        UPDATE orders
        SET order_status = $1
        WHERE order_id = $2
        `,
        [status, orderId]
      );

      console.log(`Order ${orderId} status updated to ${status}`, statusMessage);
    } catch (err) {
      console.error("MQTT status message error ❌", err.message);
    }
  });
}

module.exports = startMqttStatusListener;
