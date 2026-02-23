import { Controller, Post, Get, Delete, Body, Param, Query, HttpCode } from '@nestjs/common';
import { ProjectService } from '../project.service';
import { RepoVerificationService } from '../services/repo-verification.service';
import { CreateSourceRepoDto } from '../dto/create-source-repo.dto';

@Controller('api/projects/:projectId/source-repos')
export class SourceRepoController {
    constructor(
        private readonly projectService: ProjectService,
        private readonly repoVerificationService: RepoVerificationService,
    ) { }

    @Post()
    @HttpCode(201)
    async addSourceRepo(
        @Param('projectId') projectId: string,
        @Body() dto: CreateSourceRepoDto,
    ) {
        return this.projectService.addSourceRepo(projectId, dto);
    }

    @Get()
    async listSourceRepos(
        @Param('projectId') projectId: string,
        @Query('repoType') repoType?: string,
    ) {
        return this.projectService.listSourceRepos(projectId, repoType);
    }

    @Get(':repoId')
    async getSourceRepo(@Param('repoId') repoId: string) {
        return this.projectService.getSourceRepo(repoId);
    }

    @Delete(':repoId')
    async removeSourceRepo(@Param('repoId') repoId: string) {
        return this.projectService.removeSourceRepo(repoId);
    }

    @Post(':repoId/verify')
    async verifySourceRepo(@Param('repoId') repoId: string) {
        return this.repoVerificationService.verifySourceRepo(repoId);
    }
}
