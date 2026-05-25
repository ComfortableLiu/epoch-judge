import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Locale } from '../common/locale.decorator';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto, @Locale() locale: string) {
    return this.auth.register(dto, locale);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Locale() locale: string) {
    return this.auth.login(dto, locale);
  }
}
