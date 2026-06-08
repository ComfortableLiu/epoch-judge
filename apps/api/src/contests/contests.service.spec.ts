import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { createTestModule } from '../test/helpers/test-module';
import { ContestsService } from './contests.service';
import { ProblemAccessService } from '../problems/problem-access.service';

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashed'),
  compare: jest.fn(),
}));

describe('ContestsService', () => {
  let service: ContestsService;
  let mockPrisma: any;

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

  describe('scoreboard', () => {
    const contestStart = new Date('2026-07-01T00:00:00Z');

    function setupScoreboardMocks(opts: {
      judgeMode: 'ACM' | 'OI';
      submissions: Array<{
        userId: string;
        problemId: string;
        status: string;
        score?: number;
        createdAt: Date;
      }>;
    }) {
      const contest = {
        id: 'c1',
        number: 1,
        judgeMode: opts.judgeMode,
        startAt: contestStart,
        endAt: new Date('2026-07-02T00:00:00Z'),
        freezeAt: null,
        accessPassword: null,
        createdById: 'admin',
      };

      // Mock contest lookup for resolveContestId
      mockPrisma.client.contest.findUnique.mockResolvedValue(contest);
      // Mock registration lookup for hasContestEntryAccess (no password required)
      mockPrisma.client.contestRegistration.findMany.mockResolvedValue([
        { userId: 'u1', displayNameSnapshot: 'Alice', isStarTeam: false },
        { userId: 'u2', displayNameSnapshot: 'Bob', isStarTeam: false },
      ]);
      mockPrisma.client.submission.findMany.mockResolvedValue(
        opts.submissions.map((s, i) => ({
          id: `sub${i}`,
          ...s,
          score: s.score ?? null,
          user: { username: s.userId, displayName: null },
        })),
      );
    }

    describe('ACM mode penalty calculation', () => {
      it('should calculate penalty with failed attempts before AC', async () => {
        // User u1: 2 failed attempts then AC on problem p1 at 30 min
        // User u2: clean AC on problem p1 at 20 min
        setupScoreboardMocks({
          judgeMode: 'ACM',
          submissions: [
            // u1: WA at 10min, WA at 20min, AC at 30min
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'WRONG_ANSWER',
              createdAt: new Date(contestStart.getTime() + 10 * 60000),
            },
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'WRONG_ANSWER',
              createdAt: new Date(contestStart.getTime() + 20 * 60000),
            },
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'ACCEPTED',
              createdAt: new Date(contestStart.getTime() + 30 * 60000),
            },
            // u2: AC at 20min (no failures)
            {
              userId: 'u2',
              problemId: 'p1',
              status: 'ACCEPTED',
              createdAt: new Date(contestStart.getTime() + 20 * 60000),
            },
          ],
        });

        const result = await service.scoreboard('1', { id: 'u1', role: 'ADMIN' }, 'en');

        // u1: penalty = 30 + 20 * 2 = 70
        const alice = result.find((r) => r.userId === 'u1');
        expect(alice?.solved).toBe(1);
        expect(alice?.penalty).toBe(70);

        // u2: penalty = 20 + 20 * 0 = 20
        const bob = result.find((r) => r.userId === 'u2');
        expect(bob?.solved).toBe(1);
        expect(bob?.penalty).toBe(20);
      });

      it('should handle no failed submissions (clean AC)', async () => {
        setupScoreboardMocks({
          judgeMode: 'ACM',
          submissions: [
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'ACCEPTED',
              createdAt: new Date(contestStart.getTime() + 15 * 60000),
            },
          ],
        });

        const result = await service.scoreboard('1', { id: 'u1', role: 'ADMIN' }, 'en');
        const alice = result.find((r) => r.userId === 'u1');
        expect(alice?.solved).toBe(1);
        expect(alice?.penalty).toBe(15); // 15 + 20 * 0
      });

      it('should ignore submissions after AC', async () => {
        setupScoreboardMocks({
          judgeMode: 'ACM',
          submissions: [
            // u1: WA at 10min, AC at 20min, WA at 30min (should be ignored)
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'WRONG_ANSWER',
              createdAt: new Date(contestStart.getTime() + 10 * 60000),
            },
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'ACCEPTED',
              createdAt: new Date(contestStart.getTime() + 20 * 60000),
            },
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'WRONG_ANSWER',
              createdAt: new Date(contestStart.getTime() + 30 * 60000),
            },
          ],
        });

        const result = await service.scoreboard('1', { id: 'u1', role: 'ADMIN' }, 'en');
        const alice = result.find((r) => r.userId === 'u1');
        expect(alice?.solved).toBe(1);
        expect(alice?.penalty).toBe(40); // 20 + 20 * 1 (only 1 failure before AC)
      });

      it('should not count problems without AC', async () => {
        setupScoreboardMocks({
          judgeMode: 'ACM',
          submissions: [
            // u1: only failures, no AC on p1
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'WRONG_ANSWER',
              createdAt: new Date(contestStart.getTime() + 10 * 60000),
            },
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'TIME_LIMIT_EXCEEDED',
              createdAt: new Date(contestStart.getTime() + 20 * 60000),
            },
            // u1: AC on p2
            {
              userId: 'u1',
              problemId: 'p2',
              status: 'ACCEPTED',
              createdAt: new Date(contestStart.getTime() + 25 * 60000),
            },
          ],
        });

        const result = await service.scoreboard('1', { id: 'u1', role: 'ADMIN' }, 'en');
        const alice = result.find((r) => r.userId === 'u1');
        expect(alice?.solved).toBe(1); // only p2
        expect(alice?.penalty).toBe(25); // 25 + 20 * 0
      });

      it('should sort by solved desc then penalty asc', async () => {
        setupScoreboardMocks({
          judgeMode: 'ACM',
          submissions: [
            // u1: 1 problem solved with penalty
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'WRONG_ANSWER',
              createdAt: new Date(contestStart.getTime() + 10 * 60000),
            },
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'ACCEPTED',
              createdAt: new Date(contestStart.getTime() + 30 * 60000),
            },
            // u2: 1 problem solved clean
            {
              userId: 'u2',
              problemId: 'p1',
              status: 'ACCEPTED',
              createdAt: new Date(contestStart.getTime() + 20 * 60000),
            },
          ],
        });

        const result = await service.scoreboard('1', { id: 'u1', role: 'ADMIN' }, 'en');
        // Both solved 1 problem, but u2 has lower penalty
        expect(result[0].userId).toBe('u2'); // rank 1
        expect(result[0].penalty).toBe(20);
        expect(result[1].userId).toBe('u1'); // rank 2
        expect(result[1].penalty).toBe(50); // 30 + 20 * 1
      });
    });

    describe('OI mode', () => {
      it('should keep best score per problem', async () => {
        setupScoreboardMocks({
          judgeMode: 'OI',
          submissions: [
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'ACCEPTED',
              score: 80,
              createdAt: new Date(contestStart.getTime() + 10 * 60000),
            },
            {
              userId: 'u1',
              problemId: 'p1',
              status: 'ACCEPTED',
              score: 100,
              createdAt: new Date(contestStart.getTime() + 20 * 60000),
            },
          ],
        });

        const result = await service.scoreboard('1', { id: 'u1', role: 'ADMIN' }, 'en');
        const alice = result.find((r) => r.userId === 'u1');
        expect(alice?.score).toBe(100); // best score
      });
    });
  });
});
