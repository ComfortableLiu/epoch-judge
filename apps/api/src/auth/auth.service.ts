import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '@epoch-judge/db';
import type { JwtPayload } from '@epoch-judge/shared';
import { PrismaService } from '../prisma/prisma.service';
import { t } from '../common/messages';
import { LoginDto, RegisterDto } from './auth.dto';

/** 过期后仍允许 refresh 的最长宽限期（秒） */
const REFRESH_GRACE_SEC = 30 * 24 * 60 * 60;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterDto, locale: string) {
    const exists = await this.prisma.client.user.findUnique({
      where: { username: dto.username },
    });
    if (exists) {
      if (exists.mustResetPassword) {
        const passwordHash = await bcrypt.hash(dto.password, 10);
        const user = await this.prisma.client.user.update({
          where: { id: exists.id },
          data: {
            passwordHash,
            mustResetPassword: false,
            ...(dto.email !== undefined ? { email: dto.email } : {}),
          },
        });
        return this.tokensFor(user.id, user.username, user.role as Role, locale);
      }
      throw new ConflictException({
        messageKey: 'auth.username_taken',
        message: t('auth.username_taken', locale),
      });
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.prisma.client.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        passwordHash,
      },
    });
    return this.tokensFor(user.id, user.username, user.role as Role, locale);
  }

  async login(dto: LoginDto, locale: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { username: dto.username },
    });
    if (!user) {
      throw new UnauthorizedException({
        messageKey: 'auth.invalid_credentials',
        message: t('auth.invalid_credentials', locale),
      });
    }
    if (
      user.mustResetPassword ||
      !(await bcrypt.compare(dto.password, user.passwordHash))
    ) {
      throw new UnauthorizedException({
        messageKey: 'auth.invalid_credentials',
        message: t('auth.invalid_credentials', locale),
      });
    }
    return this.tokensFor(user.id, user.username, user.role as Role, locale);
  }

  /** 用仍有效的签名（可已过期）换取新的 accessToken */
  async refresh(authorization: string | undefined, locale: string) {
    const token = authorization?.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : undefined;
    if (!token) {
      throw new UnauthorizedException({
        messageKey: 'auth.unauthorized',
        message: t('auth.unauthorized', locale),
      });
    }

    let payload: JwtPayload;
    try {
      payload = this.jwt.verify(token, {
        ignoreExpiration: true,
      }) as JwtPayload;
    } catch {
      throw new UnauthorizedException({
        messageKey: 'auth.unauthorized',
        message: t('auth.unauthorized', locale),
      });
    }

    if (payload.exp != null) {
      const graceDeadline = payload.exp + REFRESH_GRACE_SEC;
      if (graceDeadline < Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException({
          messageKey: 'auth.unauthorized',
          message: t('auth.unauthorized', locale),
        });
      }
    }

    const user = await this.prisma.client.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException({
        messageKey: 'auth.unauthorized',
        message: t('auth.unauthorized', locale),
      });
    }

    return this.tokensFor(user.id, user.username, user.role as Role, locale);
  }

  private tokensFor(
    sub: string,
    username: string,
    role: Role,
    _locale: string,
  ) {
    const payload: JwtPayload = { sub, username, role: role as JwtPayload['role'] };
    return {
      accessToken: this.jwt.sign(payload),
      user: { id: sub, username, role },
    };
  }
}
