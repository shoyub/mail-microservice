import express from "express";
import amqp from "amqplib";
import { Resend } from "resend";
import dotenv from "dotenv";
dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

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

        // 🚀 Send mail using Resend API
        const response = await resend.emails.send({
          from: "Chat App <onboarding@resend.dev>", // default sender
          to,
          subject,
          text: body,
        });

        console.log("📩 Mail sent successfully:", response);
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
