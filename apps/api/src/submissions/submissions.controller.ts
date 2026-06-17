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
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Submit a solution',
    description: 'Submit source code for judging. Returns the submission number for tracking via SSE.',
  })
  @ApiBody({ type: CreateSubmissionDto })
  @ApiResponse({ status: 201, description: 'Submission accepted for judging' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 429, description: 'Too many submissions' })
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
  @ApiOperation({ summary: 'List my submissions' })
  @ApiQuery({ name: 'problemId', required: false, description: 'Filter by problem ID' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page (default: 20, max: 100)' })
  @ApiResponse({ status: 200, description: 'Paginated list of submissions' })
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
  @ApiOperation({
    summary: 'Stream submission judging progress (SSE)',
    description: 'Opens a Server-Sent Events stream that emits real-time updates as testcases are judged. The stream closes when judging completes.',
  })
  @ApiParam({ name: 'number', description: 'Submission number' })
  @ApiResponse({ status: 200, description: 'SSE stream of judging events' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
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
  @ApiOperation({ summary: 'Get submission detail' })
  @ApiParam({ name: 'number', description: 'Submission number' })
  @ApiResponse({ status: 200, description: 'Submission detail with testcase results' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  @ApiResponse({ status: 404, description: 'Submission not found' })
  detail(
    @Req() req: { user: { id: string } },
    @Param('number') number: string,
  ) {
    return this.submissions.getDetailByNumber(number, req.user.id);
  }
}
