import { Controller, Post, Body, Param, HttpCode } from '@nestjs/common';
import { MigrationService } from '../services/migration.service';

@Controller('api/projects/:projectId/migration')
export class MigrationController {
    constructor(private readonly migrationService: MigrationService) { }

    @Post('import-meta-sheet')
    @HttpCode(201)
    async importMetaSheet(
        @Param('projectId') projectId: string,
        @Body() body: { filePath: string },
    ) {
        return this.migrationService.importMetaSheet(projectId, body.filePath);
    }

    @Post('import-repos')
    @HttpCode(201)
    async importRepoList(
        @Param('projectId') projectId: string,
        @Body() body: { repoListText: string; repoType: string },
    ) {
        return this.migrationService.importRepoList(projectId, body.repoListText, body.repoType);
    }
}
