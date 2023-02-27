import { IsOptional, IsString, ValidateNested } from 'class-validator';

export class FaxOutboundResponse {

    @IsOptional()
    @IsString()
    public queuedFaxId: string;
}

export class OutboundFaxStatus {
    public isSuccess: boolean;
    public errorMessage: string;
}

export class DocumentServiceResponse {
    public id: string;
    public recordType: string;
    public phelixDocUploadStatus: string;
    public emrDocUploadStatus: string;
    public description: string;
}

export class DocumentFetchResult {
    @IsString()
    public originalFileName: string;
    @IsString()
    public file: string;
}

export class DocumentFetchResponse {
    @ValidateNested()
    public result: DocumentFetchResult;
}
