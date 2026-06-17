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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'List problems',
    description: 'Returns a paginated list of problems. Staff users can pass all=1 to include hidden problems.',
  })
  @ApiQuery({ name: 'all', required: false, description: 'Set to 1 to include hidden problems (staff only)' })
  @ApiQuery({ name: 'keyword', required: false, description: 'Search keyword' })
  @ApiQuery({ name: 'tags', required: false, description: 'Comma-separated tag filter' })
  @ApiQuery({ name: 'difficultyMin', required: false, description: 'Minimum difficulty' })
  @ApiQuery({ name: 'difficultyMax', required: false, description: 'Maximum difficulty' })
  @ApiResponse({ status: 200, description: 'List of problems' })
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
  @ApiOperation({
    summary: 'Import problems from ZIP',
    description: 'Upload a ZIP file containing problem definitions and testcases to bulk-import problems.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({ schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } })
  @ApiResponse({ status: 201, description: 'Problems imported successfully' })
  @ApiResponse({ status: 400, description: 'Invalid ZIP format' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
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
  @ApiOperation({ summary: 'Export problem as ZIP' })
  @ApiParam({ name: 'id', description: 'Problem ID' })
  @ApiQuery({ name: 'testdata', required: false, description: 'Set to "false" or "0" to exclude testdata' })
  @ApiResponse({ status: 200, description: 'ZIP file download' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
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
  @ApiOperation({ summary: 'List testcases for a problem' })
  @ApiParam({ name: 'id', description: 'Problem ID' })
  @ApiResponse({ status: 200, description: 'List of testcases' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  listTestcases(@Param('id') problemId: string) {
    return this.problems.listTestcases(problemId);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Get(':id/testcases/:testcaseId')
  @ApiOperation({ summary: 'Get testcase detail' })
  @ApiParam({ name: 'id', description: 'Problem ID' })
  @ApiParam({ name: 'testcaseId', description: 'Testcase ID' })
  @ApiResponse({ status: 200, description: 'Testcase detail including input/output' })
  @ApiResponse({ status: 404, description: 'Testcase not found' })
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
  @ApiOperation({ summary: 'Create a testcase' })
  @ApiParam({ name: 'id', description: 'Problem ID' })
  @ApiBody({ type: CreateTestcaseDto })
  @ApiResponse({ status: 201, description: 'Testcase created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
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
  @ApiOperation({ summary: 'Update a testcase' })
  @ApiParam({ name: 'id', description: 'Problem ID' })
  @ApiParam({ name: 'testcaseId', description: 'Testcase ID' })
  @ApiBody({ type: UpdateTestcaseDto })
  @ApiResponse({ status: 200, description: 'Testcase updated' })
  @ApiResponse({ status: 404, description: 'Testcase not found' })
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
  @ApiOperation({ summary: 'Delete a testcase' })
  @ApiParam({ name: 'id', description: 'Problem ID' })
  @ApiParam({ name: 'testcaseId', description: 'Testcase ID' })
  @ApiResponse({ status: 200, description: 'Testcase deleted' })
  @ApiResponse({ status: 404, description: 'Testcase not found' })
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
  @ApiOperation({ summary: 'Create a new problem' })
  @ApiBody({ type: CreateProblemDto })
  @ApiResponse({ status: 201, description: 'Problem created' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
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
  @ApiOperation({ summary: 'Update a problem' })
  @ApiParam({ name: 'id', description: 'Problem ID' })
  @ApiBody({ type: UpdateProblemDto })
  @ApiResponse({ status: 200, description: 'Problem updated' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
  update(@Param('id') id: string, @Body() dto: UpdateProblemDto) {
    return this.problems.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get(':number/submit-context')
  @ApiOperation({
    summary: 'Get submission context for a problem',
    description: 'Returns problem metadata needed by the submission form, optionally scoped to a contest.',
  })
  @ApiParam({ name: 'number', description: 'Problem number' })
  @ApiQuery({ name: 'contestId', required: false, description: 'Contest ID for contest-scoped access' })
  @ApiResponse({ status: 200, description: 'Submission context' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
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
  @ApiOperation({ summary: 'Get problem asset file (image, etc.)' })
  @ApiParam({ name: 'number', description: 'Problem number' })
  @ApiQuery({ name: 'contestId', required: false, description: 'Contest ID for contest-scoped access' })
  @ApiResponse({ status: 200, description: 'Asset file content' })
  @ApiResponse({ status: 404, description: 'Asset not found' })
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
  @ApiOperation({
    summary: 'Get problem detail',
    description: 'Returns full problem detail including statement, tags, and metadata. Contest-scoped if contestId is provided.',
  })
  @ApiParam({ name: 'number', description: 'Problem number' })
  @ApiQuery({ name: 'contestId', required: false, description: 'Contest ID for contest-scoped access' })
  @ApiResponse({ status: 200, description: 'Problem detail' })
  @ApiResponse({ status: 404, description: 'Problem not found' })
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
