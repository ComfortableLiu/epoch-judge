import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { RejudgeRequestDto } from './rejudge.dto';
import { RejudgeService } from './rejudge.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/rejudge')
export class RejudgeController {
  constructor(private readonly rejudge: RejudgeService) {}

  @Post('candidates')
  @ApiOperation({ summary: 'List rejudge candidates' })
  @ApiBody({ type: RejudgeRequestDto })
  @ApiResponse({ status: 200, description: 'List of submissions matching the rejudge criteria' })
  listCandidates(@Body() body: RejudgeRequestDto) {
    return this.rejudge.listCandidates(
      body.scope,
      body.ids,
      body.submissionIds,
      body.statuses,
    );
  }

  @Post('preview')
  @ApiOperation({ summary: 'Preview rejudge impact' })
  @ApiBody({ type: RejudgeRequestDto })
  @ApiResponse({ status: 200, description: 'Preview of affected submissions' })
  preview(@Body() body: RejudgeRequestDto) {
    return this.rejudge.preview(
      body.scope,
      body.ids,
      body.submissionIds,
      body.statuses,
    );
  }

  @Post()
  @ApiOperation({ summary: 'Execute rejudge', description: 'Rejudge all submissions matching the criteria. This is an async operation.' })
  @ApiBody({ type: RejudgeRequestDto })
  @ApiResponse({ status: 200, description: 'Rejudge initiated' })
  execute(@Body() body: RejudgeRequestDto) {
    return this.rejudge.execute(
      body.scope,
      body.ids,
      body.submissionIds,
      body.statuses,
    );
  }
}
