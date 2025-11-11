import type { ConsumeMessage } from 'amqplib';
import { connectRabbitMQ, QUEUE_NAME } from '../config/rabbitmq.js';
import { userSyncService, type UserSyncPayload } from '../services/userSyncService.js';

function parseMessage(msg: ConsumeMessage): unknown {
  try {
    const content = msg.content.toString();
    return JSON.parse(content);
  } catch (error) {
    console.error('❌ Failed to parse message content as JSON:', error);
    return null;
  }
}

async function handleMessage(payload: unknown): Promise<void> {
  if (!payload || typeof payload !== 'object') {
    console.warn('⚠️  Ignoring message without JSON payload object');
    return;
  }

  const { type, data } = payload as { type?: string; data?: unknown };

  switch (type) {
    case 'user.sync':
    case 'user':
    case 'user.update': {
      const userPayload: UserSyncPayload =
        (data as UserSyncPayload | undefined) ?? (payload as UserSyncPayload);
      const user = await userSyncService.syncUser(userPayload);
      console.log(`✅ Synced user ${user.email} (role: ${user.role.name})`);
      break;
    }
    default:
      console.log('ℹ️  Received message without handler:', payload);
  }
}

export async function consumeMessages(): Promise<void> {
  try {
    const channel = await connectRabbitMQ();
    console.log(`[RabbitMQ] Waiting for messages in queue: ${QUEUE_NAME}`);
    channel.consume(QUEUE_NAME, (msg: ConsumeMessage | null) => {
      if (!msg) return;

      void (async () => {
        try {
          console.log('📬 Received message:', msg.content.toString());
          const payload = parseMessage(msg);
          if (payload) {
            await handleMessage(payload);
          }
          channel.ack(msg);
        } catch (error) {
          console.error('❌ Error processing message:', error);
          channel.nack(msg, false, false);
        }
      })();
    });
  } catch (err) {
    console.error('❌ Error consuming messages:', err);
  }
}

