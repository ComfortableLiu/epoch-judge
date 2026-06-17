import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
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
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('judge-nodes')
  @ApiOperation({ summary: 'List all judge nodes and their status' })
  @ApiResponse({ status: 200, description: 'List of judge nodes with heartbeat info' })
  async judgeNodes() {
    return this.prisma.client.judgeNode.findMany({
      orderBy: { lastHeartbeat: 'desc' },
    });
  }

  @Get('config')
  @ApiOperation({ summary: 'Get all system configuration entries' })
  @ApiResponse({ status: 200, description: 'List of config key-value pairs' })
  async getConfig() {
    return this.prisma.client.systemConfig.findMany();
  }

  @Put('config')
  @ApiOperation({ summary: 'Set a system configuration entry' })
  @ApiBody({ schema: { type: 'object', properties: { key: { type: 'string' }, value: { type: 'string' } }, required: ['key', 'value'] } })
  @ApiResponse({ status: 200, description: 'Config entry created or updated' })
  async setConfig(@Body() body: { key: string; value: string }) {
    return this.prisma.client.systemConfig.upsert({
      where: { key: body.key },
      create: body,
      update: { value: body.value },
    });
  }
}
