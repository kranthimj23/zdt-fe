import { RepoVerificationService } from '../../src/project/services/repo-verification.service';
import { PrismaServiceMock } from '../mocks/prisma.service.mock';
import { CredentialService } from '../../src/project/services/credential.service';
import { simpleGit } from 'simple-git';

jest.mock('simple-git');

describe('Git Connectivity (Integration)', () => {
    let service: RepoVerificationService;
    let prismaMock: PrismaServiceMock;
    let credentialService: CredentialService;
    let mockGit: any;

    beforeEach(() => {
        prismaMock = new PrismaServiceMock();
        process.env.ENCRYPTION_KEY = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
        credentialService = new CredentialService(prismaMock as any);
        service = new RepoVerificationService(prismaMock as any, credentialService);

        mockGit = {
            listRemote: jest.fn(),
        };
        (simpleGit as jest.Mock).mockReturnValue(mockGit);
    });

    afterAll(() => {
        delete process.env.ENCRYPTION_KEY;
    });

    it('TC-INT-010: should verify accessible public repo', async () => {
        mockGit.listRemote.mockResolvedValue('refs/heads/master');

        const result = await service.verifyRepo('https://github.com/org/public.git');
        expect(result.accessible).toBe(true);
        expect(mockGit.listRemote).toHaveBeenCalledWith(['--refs', 'https://github.com/org/public.git']);
    });

    it('TC-INT-011: should handle inaccessible repo', async () => {
        mockGit.listRemote.mockRejectedValue(new Error('fatal: repository not found'));

        const result = await service.verifyRepo('https://github.com/org/private.git');
        expect(result.accessible).toBe(false);
        expect(result.message).toContain('repository not found');
    });

    it('TC-INT-013: should inject credentials correctly into URL', async () => {
        const token = 'my-token';
        const project = await prismaMock.project.create({ data: { name: 'p', team: 't', teamEmail: 't@e.com', displayName: 'P' } });
        const cred = await prismaMock.credential.create({
            data: {
                projectId: project.id,
                name: 'git-token',
                type: 'git-token',
                value: credentialService.encrypt(token)
            }
        });

        mockGit.listRemote.mockResolvedValue('ok');

        await service.verifyRepo('https://github.com/org/repo.git', cred.id);

        // Check that listRemote was called with the token injected
        expect(mockGit.listRemote).toHaveBeenCalledWith(['--refs', `https://${token}@github.com/org/repo.git`]);
    });
});
