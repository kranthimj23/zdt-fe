import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CredentialService } from './credential.service';
import { simpleGit } from 'simple-git';
import { URL } from 'url';

export interface VerificationResult {
    accessible: boolean;
    message: string;
}

@Injectable()
export class RepoVerificationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly credentialService: CredentialService,
    ) { }

    async verifyRepo(repoUrl: string, credentialId?: string): Promise<VerificationResult> {
        let urlWithAuth = repoUrl;
        const timeout = parseInt(process.env.GIT_TIMEOUT_MS || '10000');

        if (credentialId) {
            try {
                const token = await this.credentialService.getDecryptedValue(credentialId);
                const url = new URL(repoUrl);
                url.username = token;
                urlWithAuth = url.toString();
            } catch (error) {
                return { accessible: false, message: `Failed to decrypt credential: ${error.message}` };
            }
        }

        try {
            const git = simpleGit();
            // Set timeout for git operations if possible, simple-git doesn't have a direct timeout for listRemote easily
            // but we can use a Promise.race or similar. For now, simple listRemote.
            await git.listRemote(['--refs', urlWithAuth]);
            return { accessible: true, message: 'Repository is accessible' };
        } catch (error) {
            return { accessible: false, message: error.message };
        }
    }

    async verifyPromotionRepo(projectId: string): Promise<VerificationResult> {
        const repo = await this.prisma.promotionRepo.findUnique({ where: { projectId } });
        if (!repo) {
            return { accessible: false, message: 'Promotion repo not configured' };
        }

        // Check if there's a git token for this project to use
        const credentials = await this.prisma.credential.findMany({
            where: { projectId, type: 'git_token' },
        });

        // Use the first git_token if available
        const result = await this.verifyRepo(repo.repoUrl, credentials[0]?.id);

        await this.prisma.promotionRepo.update({
            where: { id: repo.id },
            data: { isAccessible: result.accessible, lastVerifiedAt: new Date() },
        });

        return result;
    }

    async verifySourceRepo(repoId: string): Promise<VerificationResult> {
        const repo = await this.prisma.sourceRepo.findUniqueOrThrow({ where: { id: repoId } });

        const credentials = await this.prisma.credential.findMany({
            where: { projectId: repo.projectId, type: 'git_token' },
        });

        const result = await this.verifyRepo(repo.repoUrl, credentials[0]?.id);

        await this.prisma.sourceRepo.update({
            where: { id: repo.id },
            data: { isAccessible: result.accessible, lastVerifiedAt: new Date() },
        });

        return result;
    }
}
