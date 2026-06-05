/**
 * Mock PrismaService factory for unit tests.
 * Returns a mock PrismaService with jest.fn() for all CRUD operations
 * used by the core services (user, problem, contest, submission, contestRegistration).
 */

type MockModel = {
  findUnique: jest.Mock;
  findMany: jest.Mock;
  findFirst: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
  updateMany: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
  aggregate: jest.Mock;
  groupBy: jest.Mock;
};

function createMockModel(): MockModel {
  return {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    createMany: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
    count: jest.fn(),
    aggregate: jest.fn(),
    groupBy: jest.fn(),
  };
}

export function createMockPrisma() {
  return {
    client: {
      user: createMockModel(),
      problem: createMockModel(),
      testcase: createMockModel(),
      submission: createMockModel(),
      submissionTestcaseResult: createMockModel(),
      contest: createMockModel(),
      contestProblem: createMockModel(),
      contestRegistration: createMockModel(),
      $transaction: jest.fn((fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          contest: createMockModel(),
          contestProblem: createMockModel(),
          submission: createMockModel(),
        }),
      ),
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    },
  };
}

export type MockPrisma = ReturnType<typeof createMockPrisma>;
