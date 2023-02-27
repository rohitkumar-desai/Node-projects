import { IsNumber, IsOptional, IsString } from 'class-validator';
export class SrFaxConfig {
    @IsString()
    public action: string;
    @IsString()
    public access_id: string;
    @IsString()
    public access_pwd: string;
    @IsString()
    @IsOptional()
    public sPeriod: string;
    @IsString()
    public sStartDate: string;
    @IsString()
    public sEndDate: string;
    @IsString()
    @IsOptional()
    public sIncludeSubUsers: string;
    @IsString()
    @IsOptional()
    public sDirection: string;
    @IsString()
    @IsOptional()
    public sFaxDetailsID: string;
    @IsString()
    @IsOptional()
    public sFaxFileName: string;
    @IsString()
    @IsOptional()
    public sFaxFormat: string;
}

export class PaginationParams {
    @IsNumber()
    @IsOptional()
    public page: number;
    @IsNumber()
    @IsOptional()
    public limit: number;
    @IsString()
    @IsOptional()
    public searchString: string;
    @IsString()
    @IsOptional()
    public faxType: string;
}

export class SerchDateParams {
    @IsString()
    @IsOptional()
    public startDate: string;
    @IsString()
    @IsOptional()
    public endDate: string;
}
