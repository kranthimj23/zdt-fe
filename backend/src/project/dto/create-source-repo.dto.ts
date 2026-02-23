import { IsString, IsEnum, IsOptional, Matches, Validate } from 'class-validator';
import { NoEmbeddedCredentials } from './no-embedded-credentials';

export class CreateSourceRepoDto {
    @IsString()
    name: string;

    @IsString()
    @Matches(/^https:\/\/.+\.git$/, {
        message: 'repoUrl must be a valid HTTPS Git URL ending in .git',
    })
    @Validate(NoEmbeddedCredentials)
    repoUrl: string;

    @IsEnum(['app', 'aql-db', 'sql-db', 'infra'], {
        message: 'repoType must be one of: app, aql-db, sql-db, infra',
    })
    repoType: 'app' | 'aql-db' | 'sql-db' | 'infra';

    @IsString()
    @IsOptional()
    defaultBranch?: string;

    @IsString()
    @IsOptional()
    helmValuesPath?: string;
}
