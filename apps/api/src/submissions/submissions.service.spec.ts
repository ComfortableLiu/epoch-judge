import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createTestModule } from '../test/helpers/test-module';
import { SubmissionsService } from './submissions.service';
import type { MockPrisma } from '../test/helpers/mock-prisma';
import { JudgeTaskService } from '../judge/judge-task.service';
import { JudgeModeService } from '../judge/judge-mode.service';
import { ContestsService } from '../contests/contests.service';

// Mock the security scanner
jest.mock('../judge/security.scanner', () => ({
  scanSourceCode: jest.fn().mockReturnValue({ blocked: false, violations: [] }),
}));

describe('SubmissionsService', () => {
  let service: SubmissionsService;
  let mockPrisma: MockPrisma;

  beforeEach(async () => {
    const { module, mockPrisma: mp } = await createTestModule({
      providers: [
        SubmissionsService,
        {
          provide: JudgeTaskService,
          useValue: {
            enqueue: jest.fn().mockResolvedValue(undefined),
            enqueueNewSubmission: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: JudgeModeService,
          useValue: {
            resolveForSubmit: jest.fn().mockResolvedValue({ judgeMode: 'OI', locked: false }),
          },
        },
        {
          provide: ContestsService,
          useValue: {
            assertSubmitAccess: jest.fn(),
            isActiveForSubmit: jest.fn().mockResolvedValue(true),
            resolveContestRef: jest.fn().mockResolvedValue('c1'),
          },
        },
      ],
    });
    service = module.get(SubmissionsService);
    mockPrisma = mp;
  });

  afterEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('should create a submission successfully', async () => {
      mockPrisma.client.problem.findUnique.mockResolvedValue({
        id: 'p1',
        number: 1,
        visibility: 'PUBLIC',
        createdById: 'u1',
        testcases: [
          { id: 'tc1', ordinal: 0, input: '1 2', output: '3', score: 10, isSample: true },
        ],
      });
      mockPrisma.client.submission.count.mockResolvedValue(0);
      mockPrisma.client.submission.create.mockResolvedValue({
        id: 's1',
        number: 1,
        userId: 'u1',
        problemId: 'p1',
        language: 'JAVASCRIPT',
        status: 'PENDING',
      });

      const result = await service.create(
        { id: 'u1', role: 'USER' },
        { problemId: 'p1', language: 'JAVASCRIPT', sourceCode: 'console.log(1)' },
        'zh-CN',
      );

      expect(result.number).toBe(1);
      expect(mockPrisma.client.submission.create).toHaveBeenCalled();
    });

    it('should throw NotFoundException for non-existent problem', async () => {
      mockPrisma.client.problem.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          { id: 'u1', role: 'USER' },
          { problemId: 'missing', language: 'JAVASCRIPT', sourceCode: 'code' },
          'zh-CN',
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listForUser', () => {
    it('should list submissions for a user', async () => {
      mockPrisma.client.submission.findMany.mockResolvedValue([
        { id: 's1', number: 1, status: 'ACCEPTED', language: 'JAVASCRIPT', createdAt: new Date() },
      ]);

      const result = await service.listForUser('u1');
      expect(result).toHaveLength(1);
    });
  });

  describe('getDetailByNumber', () => {
    it('should return submission detail', async () => {
      mockPrisma.client.submission.findUnique.mockResolvedValue({
        id: 's1',
        number: 1,
        userId: 'u1',
        status: 'ACCEPTED',
        language: 'JAVASCRIPT',
        sourceCode: 'code',
        problem: { number: 1, title: 'A+B' },
        testcaseResults: [],
      });

      const result = await service.getDetailByNumber('1', 'u1');
      expect(result.number).toBe(1);
    });

    it('should throw NotFoundException for non-existent submission', async () => {
      mockPrisma.client.submission.findUnique.mockResolvedValue(null);

      await expect(service.getDetailByNumber('999', 'u1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
