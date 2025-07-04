{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww11520\viewh8400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ Router \} from "express";\
import bcrypt from "bcrypt";\
import \{ storage \} from "./storage";\
\
// You can import and use this router in your main server file!\
const router = Router();\
\
// Registration endpoint\
router.post("/api/register", async (req, res) => \{\
  try \{\
    const \{ email, password \} = req.body;\
\
    if (!email || !password)\
      return res.status(400).json(\{ error: "Email and password required" \});\
\
    // Check if user already exists\
    const existing = await storage.findUserByEmail(email);\
    if (existing) \{\
      return res.status(400).json(\{ error: "User already exists" \});\
    \}\
\
    // Hash password\
    const passwordHash = await bcrypt.hash(password, 10);\
\
    // Insert user (your upsertUser method may need adapting)\
    const user = await storage.upsertUser(\{\
      email,\
      password: passwordHash,\
    \});\
\
    res.json(\{ success: true, user: \{ id: user.id, email: user.email \} \});\
  \} catch (err) \{\
    console.error("Registration error:", err);\
    res.status(500).json(\{ error: "Registration failed" \});\
  \}\
\});\
\
// Simple password reset request (send a reset link - for demo, just updates password if you POST new one)\
// In production you would email a reset token!\
router.post("/api/reset-password", async (req, res) => \{\
  try \{\
    const \{ email, newPassword \} = req.body;\
\
    if (!email || !newPassword)\
      return res.status(400).json(\{ error: "Email and new password required" \});\
\
    const user = await storage.findUserByEmail(email);\
    if (!user) return res.status(404).json(\{ error: "User not found" \});\
\
    const passwordHash = await bcrypt.hash(newPassword, 10);\
\
    // You may need to adapt this if upsertUser expects more fields\
    await storage.upsertUser(\{\
      ...user,\
      password: passwordHash,\
    \});\
\
    res.json(\{ success: true \});\
  \} catch (err) \{\
    console.error("Password reset error:", err);\
    res.status(500).json(\{ error: "Password reset failed" \});\
  \}\
\});\
\
export default router;}