import { ConfigExportService } from '../../src/project/services/config-export.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';

describe('Config Export Mock Test', () => {
    let service: ConfigExportService;
    let btsMock: any;
    let prismaMock: PrismaServiceMock;

    beforeEach(() => {
        prismaMock = new PrismaServiceMock();
        btsMock = {
            getActiveBranches: jest.fn().mockResolvedValue({ dev: 'main' }),
        };
        service = new ConfigExportService(prismaMock as any, btsMock as any);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });
});
