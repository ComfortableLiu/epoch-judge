import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AnnouncementsService } from './announcements.service';
import { AnnouncementsAdminController } from './announcements-admin.controller';
import { AnnouncementsController } from './announcements.controller';

@Module({
  imports: [PrismaModule],
  providers: [AnnouncementsService],
  controllers: [AnnouncementsAdminController, AnnouncementsController],
  exports: [AnnouncementsService],
})
export class AnnouncementsModule {}
