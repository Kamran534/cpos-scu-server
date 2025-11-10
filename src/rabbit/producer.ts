import { connectRabbitMQ, QUEUE_NAME } from '../config/rabbitmq.js';

export async function sendMessage(message: string): Promise<void> {
  try {
    const channel = await connectRabbitMQ();
    channel.sendToQueue(QUEUE_NAME, Buffer.from(message));
    console.log(`📨 Sent message to queue (${QUEUE_NAME}): ${message}`);
  } catch (err) {
    console.error('❌ Error sending message:', err);
  }
}

