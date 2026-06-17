import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { DiscussionsService } from './discussions.service';
import {
  CreateDiscussionDto,
  CreateReplyDto,
  VoteDto,
  ListDiscussionsDto,
} from './discussions.dto';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { parseEntityNumber } from '../common/parse-entity-number';

@ApiTags('discussions')
@Controller('discussions')
export class DiscussionsController {
  constructor(private readonly discussions: DiscussionsService) {}

  @Post('problems/:number')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a discussion post' })
  create(
    @Param('number') number: string,
    @Body() dto: CreateDiscussionDto,
    @Request() req: any,
  ) {
    const problemNumber = parseEntityNumber(number);
    return this.discussions.create(problemNumber, dto, req.user.id);
  }

  @Get('problems/:number')
  @ApiOperation({ summary: 'List discussions for a problem' })
  listByProblem(
    @Param('number') number: string,
    @Query() dto: ListDiscussionsDto,
  ) {
    const problemNumber = parseEntityNumber(number);
    return this.discussions.listByProblem(problemNumber, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get discussion detail' })
  getDetail(@Param('id') id: string) {
    return this.discussions.getDetail(id);
  }

  @Post(':id/replies')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a reply' })
  createReply(
    @Param('id') id: string,
    @Body() dto: CreateReplyDto,
    @Request() req: any,
  ) {
    return this.discussions.createReply(id, dto, req.user.id);
  }

  @Get(':id/replies')
  @ApiOperation({ summary: 'List replies for a discussion' })
  listReplies(
    @Param('id') id: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.discussions.listReplies(id, page, limit);
  }

  @Post(':id/vote')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Vote on a discussion or reply' })
  vote(
    @Param('id') id: string,
    @Body() dto: VoteDto,
    @Request() req: any,
  ) {
    return this.discussions.vote(
      dto.discussionId ?? id,
      dto.replyId ?? null,
      req.user.id,
    );
  }

  @Patch(':id/pin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Toggle pin on a discussion (admin only)' })
  pin(@Param('id') id: string) {
    return this.discussions.pin(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a discussion (admin only)' })
  delete(@Param('id') id: string) {
    return this.discussions.delete(id);
  }
}
