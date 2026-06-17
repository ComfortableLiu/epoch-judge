import { Body, Controller, Headers, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'Account created successfully' })
  @ApiResponse({ status: 400, description: 'Validation error' })
  @ApiResponse({ status: 409, description: 'Username or email already exists' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  register(@Body() dto: RegisterDto, @Locale() locale: string) {
    return this.auth.register(dto, locale);
  }

  @Throttle(AUTH_THROTTLE)
  @Post('login')
  @ApiOperation({
    summary: 'Login with username/email and password',
    description: 'Returns access and refresh JWT tokens on success.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful, returns JWT tokens' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  login(@Body() dto: LoginDto, @Locale() locale: string) {
    return this.auth.login(dto, locale);
  }

  @ApiBearerAuth()
  @Post('refresh')
  @ApiOperation({
    summary: 'Refresh access token',
    description: 'Submit the refresh token in the Authorization header to obtain a new access token.',
  })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid or expired refresh token' })
  refresh(
    @Headers('authorization') authorization: string | undefined,
    @Locale() locale: string,
  ) {
    return this.auth.refresh(authorization, locale);
  }
}
