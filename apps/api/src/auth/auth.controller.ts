import { Body, Controller, Headers, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AUTH_THROTTLE } from '../common/throttle.config';
import { Locale } from '../common/locale.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Throttle(AUTH_THROTTLE)
  @Post('register')
  register(@Body() dto: RegisterDto, @Locale() locale: string) {
    return this.auth.register(dto, locale);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  login(@Body() dto: LoginDto, @Locale() locale: string) {
    return this.auth.login(dto, locale);
  }

  @ApiBearerAuth()
  @Post('refresh')
  refresh(
    @Headers('authorization') authorization: string | undefined,
    @Locale() locale: string,
  ) {
    return this.auth.refresh(authorization, locale);
  }
}
