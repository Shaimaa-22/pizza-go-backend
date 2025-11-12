const express = require("express")
const router = express.Router()
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")
const db = require("../db")

const JWT_SECRET = process.env.JWT_SECRET || "secret"

// register
router.post("/register", async(req, res) => {
    try {
        const { full_name, email, password } = req.body
        if (!full_name || !email || !password) return res.status(400).json({ error: "Missing fields" })

        const hashed = await bcrypt.hash(password, 10)
        const q = `INSERT INTO users (full_name, email, password_hash) VALUES ($1,$2,$3) RETURNING user_id, full_name, email, created_at`
        const result = await db.query(q, [full_name, email, hashed])
        const user = result.rows[0]

        res.json({ user })
    } catch (err) {
        if (err.code === "23505")
        // unique_violation
            return res.status(400).json({ error: "Email already exists" })
        console.error(err)
        res.status(500).json({ error: "Server error" })
    }
})

// login
router.post("/login", async(req, res) => {
    try {
        const { email, password } = req.body
        const q = `SELECT user_id, full_name, email, password_hash FROM users WHERE email=$1`
        const result = await db.query(q, [email])
        if (result.rows.length === 0) return res.status(401).json({ error: "Invalid credentials" })

        const user = result.rows[0]
        const ok = await bcrypt.compare(password, user.password_hash)
        if (!ok) return res.status(401).json({ error: "Invalid credentials" })

        const token = jwt.sign({ user_id: user.user_id, email: user.email }, JWT_SECRET, { expiresIn: "7d" })
        res.json({ token, user: { user_id: user.user_id, full_name: user.full_name, email: user.email } })
    } catch (err) {
        console.error(err)
        res.status(500).json({ error: "Server error" })
    }
})

module.exports = router