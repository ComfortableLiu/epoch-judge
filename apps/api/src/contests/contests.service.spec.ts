import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createTestModule } from '../test/helpers/test-module';
import { ContestsService } from './contests.service';
import type { MockPrisma } from '../test/helpers/mock-prisma';
import { ProblemAccessService } from '../problems/problem-access.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashed'),
  compare: jest.fn(),
}));

describe('ContestsService', () => {
  let service: ContestsService;
  let mockPrisma: MockPrisma;

  beforeEach(async () => {
    const { module, mockPrisma: mp } = await createTestModule({
      providers: [
        ContestsService,
        {
          provide: ProblemAccessService,
          useValue: { canView: jest.fn().mockResolvedValue(true) },
        },
      ],
    });
    service = module.get(ContestsService);
    mockPrisma = mp;
  });

  afterEach(() => jest.clearAllMocks());

  describe('createAdmin', () => {
    it('should create a contest', async () => {
      mockPrisma.client.problem.findMany.mockResolvedValue([]);
      mockPrisma.client.contest.create.mockResolvedValue({
        id: 'c1',
        number: 1,
      });
      mockPrisma.client.contest.findUnique.mockResolvedValue({
        id: 'c1',
        number: 1,
        title: 'Test Contest',
        description: 'desc',
        visibility: 'PUBLIC',
        judgeMode: 'OI',
        startAt: new Date('2026-07-01'),
        endAt: new Date('2026-07-02'),
        freezeAt: null,
        accessPassword: null,
        problems: [],
        _count: { problems: 0 },
      });

      const result = await service.createAdmin(
        {
          title: 'Test Contest',
          description: 'desc',
          visibility: 'PUBLIC',
          judgeMode: 'OI',
          startAt: '2026-07-01T00:00:00Z',
          endAt: '2026-07-02T00:00:00Z',
        },
        'u1',
      );

      expect(mockPrisma.client.contest.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid time range', async () => {
      await expect(
        service.createAdmin(
          {
            title: 'Bad Contest',
            description: 'desc',
            visibility: 'PUBLIC',
            judgeMode: 'OI',
            startAt: '2026-07-02T00:00:00Z',
            endAt: '2026-07-01T00:00:00Z',
          },
          'u1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should hash accessPassword on create', async () => {
      mockPrisma.client.problem.findMany.mockResolvedValue([]);
      mockPrisma.client.contest.create.mockResolvedValue({ id: 'c1', number: 1 });
      mockPrisma.client.contest.findUnique.mockResolvedValue({
        id: 'c1',
        number: 1,
        title: 'PW Contest',
        description: 'desc',
        visibility: 'PUBLIC',
        judgeMode: 'OI',
        startAt: new Date('2026-07-01'),
        endAt: new Date('2026-07-02'),
        freezeAt: null,
        accessPassword: '$2a$10$hashed',
        problems: [],
        _count: { problems: 0 },
      });

      await service.createAdmin(
        {
          title: 'PW Contest',
          description: 'desc',
          visibility: 'PUBLIC',
          judgeMode: 'OI',
          startAt: '2026-07-01T00:00:00Z',
          endAt: '2026-07-02T00:00:00Z',
          accessPassword: 'secret123',
        },
        'u1',
      );

      expect(bcrypt.hash).toHaveBeenCalledWith('secret123', expect.any(Number));
      expect(mockPrisma.client.contest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            accessPassword: '$2a$10$hashed',
          }),
        }),
      );
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      mockPrisma.client.contest.findUnique.mockResolvedValue({
        id: 'c1',
        accessPassword: '$2a$10$hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      mockPrisma.client.contestRegistration.findUnique.mockResolvedValue(null);
      mockPrisma.client.user.findUnique.mockResolvedValue({
        id: 'u1',
        username: 'testuser',
        displayName: null,
      });
      mockPrisma.client.contestRegistration.create.mockResolvedValue({});

      const result = await service.verifyPassword('1', 'u1', 'correct');
      expect(result.ok).toBe(true);
    });

    it('should reject incorrect password', async () => {
      mockPrisma.client.contest.findUnique.mockResolvedValue({
        id: 'c1',
        accessPassword: '$2a$10$hashed',
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(
        service.verifyPassword('1', 'u1', 'wrong'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should pass through when no password required', async () => {
      mockPrisma.client.contest.findUnique.mockResolvedValue({
        id: 'c1',
        accessPassword: null,
      });

      const result = await service.verifyPassword('1', 'u1', 'anything');
      expect(result.ok).toBe(true);
    });
  });

  describe('hasContestEntryAccess', () => {
    it('should return false for password-required contest with unverified user', async () => {
      mockPrisma.client.contest.findUnique.mockResolvedValue({
        id: 'c1',
        accessPassword: '$2a$10$hashed',
        startAt: new Date('2026-07-01'),
        createdById: 'other',
      });
      mockPrisma.client.contestRegistration.findUnique.mockResolvedValue({
        passwordVerified: false,
      });

      const result = await service.hasContestEntryAccess('c1', {
        id: 'u1',
        role: 'USER',
      });
      expect(result).toBe(false);
    });
  });

  describe('deleteAdmin', () => {
    it('should throw BadRequestException when contest has submissions', async () => {
      mockPrisma.client.contest.findUnique.mockResolvedValue({
        id: 'c1',
        _count: { submissions: 5 },
      });

      await expect(service.deleteAdmin('c1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
