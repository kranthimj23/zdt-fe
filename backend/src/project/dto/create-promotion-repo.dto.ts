import { IsString, IsOptional, Matches, Validate } from 'class-validator';
import { NoEmbeddedCredentials } from './no-embedded-credentials';

export class CreatePromotionRepoDto {
    @IsString()
    @Matches(/^https:\/\/.+\.git$/, {
        message: 'repoUrl must be a valid HTTPS Git URL ending in .git',
    })
    @Validate(NoEmbeddedCredentials)
    repoUrl: string;

    @IsString()
    @IsOptional()
    defaultBranch?: string;

    @IsString()
    @IsOptional()
    helmChartsPath?: string;

    @IsString()
    @IsOptional()
    metaSheetPath?: string;
}
