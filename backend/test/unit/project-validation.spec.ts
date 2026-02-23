import { ProjectService } from '../../src/project/project.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';
import * as invalidInputs from '../fixtures/projects/invalid-inputs.json';

describe('Project Validation (Unit)', () => {
    let service: ProjectService;
    let prismaMock: PrismaServiceMock;
    let repoVerificationMock: any;

    beforeEach(() => {
        prismaMock = new PrismaServiceMock();
        repoVerificationMock = {
            verifyPromotionRepo: jest.fn().mockResolvedValue({ accessible: true }),
        };
        service = new ProjectService(prismaMock as any, repoVerificationMock);
    });

    describe('TC-UNIT-001 to 007: Project Validation', () => {
        it('TC-UNIT-001: should accept valid project name', async () => {
            const validDto = {
                name: 'payment-gateway',
                displayName: 'Payment Gateway',
                team: 'payments',
                teamEmail: 'pay@example.com',
            };

            const result = await service.createProject(validDto);
            expect(result.name).toBe(validDto.name);
        });

        invalidInputs.invalidNames.forEach(({ input, reason }) => {
            it(`should reject project name "${input}" because it has ${reason}`, async () => {
                const invalidDto = {
                    name: input,
                    displayName: 'Invalid',
                    team: 'test',
                    teamEmail: 'test@example.com',
                } as any;

                // Explicitly check for rejection. If this fails, it means validation is missing.
                await expect(service.createProject(invalidDto)).rejects.toThrow();
            });
        });
    });
});
