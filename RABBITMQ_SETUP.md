# RabbitMQ Setup Guide

## Overview

RabbitMQ is used in the POS Server for message queuing and asynchronous task processing, particularly for synchronizing data with external services like TradeUnleashed.

## Quick Start

### Start RabbitMQ

```bash
cd pos-server

# Start all services (PostgreSQL + RabbitMQ)
docker-compose up -d

# Or start only RabbitMQ
docker-compose up -d rabbitmq
```

### Verify RabbitMQ is Running

```bash
docker ps | grep rabbitmq
```

You should see `cpos-rabbitmq` container running.

### Access RabbitMQ Management UI

Open your browser and go to: **http://localhost:15672**

**Login Credentials:**
- Username: `guest`
- Password: `guest`

## Connection Details

### For Application

In your `.env` file:

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
QUEUE_NAME=cpos_queue
QUEUE_TYPE=quorum
```

### Ports

- **5672**: AMQP protocol port (for application connections)
- **15672**: Management UI port (web interface)

## RabbitMQ Management UI Features

### 1. Overview
- View connection statistics
- Monitor message rates (publish/deliver)
- Check node health
- View resource usage

### 2. Connections
- See active connections from your application
- Monitor connection states
- View channels per connection

### 3. Channels
- Check active channels
- Monitor message throughput
- View channel states

### 4. Exchanges
- View declared exchanges
- Check exchange types (direct, topic, fanout, headers)
- Monitor message routing

### 5. Queues
- View all queues
- Check queue depth (number of messages)
- Monitor message rates
- Purge or delete queues

### 6. Admin
- Manage users
- Set permissions
- Configure virtual hosts (vhosts)

## Common Operations

### Check Queue Status

1. Go to **http://localhost:15672**
2. Click on "Queues" tab
3. Look for `cpos_queue`
4. Check:
   - **Ready**: Messages waiting to be consumed
   - **Unacked**: Messages being processed
   - **Total**: Total messages in queue

### Publish Test Message

1. Go to **Queues** tab
2. Click on your queue name (`cpos_queue`)
3. Scroll to **Publish message** section
4. Enter your message payload
5. Click **Publish message**

### Purge Queue

1. Go to **Queues** tab
2. Click on your queue name
3. Scroll to **Delete / Purge** section
4. Click **Purge Messages**

### Monitor Message Flow

1. Go to **Overview** tab
2. Check the **Message rates** graph
3. Monitor:
   - Publish rate
   - Deliver rate
   - Acknowledgment rate

## Docker Commands

### View RabbitMQ Logs

```bash
docker logs cpos-rabbitmq -f
```

### Check RabbitMQ Status

```bash
docker exec cpos-rabbitmq rabbitmq-diagnostics ping
```

### Restart RabbitMQ

```bash
docker-compose restart rabbitmq
```

### Stop RabbitMQ

```bash
docker-compose stop rabbitmq
```

### Remove RabbitMQ Data

```bash
docker-compose down -v
docker volume rm pos-server_rabbitmq_data
```

## Troubleshooting

### Port 5672 Already in Use

If RabbitMQ is already installed locally:

1. Stop local RabbitMQ service
2. Or change port in `docker-compose.yml`:
   ```yaml
   ports:
     - "5673:5672"   # Use 5673 instead
     - "15673:15672" # Use 15673 for management
   ```
3. Update `.env`:
   ```env
   RABBITMQ_URL=amqp://guest:guest@localhost:5673
   ```

### Container Won't Start

```bash
# Check logs
docker logs cpos-rabbitmq

# Remove and recreate
docker-compose down
docker-compose up -d rabbitmq
```

### Can't Access Management UI

1. Make sure container is running:
   ```bash
   docker ps | grep rabbitmq
   ```

2. Check if port is accessible:
   ```bash
   netstat -ano | findstr :15672
   ```

3. Try accessing from container:
   ```bash
   docker exec cpos-rabbitmq wget -O- http://localhost:15672
   ```

### Connection Refused from Application

1. Check if RabbitMQ is running:
   ```bash
   docker ps
   ```

2. Verify connection URL in `.env`:
   ```env
   RABBITMQ_URL=amqp://guest:guest@localhost:5672
   ```

3. Test connection from container:
   ```bash
   docker exec cpos-rabbitmq rabbitmq-diagnostics check_running
   ```

## Queue Configuration

The POS Server uses **Quorum Queues** for high availability and data safety:

```env
QUEUE_TYPE=quorum
```

### Quorum Queue Benefits:
- ✅ Data replication
- ✅ High availability
- ✅ Message ordering guarantees
- ✅ Poison message handling

### Alternative: Classic Queue

If you prefer classic queues:

```env
QUEUE_TYPE=classic
```

## Integration with POS Server

### Sync Worker

The POS Server uses RabbitMQ for async data synchronization:

```bash
# Start the sync worker
npm run worker:sync
```

### Message Flow

1. **Producer** (Main Server)
   - Publishes sync tasks to `cpos_queue`
   - Tasks include product sync, order sync, etc.

2. **Consumer** (Sync Worker)
   - Listens to `cpos_queue`
   - Processes sync tasks
   - Acknowledges completed tasks

### Monitor Sync Tasks

1. Go to **http://localhost:15672**
2. Navigate to **Queues** → `cpos_queue`
3. Check:
   - **Messages ready**: Pending sync tasks
   - **Message rates**: Sync throughput
   - **Consumer details**: Active workers

## Advanced Configuration

### Enable Plugins

```bash
docker exec cpos-rabbitmq rabbitmq-plugins enable rabbitmq_shovel
docker exec cpos-rabbitmq rabbitmq-plugins enable rabbitmq_federation
```

### View Enabled Plugins

```bash
docker exec cpos-rabbitmq rabbitmq-plugins list
```

### Create New User

```bash
docker exec cpos-rabbitmq rabbitmqctl add_user myuser mypassword
docker exec cpos-rabbitmq rabbitmqctl set_user_tags myuser administrator
docker exec cpos-rabbitmq rabbitmqctl set_permissions -p / myuser ".*" ".*" ".*"
```

### Create Virtual Host

```bash
docker exec cpos-rabbitmq rabbitmqctl add_vhost myvhost
docker exec cpos-rabbitmq rabbitmqctl set_permissions -p myvhost guest ".*" ".*" ".*"
```

## Production Considerations

### Security

1. **Change default credentials**:
   ```yaml
   environment:
     RABBITMQ_DEFAULT_USER: admin
     RABBITMQ_DEFAULT_PASS: strong_password_here
   ```

2. **Update `.env`**:
   ```env
   RABBITMQ_URL=amqp://admin:strong_password_here@localhost:5672
   ```

### Performance

1. **Increase memory limit**:
   ```yaml
   environment:
     RABBITMQ_VM_MEMORY_HIGH_WATERMARK: 2GB
   ```

2. **Enable lazy queues** for large backlogs:
   ```bash
   docker exec cpos-rabbitmq rabbitmqctl set_policy lazy-queue "^cpos_" \
     '{"queue-mode":"lazy"}' --apply-to queues
   ```

### Monitoring

1. **Enable Prometheus metrics**:
   ```bash
   docker exec cpos-rabbitmq rabbitmq-plugins enable rabbitmq_prometheus
   ```

2. **Access metrics**: http://localhost:15692/metrics

## Useful Resources

- **Official Docs**: https://www.rabbitmq.com/documentation.html
- **Management UI Guide**: https://www.rabbitmq.com/management.html
- **Quorum Queues**: https://www.rabbitmq.com/quorum-queues.html
- **Best Practices**: https://www.rabbitmq.com/best-practices.html
