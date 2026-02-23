import { IsString } from 'class-validator';

export class CreateBranchTrackerDto {
    @IsString()
    branchName: string;

    @IsString()
    version: string;
}
