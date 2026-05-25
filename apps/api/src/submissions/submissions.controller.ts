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
import { Observable } from 'rxjs';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Locale } from '../common/locale.decorator';
import { RedisService } from '../redis/redis.service';
import { RedisKeys } from '@epoch-judge/redis';
import { CreateSubmissionDto } from './submissions.dto';
import { SubmissionsService } from './submissions.service';

@ApiTags('submissions')
@Controller('submissions')
export class SubmissionsController {
  constructor(
    private readonly submissions: SubmissionsService,
    private readonly redis: RedisService,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post()
  create(
    @Req() req: { user: { id: string } },
    @Body() dto: CreateSubmissionDto,
    @Locale() locale: string,
  ) {
    return this.submissions.create(req.user.id, dto, locale);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  list(
    @Req() req: { user: { id: string } },
    @Query('problemId') problemId?: string,
  ) {
    return this.submissions.listForUser(req.user.id, problemId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  detail(@Req() req: { user: { id: string } }, @Param('id') id: string) {
    return this.submissions.getDetail(id, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Sse(':id/stream')
  stream(@Param('id') submissionId: string): Observable<MessageEvent> {
    return new Observable((subscriber) => {
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
      void this.redis.subscriber.subscribe(RedisKeys.judgeEvents());
      this.redis.subscriber.on('message', handler);
      return () => {
        this.redis.subscriber.off('message', handler);
        void this.redis.subscriber.unsubscribe(RedisKeys.judgeEvents());
      };
    });
  }
}
