import express from "express";
import amqp from "amqplib";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

export const startSendOtpConsumer = async () => {
  try {
    const connection = await amqp.connect({
      protocol: "amqp",
      hostname: process.env.Rabbitmq_Host,
      port: Number(process.env.Rabbitmq_Port) || 5672,
      username: process.env.Rabbitmq_Username,
      password: process.env.Rabbitmq_Password,
    });

    const channel = await connection.createChannel();
    const queueName = "send-otp";

    await channel.assertQueue(queueName, { durable: true });

    console.log("✅ Mail Service consumer started, listening for otp emails");

    channel.consume(queueName, async (msg) => {
      if (!msg) return;

      const payload = JSON.parse(msg.content.toString());
      console.log("📨 Received message from queue:", payload);

      try {
        const { to, subject, body } = payload;

        // ✅ BREVO SMTP CONFIG
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST, // smtp-relay.brevo.com
          port: Number(process.env.SMTP_PORT), // 587
          secure: false, // STARTTLS for port 587
          auth: {
            user: process.env.SMTP_USER, // 9db1ca001@smtp-brevo.com
            pass: process.env.SMTP_PASS, // your SMTP key
          },
          tls: {
            rejectUnauthorized: false,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_USER, // Brevo demands authenticated email as sender
          to,
          subject,
          text: body,
        });

        console.log(`📩 OTP mail successfully sent to ${to}`);
      } catch (error) {
        console.log("❌ ERROR sending OTP:", error);
      } finally {
        try {
          channel.ack(msg);
        } catch (err) {
          console.warn("⚠ Failed to ACK message:", err);
        }
      }
    });
  } catch (error) {
    console.log("❌ Failed to start RabbitMQ consumer:", error);
  }
};

// Auto-start consumer
startSendOtpConsumer();

// Dummy server for Render
const app = express();
const PORT = process.env.PORT || 10000;

app.get("/", (req, res) => {
  res.send("Mail service is running");
});

app.listen(PORT, () => {
  console.log(`Dummy server running on port ${PORT}`);
});
console.log("SMTP ENV:", process.env.SMTP_HOST, process.env.SMTP_USER);
