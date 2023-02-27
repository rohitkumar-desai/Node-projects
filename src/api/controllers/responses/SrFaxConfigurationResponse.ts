import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { FaxDetailEntity } from '../../entities/FaxDetailEntity';
export class SrFaxConfigurationResponse {
    @IsString()
    @IsOptional()
    public FileName: string;
    @IsString()
    @IsOptional()
    public ReceiveStatus: string;
    @IsDate()
    @IsOptional()
    public Date: Date;
    @IsNumber()
    @IsOptional()
    public EpochTime: number;
    @IsString()
    @IsOptional()
    public CallerID: string;
    @IsString()
    @IsOptional()
    public RemoteID: string;
    @IsString()
    @IsOptional()
    public Pages: string;
    @IsString()
    @IsOptional()
    public Size: string;
    @IsString()
    @IsOptional()
    public ViewedStatus: string;
    @IsString()
    @IsOptional()
    public User_ID: string;
    @IsString()
    @IsOptional()
    public User_FaxNumber: string;
}
export class SrFaxPartnerResponse {
    @IsNumber()
    @IsOptional()
    public id: number;
    @IsString()
    @IsOptional()
    public number: string;
    @IsString()
    @IsOptional()
    public email: string;
    @IsString()
    @IsOptional()
    public password: string;
    @IsString()
    @IsOptional()
    public accountNumber: string;
}

export class FaxPaginationResponse {
    public paginationDataObj: FaxDetailEntity[];
    public totalPage: number;
}
