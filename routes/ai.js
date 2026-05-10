const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

const allowedToppings = ["olive", "mushroom", "tomato", "cheese"];

router.post("/ask", auth, async (req, res) => {
  const message = String(req.body.message || "").toLowerCase();

  let reply = "";
  let action = null;

  if (!message.trim()) {
    return res.json({
      reply: "I did not hear you clearly. Please say that again.",
      action: null,
    });
  }

  if (
    message.includes("end call") ||
    message.includes("stop call") ||
    message.includes("bye") ||
    message.includes("goodbye")
  ) {
    return res.json({
      reply: "Okay, thank you for calling Pizza Go. Goodbye!",
      action: { type: "end_call" },
    });
  }

  if (message.includes("hi") || message.includes("hello")) {
    reply =
      "Hi! Welcome to Pizza Go. You can ask me to add toppings, remove toppings, change quantity, check the total, or go to payment.";
  }

  else if (message.includes("add") || message.includes("want")) {
    const topping = allowedToppings.find((t) => message.includes(t));

    if (topping) {
      reply = `Sure, I added ${topping} to your pizza. Anything else?`;
      action = { type: "add_topping", topping };
    } else {
      reply =
        "This topping is not available right now. You can choose olive, mushroom, tomato, or cheese.";
    }
  }

  else if (
    message.includes("remove") ||
    message.includes("without") ||
    message.includes("no ")
  ) {
    const topping = allowedToppings.find((t) => message.includes(t));

    if (topping) {
      reply = `Okay, I removed ${topping} from your pizza.`;
      action = { type: "remove_topping", topping };
    } else {
      reply = "Tell me which topping you want to remove.";
    }
  }

  else if (
    message.includes("quantity") ||
    message.includes("make it") ||
    message.includes("one") ||
    message.includes("two") ||
    message.includes("three") ||
    message.includes("four") ||
    message.includes("1") ||
    message.includes("2") ||
    message.includes("3") ||
    message.includes("4")
  ) {
    let quantity = null;

    if (message.includes("one") || message.includes("1")) quantity = 1;
    if (message.includes("two") || message.includes("2")) quantity = 2;
    if (message.includes("three") || message.includes("3")) quantity = 3;
    if (message.includes("four") || message.includes("4")) quantity = 4;

    if (quantity) {
      reply = `Done, I changed the quantity to ${quantity}.`;
      action = { type: "set_quantity", quantity };
    } else {
      reply = "Please tell me the quantity, for example: make it two pizzas.";
    }
  }

  else if (
    message.includes("price") ||
    message.includes("total") ||
    message.includes("how much")
  ) {
    reply = "Sure, I will read your total now.";
    action = { type: "read_total" };
  }

  else if (
    message.includes("payment") ||
    message.includes("checkout") ||
    message.includes("pay")
  ) {
    reply = "Okay, I will take you to the payment page.";
    action = { type: "go_payment" };
  }

  else {
    reply =
      "Sorry, I can help you add toppings, remove toppings, change quantity, check total price, or continue to payment.";
  }

  res.json({ reply, action });
});

module.exports = router;
