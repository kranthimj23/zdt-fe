import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BranchTrackerService } from './branch-tracker.service';

@Injectable()
export class MigrationService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly branchTrackerService: BranchTrackerService,
    ) { }

    async importMetaSheet(projectId: string, filePath: string) {
        // Basic stub as per implementation guide
        return { importedCount: 0, message: 'Migration service triggered for meta-sheet' };
    }

    async importRepoList(projectId: string, repoListText: string, repoType: string) {
        const urls = repoListText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
        const results = [];
        for (const url of urls) {
            try {
                const prismaRepoType = repoType === 'aql-db' ? 'aql_db' :
                    repoType === 'sql-db' ? 'sql_db' :
                        repoType;
                const repo = await this.prisma.sourceRepo.create({
                    data: {
                        projectId,
                        repoUrl: url,
                        name: url.split('/').pop()?.replace('.git', '') || 'unnamed-repo',
                        repoType: prismaRepoType as any,
                    },
                });
                results.push(repo);
            } catch (e) {
                // Skip duplicates or errors
            }
        }
        return { importedCount: results.length };
    }
}
