import { NotFoundException } from '@nestjs/common';
import { createTestModule } from '../../test/helpers/test-module';
import { ProblemsService } from './problems.service';
import type { MockPrisma } from '../../test/helpers/mock-prisma';
import { ProblemAccessService } from './problem-access.service';
import { StorageService } from '../storage/storage.service';
import { JudgeModeService } from '../judge/judge-mode.service';

describe('ProblemsService', () => {
  let service: ProblemsService;
  let mockPrisma: MockPrisma;

  beforeEach(async () => {
    const { module, mockPrisma: mp } = await createTestModule({
      providers: [
        ProblemsService,
        {
          provide: ProblemAccessService,
          useValue: {
            canView: jest.fn().mockResolvedValue(true),
            assertCanView: jest.fn(),
            isStaff: jest.fn().mockReturnValue(false),
            getLockedProblemIds: jest.fn().mockResolvedValue(new Set()),
          },
        },
        {
          provide: StorageService,
          useValue: {
            getTestcaseData: jest.fn(),
            saveTestcaseData: jest.fn(),
            deleteTestcaseData: jest.fn(),
          },
        },
        {
          provide: JudgeModeService,
          useValue: {},
        },
      ],
    });
    service = module.get(ProblemsService);
    mockPrisma = mp;
  });

  afterEach(() => jest.clearAllMocks());

  describe('list', () => {
    it('should list public problems', async () => {
      const mockProblems = [
        { id: 'p1', number: 1, title: 'A+B', visibility: 'PUBLIC', createdById: 'u1', _count: { testcases: 2 } },
      ];
      mockPrisma.client.problem.findMany.mockResolvedValue(mockProblems);

      const result = await service.list(true);

      expect(result).toHaveLength(1);
      expect(result[0].number).toBe(1);
    });
  });

  describe('create', () => {
    it('should create a problem', async () => {
      mockPrisma.client.problem.create.mockResolvedValue({
        id: 'p-new',
        number: 5,
        title: 'New Problem',
      });
      mockPrisma.client.problem.findMany.mockResolvedValue([]);
      mockPrisma.client.problem.findUnique.mockResolvedValue({
        id: 'p-new',
        number: 5,
        title: 'New Problem',
        statement: 'desc',
        visibility: 'PRIVATE',
        judgeMode: 'OI',
        createdById: 'u1',
        testcases: [],
        _count: { testcases: 0 },
      });

      const result = await service.create(
        { title: 'New Problem', statement: 'desc', visibility: 'PRIVATE' },
        'u1',
      );

      expect(mockPrisma.client.problem.create).toHaveBeenCalled();
    });
  });

  describe('getByNumber', () => {
    it('should return a problem by number', async () => {
      mockPrisma.client.problem.findUnique.mockResolvedValue({
        id: 'p1',
        number: 1,
        title: 'A+B',
        description: 'desc',
        visibility: 'PUBLIC',
        judgeMode: 'OI',
        createdById: 'u1',
        testcases: [],
        _count: { testcases: 0 },
      });

      const result = await service.getByNumber('1', undefined);
      expect(result.number).toBe(1);
    });

    it('should throw NotFoundException for non-existent number', async () => {
      mockPrisma.client.problem.findUnique.mockResolvedValue(null);

      await expect(service.getByNumber('999', undefined)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update a problem', async () => {
      mockPrisma.client.problem.findUnique.mockResolvedValue({ id: 'p1' });
      mockPrisma.client.problem.update.mockResolvedValue({
        id: 'p1',
        number: 1,
        title: 'Updated',
      });

      await service.update('p1', { title: 'Updated' });
      expect(mockPrisma.client.problem.update).toHaveBeenCalled();
    });
  });
});
