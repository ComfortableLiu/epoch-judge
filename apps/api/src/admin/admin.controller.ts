import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@epoch-judge/db';
import { JwtAuthGuard } from '../common/jwt-auth.guard';
import { Roles } from '../common/roles.decorator';
import { RolesGuard } from '../common/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('judge-nodes')
  async judgeNodes() {
    return this.prisma.client.judgeNode.findMany({
      orderBy: { lastHeartbeat: 'desc' },
    });
  }

  @Get('config')
  async getConfig() {
    return this.prisma.client.systemConfig.findMany();
  }

  @Put('config')
  async setConfig(@Body() body: { key: string; value: string }) {
    return this.prisma.client.systemConfig.upsert({
      where: { key: body.key },
      create: body,
      update: { value: body.value },
    });
  }
}
