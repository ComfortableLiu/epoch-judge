/**
 * Test module helper for creating NestJS testing modules with mocked PrismaService.
 */

import { Test, type TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { createMockPrisma, type MockPrisma } from './mock-prisma';

export interface CreateTestModuleOptions {
  providers?: any[];
  imports?: any[];
  overrides?: {
    provide: any;
    useValue: any;
  }[];
}

/**
 * Create a TestingModule with PrismaService mocked by default.
 * Additional providers, imports, and overrides can be passed in.
 */
export async function createTestModule(
  options: CreateTestModuleOptions = {},
): Promise<{ module: TestingModule; mockPrisma: MockPrisma }> {
  const mockPrisma = createMockPrisma();

  const builder = Test.createTestingModule({
    imports: options.imports ?? [],
    providers: [
      ...(options.providers ?? []),
      {
        provide: PrismaService,
        useValue: mockPrisma,
      },
      ...(options.overrides ?? []),
    ],
  });

  const module = await builder.compile();
  return { module, mockPrisma };
}
