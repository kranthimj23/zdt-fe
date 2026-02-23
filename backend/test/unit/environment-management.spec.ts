import { EnvironmentService } from '../../src/project/services/environment.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Environment Management (Unit)', () => {
    let service: EnvironmentService;
    let prismaMock: PrismaServiceMock;
    const projectId = 'test-project-id';

    beforeEach(() => {
        prismaMock = new PrismaServiceMock();
        service = new EnvironmentService(prismaMock as any);
    });

    it('TC-UNIT-024: should apply default template correctly', async () => {
        const result = await service.applyTemplate(projectId);

        // Internal data would be in the mock store
        const environments = await prismaMock.environment.findMany({ where: { projectId } });

        expect(environments.length).toBe(5);
        expect(environments.map(e => e.name)).toEqual(['dev', 'sit', 'uat', 'pre-prod', 'prod']);

        const prod = environments.find(e => e.name === 'prod');
        expect(prod?.isProduction).toBe(true);
        expect(prod?.promotionOrder).toBe(5);
    });

    it('TC-UNIT-021: should reject duplicate promotion order', async () => {
        await service.addEnvironment(projectId, {
            name: 'dev',
            displayName: 'Dev',
            promotionOrder: 1,
            valuesFolder: 'dev-values',
            isProduction: false,
            kubernetesNamespace: 'dev-ns'
        });

        const duplicateOrder = {
            name: 'other',
            displayName: 'Other',
            promotionOrder: 1,
            valuesFolder: 'other-values',
            isProduction: false,
            kubernetesNamespace: 'other-ns'
        };

        await expect(service.addEnvironment(projectId, duplicateOrder)).rejects.toThrow(/already used/);
    });

    it('TC-UNIT-023: should reject duplicate environment name', async () => {
        await service.addEnvironment(projectId, {
            name: 'dev',
            displayName: 'Dev',
            promotionOrder: 1,
            valuesFolder: 'dev-values',
            isProduction: false,
            kubernetesNamespace: 'dev-ns'
        });

        const duplicateName = {
            name: 'dev',
            displayName: 'Different',
            promotionOrder: 2,
            valuesFolder: 'dev-values',
            isProduction: false,
            kubernetesNamespace: 'dev-ns'
        };

        await expect(service.addEnvironment(projectId, duplicateName)).rejects.toThrow(/already exists/);
    });

    it('should list environments ordered by promotionOrder', async () => {
        // Add out of order
        await service.addEnvironment(projectId, {
            name: 'sit',
            displayName: 'SIT',
            promotionOrder: 2,
            valuesFolder: 'sit-values',
            isProduction: false,
            kubernetesNamespace: 'sit-ns'
        });
        await service.addEnvironment(projectId, {
            name: 'dev',
            displayName: 'Dev',
            promotionOrder: 1,
            valuesFolder: 'dev-values',
            isProduction: false,
            kubernetesNamespace: 'dev-ns'
        });

        const list = await service.listEnvironments(projectId);
        expect(list[0].name).toBe('dev');
        expect(list[1].name).toBe('sit');
    });
});
