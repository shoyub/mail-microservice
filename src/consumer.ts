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

      try {
        const { to, subject, body } = payload;

        const transporter = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: process.env.USER,
            pass: process.env.PASSWORD,
          },
        });

        await transporter.sendMail({
          from: "Chat App",
          to,
          subject,
          text: body,
        });

        console.log(`📩 OTP mail sent to ${to}`);
      } catch (error) {
        console.log("❌ Failed to send OTP (acknowledging anyway)", error);
      } finally {
        try {
          channel.ack(msg);
        } catch (err) {
          console.warn("⚠ Failed to ack message", err);
        }
      }
    });
  } catch (error) {
    console.log("❌ Failed to start RabbitMQ consumer", error);
  }
};

// 🚀 IMPORTANT: Start the consumer automatically when the file runs
startSendOtpConsumer();
