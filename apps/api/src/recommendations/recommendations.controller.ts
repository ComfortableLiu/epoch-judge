import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { RecommendationsService } from './recommendations.service';
import { GetRecommendationsDto } from './recommendations.dto';

@ApiTags('recommendations')
@Controller('recommendations')
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Get problem recommendations',
    description:
      'Returns personalized problem recommendations based on the user submission history. ' +
      'New users receive popular easy problems; experienced users get difficulty-graded and weak-tag recommendations.',
  })
  @ApiResponse({ status: 200, description: 'List of recommended problems' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getRecommendations(
    @Req() req: { user: { id: string } },
    @Query() dto: GetRecommendationsDto,
  ) {
    const limit = dto.limit ?? 10;
    return this.recommendationsService.getRecommendations(req.user.id, limit);
  }
}
