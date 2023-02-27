import { IsOptional, IsString } from 'class-validator';

export class UploadInfo {
    @IsString()
    @IsOptional()
    public id: string;

    @IsOptional()
    @IsString()
    public originalFileName: string;

    @IsOptional()
    @IsString()
    public url: string;

}

export class DownloadInfo {
    @IsString()
    @IsOptional()
    public file: string;

    @IsOptional()
    @IsString()
    public originalFileName: string;

}

export class FileResponse {
    @IsString()
    @IsOptional()
    public pdfId: string;

    @IsOptional()
    @IsString()
    public pdfFileName: string;

    @IsOptional()
    @IsString()
    public tifID: string;

    @IsString()
    @IsOptional()
    public tifFileName: string;

    @IsOptional()
    @IsString()
    public pages: string;

    @IsOptional()
    @IsString()
    public pdfUrl: string;

    @IsOptional()
    @IsString()
    public tifUrl: string;
}
