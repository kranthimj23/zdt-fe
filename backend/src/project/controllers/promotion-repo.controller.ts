import { Controller, Post, Get, Body, Param, HttpCode } from '@nestjs/common';
import { ProjectService } from '../project.service';
import { RepoVerificationService } from '../services/repo-verification.service';
import { CreatePromotionRepoDto } from '../dto/create-promotion-repo.dto';

@Controller('api/projects/:projectId/promotion-repo')
export class PromotionRepoController {
    constructor(
        private readonly projectService: ProjectService,
        private readonly repoVerificationService: RepoVerificationService,
    ) { }

    @Post()
    @HttpCode(201)
    async setPromotionRepo(
        @Param('projectId') projectId: string,
        @Body() dto: CreatePromotionRepoDto,
    ) {
        return this.projectService.setPromotionRepo(projectId, dto);
    }

    @Get()
    async getPromotionRepo(@Param('projectId') projectId: string) {
        return this.projectService.getPromotionRepo(projectId);
    }

    @Post('verify')
    @HttpCode(200)
    async verifyConnectivity(@Param('projectId') projectId: string) {
        return this.repoVerificationService.verifyPromotionRepo(projectId);
    }
}
