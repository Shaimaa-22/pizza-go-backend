const express = require("express")
const router = express.Router()
const auth = require("../middleware/auth")
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

// Create payment intent
router.post("/create-payment-intent", auth, async(req, res) => {
    const { amount } = req.body

    if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Invalid amount" })
    }

    try {
        const paymentIntent = await stripe.paymentIntents.create({
            amount: Math.round(amount * 100), // Convert to cents
            currency: "usd",
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                user_id: req.user.user_id,
            },
        })

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
        })
    } catch (error) {
        console.error("Stripe error:", error)
        res.status(500).json({ error: error.message })
    }
})

// Verify payment status
router.get("/verify-payment/:paymentIntentId", auth, async(req, res) => {
    const { paymentIntentId } = req.params

    try {
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

        res.json({
            status: paymentIntent.status,
            amount: paymentIntent.amount / 100,
        })
    } catch (error) {
        console.error("Stripe verification error:", error)
        res.status(500).json({ error: error.message })
    }
})

module.exports = router