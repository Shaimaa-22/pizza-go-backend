const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")

function normalizeMessage(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/call lips/g, "olives")
    .replace(/all lips/g, "olives")
    .replace(/all lamps/g, "olives")
    .replace(/olive/g, "olives")
    .replace(/tomatoes/g, "tomato")
    .replace(/mushrooms/g, "mushroom")
}

router.post("/ask", auth, async (req, res) => {
  const message = normalizeMessage(req.body.message)

  let reply = ""
  let actions = []

  if (!message.trim()) {
    return res.json({
      reply: "I did not hear you clearly. Please say that again.",
      actions: [],
    })
  }

  if (
    message.includes("bye") ||
    message.includes("goodbye") ||
    message.includes("end call") ||
    message.includes("stop call")
  ) {
    return res.json({
      reply: "Okay, thank you for calling Pizza Go. Goodbye!",
      actions: [{ type: "end_call" }],
    })
  }

  if (
    message.includes("pay") ||
    message.includes("payment") ||
    message.includes("checkout") ||
    message.includes("that's it") ||
    message.includes("thats it") ||
    message.includes("nothing else")
  ) {
    return res.json({
      reply: "Perfect, I will take you to the payment page now.",
      actions: [{ type: "go_payment" }],
    })
  }

  if (message.includes("hello") || message.includes("hi")) {
    return res.json({
      reply:
        "Hi! Welcome to Pizza Go. You can tell me what toppings you want.",
      actions: [],
    })
  }

  const toppings = ["olives", "tomato", "mushroom"]

  if (
    message.includes("add") ||
    message.includes("want") ||
    message.includes("with")
  ) {
    toppings.forEach((topping) => {
      if (message.includes(topping)) {
        actions.push({
          type: "add_topping",
          topping,
        })
      }
    })

    if (actions.length > 0) {
      const names = actions.map((a) => a.topping).join(" and ")
      return res.json({
        reply: `Sure, I added ${names} to your pizza. Anything else?`,
        actions,
      })
    }

    return res.json({
      reply:
        "This topping is not available right now. You can choose olives, tomato, or mushroom.",
      actions: [],
    })
  }

  if (
    message.includes("remove") ||
    message.includes("without") ||
    message.includes("no ")
  ) {
    toppings.forEach((topping) => {
      if (message.includes(topping)) {
        actions.push({
          type: "remove_topping",
          topping,
        })
      }
    })

    if (actions.length > 0) {
      const names = actions.map((a) => a.topping).join(" and ")
      return res.json({
        reply: `Okay, I removed ${names} from your pizza.`,
        actions,
      })
    }

    return res.json({
      reply: "Tell me which topping you want to remove.",
      actions: [],
    })
  }

  return res.json({
    reply:
      "Sorry, I can help you add toppings, remove toppings, or continue to payment.",
    actions: [],
  })
})

module.exports = router
