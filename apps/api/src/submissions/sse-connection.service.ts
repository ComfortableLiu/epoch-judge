import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisKeys } from '@epoch-judge/redis';
import type { Subscriber } from 'rxjs';
import { RedisService } from '../redis/redis.service';
import { INSTANCE_ID } from '../common/instance-id';

const CONN_TTL_SEC = 3600; // 1 hour TTL for connection tracking keys
const DEFAULT_MAX_CONNECTIONS = 3;

interface EvictionMessage {
  instanceId: string;
  connectionId: string;
  userId: string;
}

@Injectable()
export class SseConnectionService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SseConnectionService.name);
  private readonly maxConnections: number;
  private evictionSubscriber: ReturnType<typeof this.redis.client.duplicate> | null = null;

  /** Local connection tracking: userId → connectionId → Subscriber */
  private readonly connections = new Map<string, Map<string, Subscriber<MessageEvent>>>();

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.maxConnections = Number(
      this.config.get('SSE_MAX_CONNECTIONS_PER_USER', String(DEFAULT_MAX_CONNECTIONS)),
    );
  }

  async onModuleInit() {
    // Create a dedicated subscriber for eviction signals
    this.evictionSubscriber = this.redis.client.duplicate();
    await this.evictionSubscriber.subscribe(RedisKeys.sseEvict());
    this.evictionSubscriber.on('message', (_channel, message) => {
      try {
        const msg = JSON.parse(message) as EvictionMessage;
        if (msg.instanceId === INSTANCE_ID) {
          this.handleLocalEviction(msg.userId, msg.connectionId);
        }
      } catch {
        /* ignore malformed messages */
      }
    });
    this.logger.log(`SSE connection limit: ${this.maxConnections} per user (instance=${INSTANCE_ID})`);
  }

  async onModuleDestroy() {
    // Close all local connections
    for (const [userId, connMap] of this.connections) {
      for (const [connectionId, subscriber] of connMap) {
        try { subscriber.complete(); } catch { /* ignore */ }
        connMap.delete(connectionId);
      }
      this.connections.delete(userId);
    }
    if (this.evictionSubscriber) {
      await this.evictionSubscriber.unsubscribe(RedisKeys.sseEvict());
      await this.evictionSubscriber.quit();
    }
  }

  /**
   * Register a new SSE connection. Returns true if allowed, false if evicted immediately.
   * If the user exceeds the limit, the oldest connection is evicted.
   */
  async registerConnection(
    userId: string,
    connectionId: string,
    subscriber: Subscriber<MessageEvent>,
  ): Promise<void> {
    const key = RedisKeys.sseConnections(userId);
    const member = `${INSTANCE_ID}:${connectionId}`;
    const now = Date.now();

    // Add to Redis sorted set
    await this.redis.client.zadd(key, now, member);
    // Refresh TTL
    await this.redis.client.expire(key, CONN_TTL_SEC);

    // Add to local map
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Map());
    }
    this.connections.get(userId)!.set(connectionId, subscriber);

    // Check connection count
    const count = await this.redis.client.zcard(key);
    if (count > this.maxConnections) {
      // Get oldest member (lowest score)
      const oldest = await this.redis.client.zrange(key, 0, 0);
      if (oldest.length > 0) {
        const [oldestInstance, oldestConnId] = this.parseMember(oldest[0]);
        // Remove from sorted set
        await this.redis.client.zrem(key, oldest[0]);
        // Send eviction signal
        await this.redis.client.publish(
          RedisKeys.sseEvict(),
          JSON.stringify({
            instanceId: oldestInstance,
            connectionId: oldestConnId,
            userId,
          } satisfies EvictionMessage),
        );
        this.logger.debug(`Evicted connection ${oldestConnId} for user ${userId}`);
      }
    }
  }

  /**
   * Unregister an SSE connection (called on normal close/teardown).
   */
  async unregisterConnection(userId: string, connectionId: string): Promise<void> {
    const member = `${INSTANCE_ID}:${connectionId}`;

    // Remove from Redis
    await this.redis.client.zrem(RedisKeys.sseConnections(userId), member);

    // Remove from local map
    const connMap = this.connections.get(userId);
    if (connMap) {
      connMap.delete(connectionId);
      if (connMap.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  /**
   * Handle a local eviction signal — close the connection on this instance.
   */
  private handleLocalEviction(userId: string, connectionId: string) {
    const connMap = this.connections.get(userId);
    if (!connMap) return;
    const subscriber = connMap.get(connectionId);
    if (!subscriber) return;

    try {
      subscriber.complete();
    } catch {
      /* already closed */
    }
    connMap.delete(connectionId);
    if (connMap.size === 0) {
      this.connections.delete(userId);
    }
    this.logger.debug(`Locally evicted connection ${connectionId} for user ${userId}`);
  }

  private parseMember(member: string): [string, string] {
    const idx = member.indexOf(':');
    if (idx === -1) return [member, ''];
    return [member.slice(0, idx), member.slice(idx + 1)];
  }
}
