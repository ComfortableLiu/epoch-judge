import {
  Body,
  Controller,
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
import { JudgeMode, ProblemVisibility, Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { CreateProblemDto, UpdateProblemDto } from './problems.dto';
import { ProblemsService } from './problems.service';
import { isZipAssetEntry, mimeFromFilename } from './problem-assets.util';
import AdmZip from 'adm-zip';
import * as yaml from 'yaml';

@ApiTags('problems')
@Controller('problems')
export class ProblemsController {
  constructor(private readonly problems: ProblemsService) {}

  @Get()
  list(@Query('all') all?: string, @Req() req?: { user?: { role: Role } }) {
    const isStaff =
      req?.user?.role === Role.ADMIN || req?.user?.role === Role.PROBLEM_EDITOR;
    return this.problems.list(!(all === '1' && isStaff));
  }

  @Get(':slug/assets/*path')
  @Header('Cache-Control', 'public, max-age=86400')
  async getAsset(
    @Param('slug') slug: string,
    @Param('path') assetPath: string,
    @Req() req: { user?: { role: Role } },
  ) {
    const role = req.user?.role;
    const isStaff =
      role === Role.ADMIN || role === Role.PROBLEM_EDITOR;
    const { content, mimeType } = await this.problems.getAssetBySlug(
      slug,
      assetPath,
      isStaff,
    );
    return new StreamableFile(content, { type: mimeType });
  }

  @Get(':slug')
  detail(@Param('slug') slug: string, @Req() req: { user?: { role: Role } }) {
    const role = req.user?.role;
    const isStaff =
      role === Role.ADMIN || role === Role.PROBLEM_EDITOR;
    return this.problems.getBySlug(slug, isStaff);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Post()
  create(@Body() dto: CreateProblemDto) {
    return this.problems.create(dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateProblemDto) {
    return this.problems.update(id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Post(':id/testcases')
  @UseInterceptors(FileInterceptor('file'))
  async uploadTestcase(
    @Param('id') problemId: string,
    @UploadedFile() _file: Express.Multer.File,
    @Body() body: { ordinal: string; score?: string; isSample?: string; type: 'input' | 'output' },
    @Req() req: { files?: Record<string, Express.Multer.File[]> },
  ) {
    // Simplified: expects multipart fields input/output via separate endpoints in production
    void problemId;
    void body;
    void req;
    return { ok: true };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.PROBLEM_EDITOR)
  @Post('import')
  @UseInterceptors(FileInterceptor('file'))
  async importZip(@UploadedFile() file: Express.Multer.File) {
    if (!file?.buffer) throw new Error('No file');
    const zip = new AdmZip(file.buffer);
    const metaEntry = zip.getEntry('problem.yaml');
    if (!metaEntry) throw new Error('problem.yaml missing');
    const meta = yaml.parse(metaEntry.getData().toString('utf-8')) as {
      slug: string;
      title: string;
      timeLimitMs: number;
      memoryLimitKb: number;
      defaultJudgeMode: JudgeMode;
      visibility: ProblemVisibility;
    };
    const statement =
      zip.getEntry('statement.md')?.getData().toString('utf-8') ?? '';
    const testcases: { input: Buffer; output: Buffer; score: number; isSample?: boolean }[] = [];
    const entries = zip.getEntries().filter((e) => e.entryName.startsWith('testdata/'));
    const inputs = entries.filter((e) => e.entryName.endsWith('.in'));
    for (const inp of inputs) {
      const base = inp.entryName.replace(/\.in$/, '');
      const out = zip.getEntry(`${base}.out`);
      if (!out) continue;
      testcases.push({
        input: inp.getData(),
        output: out.getData(),
        score: 100 / Math.max(inputs.length, 1),
      });
    }
    const assets = zip
      .getEntries()
      .filter((e) => isZipAssetEntry(e.entryName))
      .map((e) => ({
        path: e.entryName.replace(/\\/g, '/'),
        content: e.getData(),
        mimeType: mimeFromFilename(e.entryName),
      }));

    return this.problems.importFromManifest({
      ...meta,
      statement,
      testcases,
      assets,
    });
  }
}
