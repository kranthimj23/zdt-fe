import { Module } from '@nestjs/common';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { CredentialService } from './services/credential.service';
import { RepoVerificationService } from './services/repo-verification.service';
import { BranchTrackerService } from './services/branch-tracker.service';
import { EnvironmentService } from './services/environment.service';
import { ConfigExportService } from './services/config-export.service';
import { MigrationService } from './services/migration.service';
import { PromotionRepoController } from './controllers/promotion-repo.controller';
import { SourceRepoController } from './controllers/source-repo.controller';
import { EnvironmentController } from './controllers/environment.controller';
import { CredentialController } from './controllers/credential.controller';
import { BranchTrackerController } from './controllers/branch-tracker.controller';

@Module({
    controllers: [
        ProjectController,
        PromotionRepoController,
        SourceRepoController,
        EnvironmentController,
        CredentialController,
        BranchTrackerController,
    ],
    providers: [
        ProjectService,
        CredentialService,
        RepoVerificationService,
        BranchTrackerService,
        EnvironmentService,
        ConfigExportService,
        MigrationService,
    ],
    exports: [
        ProjectService,
        CredentialService,
        ConfigExportService,
        BranchTrackerService,
    ],
})
export class ProjectModule { }
