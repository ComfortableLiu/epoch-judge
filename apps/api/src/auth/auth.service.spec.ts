import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { createTestModule } from '../../test/helpers/test-module';
import { AuthService } from './auth.service';
import type { MockPrisma } from '../../test/helpers/mock-prisma';

// Mock bcrypt
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedpassword'),
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let mockPrisma: MockPrisma;
  let jwtService: JwtService;

  beforeEach(async () => {
    const { module, mockPrisma: mp } = await createTestModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-access-token'),
            verify: jest.fn(),
          },
        },
      ],
    });
    service = module.get(AuthService);
    mockPrisma = mp;
    jwtService = module.get(JwtService);
  });

  afterEach(() => jest.clearAllMocks());

  describe('register', () => {
    it('should register a new user successfully', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue(null);
      mockPrisma.client.user.create.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        role: 'USER',
      });

      const result = await service.register(
        { username: 'testuser', password: 'password123' },
        'zh-CN',
      );

      expect(result.accessToken).toBe('mock-access-token');
      expect(result.user.username).toBe('testuser');
      expect(bcrypt.hash).toHaveBeenCalledWith('password123', 10);
    });

    it('should reject duplicate username', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'existing',
        username: 'testuser',
        mustResetPassword: false,
      });

      await expect(
        service.register({ username: 'testuser', password: 'pass123' }, 'zh-CN'),
      ).rejects.toThrow(ConflictException);
    });

    it('should handle mustResetPassword takeover', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        mustResetPassword: true,
        role: 'USER',
      });
      mockPrisma.client.user.update.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        role: 'USER',
      });

      const result = await service.register(
        { username: 'testuser', password: 'newpass123' },
        'zh-CN',
      );

      expect(result.accessToken).toBe('mock-access-token');
      expect(mockPrisma.client.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'user-1' },
          data: expect.objectContaining({ mustResetPassword: false }),
        }),
      );
    });
  });

  describe('login', () => {
    it('should login with correct credentials', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        passwordHash: '$2a$10$hashed',
        role: 'USER',
        mustResetPassword: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.login(
        { username: 'testuser', password: 'correct' },
        'zh-CN',
      );

      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should reject wrong password', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        passwordHash: '$2a$10$hashed',
        role: 'USER',
        mustResetPassword: false,
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.login({ username: 'testuser', password: 'wrong' }, 'zh-CN'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject non-existent user', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue(null);

      await expect(
        service.login({ username: 'nobody', password: 'pass' }, 'zh-CN'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login while mustResetPassword is set', async () => {
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        passwordHash: '$2a$10$hashed',
        role: 'USER',
        mustResetPassword: true,
      });

      await expect(
        service.login({ username: 'testuser', password: 'correct' }, 'zh-CN'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('should refresh with valid token', async () => {
      jwtService.verify = jest.fn().mockReturnValue({
        sub: 'user-1',
        username: 'testuser',
        role: 'USER',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        role: 'USER',
      });

      const result = await service.refresh(
        'Bearer valid-token',
        'zh-CN',
      );

      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should refresh with expired token within grace period', async () => {
      const expiredRecently = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      jwtService.verify = jest.fn().mockReturnValue({
        sub: 'user-1',
        username: 'testuser',
        role: 'USER',
        exp: expiredRecently,
      });
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'testuser',
        role: 'USER',
      });

      const result = await service.refresh(
        'Bearer expired-token',
        'zh-CN',
      );

      expect(result.accessToken).toBe('mock-access-token');
    });

    it('should reject token expired beyond grace period', async () => {
      const expiredLongAgo = Math.floor(Date.now() / 1000) - 31 * 86400; // 31 days ago
      jwtService.verify = jest.fn().mockReturnValue({
        sub: 'user-1',
        username: 'testuser',
        role: 'USER',
        exp: expiredLongAgo,
      });

      await expect(
        service.refresh('Bearer old-token', 'zh-CN'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject missing authorization header', async () => {
      await expect(
        service.refresh(undefined, 'zh-CN'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
