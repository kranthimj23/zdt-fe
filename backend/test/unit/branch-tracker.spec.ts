import { BranchTrackerService } from '../../src/project/services/branch-tracker.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Branch Tracker (Unit)', () => {
    let service: BranchTrackerService;
    let prismaMock: PrismaServiceMock;
    const projectId = 'test-project-id';

    beforeEach(async () => {
        prismaMock = new PrismaServiceMock();
        service = new BranchTrackerService(prismaMock as any);

        // Setup environments
        await prismaMock.environment.create({
            data: { projectId, name: 'dev', promotionOrder: 1, valuesFolder: 'dev-values', isProduction: false }
        });
        await prismaMock.environment.create({
            data: { projectId, name: 'sit', promotionOrder: 2, valuesFolder: 'sit-values', isProduction: false }
        });
    });

    it('TC-UNIT-040: should find active branch for environment', async () => {
        await service.createBranch(projectId, {
            branchName: 'release/1.0.0',
            version: '1.0.0'
        });

        const active = await service.getActiveBranches(projectId);
        expect(active['dev']).toBe('release/1.0.0');
        expect(active['sit']).toBeUndefined(); // Should be 'X' in status, so undefined in summary
    });

    it('TC-UNIT-041: "X" means not yet promoted', async () => {
        const tracker = await service.createBranch(projectId, {
            branchName: 'release/2.0.0',
            version: '2.0.0'
        });

        const status = tracker.environmentStatuses as Record<string, string>;
        expect(status['sit']).toBe('X');

        const active = await service.getActiveBranches(projectId);
        expect(active['sit']).toBeUndefined();
    });

    it('should update environment status correctly', async () => {
        const tracker = await service.createBranch(projectId, {
            branchName: 'release/1.0.0',
            version: '1.0.0'
        });

        await service.updateEnvironmentStatus(tracker.id, 'sit', 'release/1.0.0');

        const active = await service.getActiveBranches(projectId);
        expect(active['sit']).toBe('release/1.0.0');
    });
});
