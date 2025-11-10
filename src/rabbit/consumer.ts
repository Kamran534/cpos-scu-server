import type { ConsumeMessage } from 'amqplib';
import { connectRabbitMQ, QUEUE_NAME } from '../config/rabbitmq.js';

export async function consumeMessages(): Promise<void> {
  try {
    const channel = await connectRabbitMQ();
    console.log(`📥 Waiting for messages in queue: ${QUEUE_NAME}`);
    channel.consume(QUEUE_NAME, (msg: ConsumeMessage | null) => {
      if (msg) {
        console.log('📬 Received message:', msg.content.toString());
        channel.ack(msg);
      }
    });
  } catch (err) {
    console.error('❌ Error consuming messages:', err);
  }
}

