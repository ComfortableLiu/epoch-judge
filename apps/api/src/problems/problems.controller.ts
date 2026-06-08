import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  Req,
  StreamableFile,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/optional-jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import {
  CreateProblemDto,
  CreateTestcaseDto,
  UpdateProblemDto,
  UpdateTestcaseDto,
} from './problems.dto';
import { ProblemsService } from './problems.service';
import { parseProblemZip } from './problem-zip.util';

@ApiTags('problems')
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  list(
    @Query('all') all?: string,
    @Query('keyword') keyword?: string,
    @Query('tags') tags?: string,
    @Query('difficultyMin') difficultyMin?: string,
    @Query('difficultyMax') difficultyMax?: string,
    @Req() req?: { user?: { id: string; role: Role } },
  ) {
    const isStaff =
      req?.user?.role === Role.ADMIN || req?.user?.role === Role.PROBLEM_EDITOR;
    return this.problems.list(
      !(all === '1' && isStaff),
      req?.user ? { id: req.user.id, role: req.user.role } : undefined,
      {
        keyword: keyword?.trim() || undefined,
        tags: tags?.trim() ? tags.split(',').map((t) => t.trim()).filter(Boolean) : undefined,
        difficultyMin: difficultyMin && !Number.isNaN(Number(difficultyMin)) ? Number(difficultyMin) : undefined,
        difficultyMax: difficultyMax && !Number.isNaN(Number(difficultyMax)) ? Number(difficultyMax) : undefined,
      },
    );
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importZip(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: { user: { id: string } },
  ) {
    if (!file?.buffer) throw new Error('No file');
    const manifest = parseProblemZip(file.buffer);
    return this.problems.importFromManifest(manifest, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Get(':id/export')
  async exportZip(
    @Param('id') problemId: string,
    @Query('testdata') testdata?: string,
  ) {
    const includeTestdata = testdata !== 'false' && testdata !== '0';
    const { buffer, filename } = await this.problems.exportZip(
      problemId,
      includeTestdata,
    );
    return new StreamableFile(buffer, {
      type: 'application/zip',
      disposition: `attachment; filename="${filename}"`,
    });
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Get(':id/testcases')
  listTestcases(@Param('id') problemId: string) {
    return this.problems.listTestcases(problemId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Get(':id/testcases/:testcaseId')
  getTestcase(
    @Param('id') problemId: string,
    @Param('testcaseId') testcaseId: string,
  ) {
    return this.problems.getTestcaseDetail(problemId, testcaseId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Post(':id/testcases')
  createTestcase(
    @Param('id') problemId: string,
    @Body() dto: CreateTestcaseDto,
  ) {
    return this.problems.createTestcase(problemId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Patch(':id/testcases/:testcaseId')
  updateTestcase(
    @Param('id') problemId: string,
    @Param('testcaseId') testcaseId: string,
    @Body() dto: UpdateTestcaseDto,
  ) {
    return this.problems.updateTestcase(problemId, testcaseId, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Delete(':id/testcases/:testcaseId')
  deleteTestcase(
    @Param('id') problemId: string,
    @Param('testcaseId') testcaseId: string,
  ) {
    return this.problems.deleteTestcase(problemId, testcaseId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Post()
  create(
    @Body() dto: CreateProblemDto,
    @Req() req: { user: { id: string } },
  ) {
    return this.problems.create(dto, req.user.id);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProblemDto) {
    return this.problems.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':number/submit-context')
  submitContext(
    @Param('number') number: string,
    @Query('contestId') contestId: string | undefined,
    @Req() req: { user: { id: string; role: Role } },
  ) {
    return this.problems.getSubmitContext(
      number,
      { id: req.user.id, role: req.user.role },
      contestId,
    );
  }

  @Get(':number/assets/*path')
  @Header('Cache-Control', 'public, max-age=86400')
  @UseGuards(OptionalJwtAuthGuard)
  async getAsset(
    @Param('number') number: string,
    @Param('path') assetPath: string,
    @Query('contestId') contestRef: string | undefined,
    @Req() req: { user?: { id: string; role: Role } },
  ) {
    const user = req.user
      ? { id: req.user.id, role: req.user.role }
      : undefined;
    const contestId = await this.problems.resolveContestRef(contestRef);
    const { content, mimeType } = await this.problems.getAssetByNumber(
      number,
      assetPath,
      user,
      contestId ? { contestId } : undefined,
    );
    return new StreamableFile(content, { type: mimeType });
  }

  @Get(':number')
  @UseGuards(OptionalJwtAuthGuard)
  async detail(
    @Param('number') number: string,
    @Query('contestId') contestRef: string | undefined,
    @Req() req: { user?: { id: string; role: Role } },
  ) {
    const user = req.user
      ? { id: req.user.id, role: req.user.role }
      : undefined;
    const contestId = await this.problems.resolveContestRef(contestRef);
    return this.problems.getByNumber(
      number,
      user,
      contestId ? { contestId } : undefined,
    );
  }
}
