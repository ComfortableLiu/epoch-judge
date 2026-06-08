import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SkipThrottle, Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { from, mergeMap, Observable } from 'rxjs';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { SUBMISSION_THROTTLE } from '../common/throttle.config';
import { Locale } from '../common/locale.decorator';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '@epoch-judge/redis';
import { CreateSubmissionDto } from './submissions.dto';
import { SseConnectionService } from './sse-connection.service';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  private judgeEventsSubscribed = false;

  constructor(
    private readonly submissions: SubmissionsService,
    private readonly redis: RedisService,
    private readonly sseConns: SseConnectionService,
  ) {}

  private ensureJudgeEventsSubscribed() {
    if (!this.judgeEventsSubscribed) {
      this.judgeEventsSubscribed = true;
      void this.redis.subscriber.subscribe(RedisKeys.judgeEvents());
    }
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle(SUBMISSION_THROTTLE)
  @Post()
  create(
    @Req() req: { user: { id: string; role: Role } },
    @Body() dto: CreateSubmissionDto,
    @Locale() locale: string,
  ) {
    return this.submissions.create(req.user, dto, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Query('problemId') problemId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = Math.max(1, Number.parseInt(page ?? '1', 10) || 1);
    const l = Math.min(100, Math.max(1, Number.parseInt(limit ?? '20', 10) || 20));
    return this.submissions.listForUser(req.user.id, problemId, p, l);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @SkipThrottle()
  @Sse(':number/stream')
  stream(
    @Req() req: { user: { id: string } },
    @Param('number') numberParam: string,
  ): Observable<MessageEvent> {
    const userId = req.user.id;
    const connectionId = crypto.randomUUID();

    return from(this.submissions.resolveByNumber(numberParam)).pipe(
      mergeMap((sub) => {
        const submissionId = sub.id;
        return new Observable<MessageEvent>((subscriber) => {
          // Register connection for limit tracking
          void this.sseConns.registerConnection(userId, connectionId, subscriber);

          const handler = (_channel: string, message: string) => {
            try {
              const payload = JSON.parse(message) as { submissionId: string };
              if (payload.submissionId !== submissionId) return;
              subscriber.next({ data: message } as MessageEvent);
              if ((payload as { type?: string }).type === 'done') {
                subscriber.complete();
              }
            } catch {
              /* ignore */
            }
          };
          this.ensureJudgeEventsSubscribed();
          this.redis.subscriber.on('message', handler);
          return () => {
            this.redis.subscriber.off('message', handler);
            void this.sseConns.unregisterConnection(userId, connectionId);
          };
        });
      }),
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':number')
  detail(
    @Req() req: { user: { id: string } },
    @Param('number') number: string,
  ) {
    return this.submissions.getDetailByNumber(number, req.user.id);
  }
}
