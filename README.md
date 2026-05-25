# Pizza Go Backend

Pizza Go Backend is the server-side API for the Pizza Go graduation project: a smart web-based pizza ordering and automated pizza preparation system.

The backend connects the website, PostgreSQL database, Stripe payment, MQTT broker, and ESP32-controlled pizza machine.

---

## Features

- User registration and login
- JWT authentication
- PostgreSQL database connection
- Pizza toppings API
- Order creation and order history
- Stripe payment integration
- ESP32 command storage
- MQTT order queue
- Machine status tracking
- ESP32 heartbeat monitoring
- AI voice assistant endpoint

---

## Tech Stack

- Node.js
- Express.js
- PostgreSQL
- pg
- JWT
- bcryptjs
- Stripe
- MQTT
- dotenv
- CORS

---

## Project Structure

```txt
pizza-go-backend/
│
├── middleware/
│   └── auth.js
│
├── routes/
│   ├── ai.js
│   ├── auth.js
│   ├── mqttHeartbeat.js
│   ├── mqttStatus.js
│   ├── orderQueue.js
│   ├── orders.js
│   └── payment.js
│
├── db.js
├── server.js
├── test-server.js
├── package.json
└── README.md
```

---

## Environment Variables

Create a `.env` file in the root directory:

```env
PORT=3000
DATABASE_URL=your_postgresql_database_url
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key

MQTT_BROKER=mqtt://broker.hivemq.com
MQTT_TOPIC=pizza/orders
MQTT_STATUS_TOPIC=pizza/status
MQTT_HEARTBEAT_TOPIC=pizza/heartbeat
```

---

## Installation

```bash
npm install
```

---

## Run the Server

```bash
npm start
```

The API will run on:

```txt
http://localhost:3000
```

---

## API Endpoints

### Health Check

```http
GET /
```

---

## Authentication

### Register

```http
POST /auth/register
```

```json
{
  "full_name": "User Name",
  "email": "user@example.com",
  "password": "password123"
}
```

### Login

```http
POST /auth/login
```

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

The login response returns a JWT token.

---

## Orders

All order endpoints require:

```http
Authorization: Bearer YOUR_TOKEN
```

### Get Toppings

```http
GET /orders/toppings
```

### Create Order

```http
POST /orders/create
```

```json
{
  "pizza_size": "standard",
  "total_price": 5.5,
  "payment_status": "success",
  "toppings": {
    "Olive": 1,
    "Mushroom": 0,
    "Tomato": 1,
    "Sauce": 1
  }
}
```

### Get Order Status

```http
GET /orders/status/:orderId
```

### Get My Orders

```http
GET /orders/my-orders
```

---

## Payment

### Create Payment Intent

```http
POST /payment/create-payment-intent
```

```json
{
  "amount": 5.5
}
```

### Verify Payment

```http
GET /payment/verify-payment/:paymentIntentId
```

---

## Machine and MQTT Flow

1. User creates and pays for an order.
2. Backend saves the order in PostgreSQL.
3. Backend creates an ESP32 command.
4. The queue system sends the command through MQTT.
5. ESP32 receives the order and starts the machine process.
6. ESP32 sends status updates.
7. Backend updates the order status.
8. User can track the order from the website.

---

## Database Tables

The backend creates and uses these tables:

```txt
users
orders
toppings
order_toppings
esp32_commands
app_settings
```

---

## Order Status Examples

```txt
queued
dough
sauce
cheese
toppings
heating
ready
error
```

---

## Deployment

The backend is suitable for deployment on Render.

Build command:

```bash
npm install
```

Start command:

```bash
npm start
```

Required environment variables on Render:

```env
DATABASE_URL
JWT_SECRET
STRIPE_SECRET_KEY
MQTT_BROKER
MQTT_TOPIC
MQTT_STATUS_TOPIC
MQTT_HEARTBEAT_TOPIC
```

---

## Notes

- The frontend should send toppings by topping name.
- Cheese is included by default in the machine payload.
- Sauce is optional.
- Orders are processed using a queue to prevent multiple orders from running on the machine at the same time.
- MQTT is used to communicate with the ESP32.

---

## Author

**Shaimaa Dwedar**  
CE 
