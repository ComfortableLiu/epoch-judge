import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { JwtPayload } from '@epoch-judge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { t } from '../common/messages';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.get<string>('JWT_SECRET', 'dev-secret'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException({ messageKey: 'auth.unauthorized', message: t('auth.unauthorized', 'zh-CN') });
    }
    return {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
    };
  }
}
