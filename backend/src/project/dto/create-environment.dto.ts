import { IsString, IsInt, IsBoolean, IsOptional, Matches, Min } from 'class-validator';

export class CreateEnvironmentDto {
    @IsString()
    name: string;

    @IsString()
    displayName: string;

    @IsInt()
    @Min(1)
    promotionOrder: number;

    @IsString()
    @IsOptional()
    kubernetesNamespace?: string;

    @IsString()
    @IsOptional()
    clusterName?: string;

    @IsString()
    @Matches(/^.+-values$/, {
        message: 'valuesFolder must end with "-values" (e.g., "dev-values")',
    })
    valuesFolder: string;

    @IsBoolean()
    @IsOptional()
    isProduction?: boolean;
}
