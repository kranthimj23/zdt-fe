import { Controller, Post, Get, Patch, Body, Param, HttpCode } from '@nestjs/common';
import { BranchTrackerService } from '../services/branch-tracker.service';
import { CreateBranchTrackerDto } from '../dto/create-branch-tracker.dto';

@Controller('api/projects/:projectId/branches')
export class BranchTrackerController {
    constructor(private readonly branchTrackerService: BranchTrackerService) { }

    @Get()
    async listBranches(@Param('projectId') projectId: string) {
        return this.branchTrackerService.listBranches(projectId);
    }

    @Get('active')
    async getActiveBranches(@Param('projectId') projectId: string) {
        return this.branchTrackerService.getActiveBranches(projectId);
    }

    @Post()
    @HttpCode(201)
    async createBranch(
        @Param('projectId') projectId: string,
        @Body() dto: CreateBranchTrackerDto,
    ) {
        return this.branchTrackerService.createBranch(projectId, dto);
    }

    @Patch(':branchId')
    async updateBranch(
        @Param('branchId') branchId: string,
        @Body() body: { envName: string; branchName: string },
    ) {
        return this.branchTrackerService.updateEnvironmentStatus(branchId, body.envName, body.branchName);
    }
}
