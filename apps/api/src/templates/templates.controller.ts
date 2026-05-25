import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

@ApiTags('templates')
@Controller('templates')
export class TemplatesController {
  private resolveTemplate(name: string) {
    return path.join(__dirname, '../../../templates', name);
  }

  @Get('user-import.csv')
  userImport(@Res() res: Response) {
    const file = this.resolveTemplate('user-import.csv');
    res.download(file);
  }

  @Get('problem-import.zip')
  problemImport(@Res() res: Response) {
    const file = this.resolveTemplate('problem-import.zip');
    res.download(file);
  }
}
