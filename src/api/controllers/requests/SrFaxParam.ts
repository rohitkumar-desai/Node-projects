import { IsNumber, IsOptional, IsString } from 'class-validator';
export class SrFaxParam {
    @IsNumber()
    @IsOptional()
    public id: number;
    @IsNumber()
    @IsOptional()
    public srFaxNumber: number;
    @IsString()
    @IsOptional()
    public srFaxEmail: string;
    @IsString()
    @IsOptional()
    public srFaxPass: string;
    @IsString()
    @IsOptional()
    public srFaxAccountNum: string;
}

export class DocIdParams {
    @IsNumber()
    @IsOptional()
    public partnerId: number;

    @IsString()
    @IsOptional()
    public pdfDocumentId: string;

    @IsString()
    @IsOptional()
    public tifDocumentId: string;
}

export class SrFaxDetailRequest {
    @IsString()
    public startDate: string;

    @IsString()
    public endDate: string;
}
