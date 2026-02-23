import { IsString, IsEmail, IsOptional, Matches, MaxLength } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Matches(/^[a-z0-9][a-z0-9-]*[a-z0-9]$/, {
    message: 'name must be lowercase alphanumeric with hyphens, cannot start/end with hyphen',
  })
  @MaxLength(63, { message: 'name must not exceed 63 characters' })
  name: string;

  @IsString()
  displayName: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  team: string;

  @IsEmail({}, { message: 'teamEmail must be a valid email address' })
  teamEmail: string;
}
