import { Injectable, Logger } from '@nestjs/common';
import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);
  readonly registry = new Registry();

  // HTTP metrics
  readonly httpRequestsTotal = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'path', 'status'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'path', 'status'] as const,
    buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1, 2, 5, 10],
    registers: [this.registry],
  });

  // Judge metrics
  readonly judgeQueueDepth = new Gauge({
    name: 'judge_queue_depth',
    help: 'Number of submissions in the judge queue',
    registers: [this.registry],
  });

  readonly judgeInflight = new Gauge({
    name: 'judge_inflight',
    help: 'Number of in-flight judge jobs',
    registers: [this.registry],
  });

  readonly judgeDuration = new Histogram({
    name: 'judge_duration_seconds',
    help: 'Judge task duration in seconds',
    labelNames: ['verdict'] as const,
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 120],
    registers: [this.registry],
  });

  readonly judgeTotal = new Counter({
    name: 'judge_total',
    help: 'Total number of judge tasks completed',
    labelNames: ['verdict'] as const,
    registers: [this.registry],
  });

  constructor() {
    // Collect default Node.js metrics (event loop lag, GC, etc.)
    collectDefaultMetrics({ register: this.registry });
    this.logger.log('Metrics service initialized');
  }

  async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  getContentType(): string {
    return this.registry.contentType;
  }
}
