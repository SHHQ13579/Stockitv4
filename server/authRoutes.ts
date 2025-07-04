{\rtf1\ansi\ansicpg1252\cocoartf2761
\cocoatextscaling0\cocoaplatform0{\fonttbl\f0\fswiss\fcharset0 Helvetica;}
{\colortbl;\red255\green255\blue255;}
{\*\expandedcolortbl;;}
\paperw11900\paperh16840\margl1440\margr1440\vieww14840\viewh19400\viewkind0
\pard\tx720\tx1440\tx2160\tx2880\tx3600\tx4320\tx5040\tx5760\tx6480\tx7200\tx7920\tx8640\pardirnatural\partightenfactor0

\f0\fs24 \cf0 import \{ Router \} from "express";\
import bcrypt from "bcrypt";\
import crypto from "crypto";\
import \{ storage \} from "./storage";\
import \{ db \} from "./db";\
import \{ users \} from "@shared/schema";\
import SibApiV3Sdk from 'sib-api-v3-sdk';\
\
// Setup Brevo (Sendinblue)\
const brevoClient = SibApiV3Sdk.ApiClient.instance;\
const apiKey = brevoClient.authentications['api-key'];\
apiKey.apiKey = process.env.BREVO_API_KEY; // <-- THIS LINE IS REQUIRED\
\
const sendTransacEmail = new SibApiV3Sdk.TransactionalEmailsApi();\
\
const router = Router();\
\
// Registration endpoint\
router.post("/api/register", async (req, res) => \{\
  try \{\
    const \{ email, password \} = req.body;\
    if (!email || !password)\
      return res.status(400).json(\{ error: "Email and password required" \});\
\
    const existing = await storage.findUserByEmail(email);\
    if (existing) return res.status(400).json(\{ error: "User already exists" \});\
\
    const passwordHash = await bcrypt.hash(password, 10);\
    const user = await storage.upsertUser(\{ email, password: passwordHash \});\
    res.json(\{ success: true, user: \{ id: user.id, email: user.email \} \});\
  \} catch (err) \{\
    console.error("Registration error:", err);\
    res.status(500).json(\{ error: "Registration failed" \});\
  \}\
\});\
\
// Request password reset\
router.post("/api/request-password-reset", async (req, res) => \{\
  try \{\
    const \{ email \} = req.body;\
    if (!email) return res.status(400).json(\{ error: "Email required" \});\
\
    const user = await storage.findUserByEmail(email);\
    if (!user) return res.status(200).json(\{ success: true \}); // Don't reveal user existence\
\
    // Generate token\
    const token = crypto.randomBytes(32).toString("hex");\
    const expires = new Date(Date.now() + 1000 * 60 * 60); // 1 hour from now\
\
    // Save token and expiry to user\
    await db.update(users)\
      .set(\{ resetToken: token, resetTokenExpires: expires \})\
      .where(users.id.eq(user.id));\
\
    // Send email with Brevo\
    const resetLink = `https://stockitv4.onrender.com/reset-password?token=$\{token\}&email=$\{encodeURIComponent(email)\}`;\
    try \{\
      await sendTransacEmail.sendTransacEmail(\{\
        to: [\{ email \}],\
        sender: \{ email: 'no-reply@seanhannaconsultancy.co.uk', name: 'Stockit Stock Management' \},\
        subject: 'Password Reset Request',\
        htmlContent: `<p>Click the link below to reset your password:</p>\
                      <p><a href="$\{resetLink\}">$\{resetLink\}</a></p>\
                      <p>This link will expire in 1 hour.</p>`\
      \});\
    \} catch (mailErr) \{\
      console.error("Error sending email:", mailErr);\
      // Optionally, handle email errors\
    \}\
\
    res.json(\{ success: true \});\
  \} catch (err) \{\
    console.error("Password reset request error:", err);\
    res.status(500).json(\{ error: "Failed to send password reset email" \});\
  \}\
\});\
\
// Perform password reset\
router.post("/api/reset-password", async (req, res) => \{\
  try \{\
    const \{ email, token, newPassword \} = req.body;\
    if (!email || !token || !newPassword)\
      return res.status(400).json(\{ error: "Email, token, and new password required" \});\
\
    const user = await storage.findUserByEmail(email);\
    if (!user || !user.resetToken || !user.resetTokenExpires)\
      return res.status(400).json(\{ error: "Invalid or expired reset token" \});\
\
    if (\
      user.resetToken !== token ||\
      new Date(user.resetTokenExpires) < new Date()\
    ) \{\
      return res.status(400).json(\{ error: "Invalid or expired reset token" \});\
    \}\
\
    const passwordHash = await bcrypt.hash(newPassword, 10);\
\
    // Clear the token and update password\
    await db.update(users)\
      .set(\{\
        password: passwordHash,\
        resetToken: null,\
        resetTokenExpires: null,\
      \})\
      .where(users.id.eq(user.id));\
\
    res.json(\{ success: true \});\
  \} catch (err) \{\
    console.error("Password reset error:", err);\
    res.status(500).json(\{ error: "Failed to reset password" \});\
  \}\
\});\
\
export default router;}