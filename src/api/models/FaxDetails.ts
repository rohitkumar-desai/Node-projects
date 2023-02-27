import { IsOptional, IsNotEmpty, IsString, IsNumber, IsEnum, IsArray } from 'class-validator';

export enum ProcessingStatus {
    PROCESSING = 'PROCESSING',
    SUCCESS = 'SUCCESS',
    FAIL = 'FAIL',
}

export enum FaxStatus {
    REFERRAL = 'referral',
    SAVE = 'save',
    DELETE = 'delete',
    TRASH = 'trash',
}

export enum PatientMatchStatus {
    MULTIPLE = 'MULTIPLE',
    SINGLE = 'SINGLE',
    NONE = 'NONE',
}

export class FaxUpdate {
    @IsString()
    @IsOptional()
    public recipientFaxNumber: string;

    @IsString()
    @IsOptional()
    public fromFaxNumber: string;

    @IsString()
    @IsOptional()
    public createdAt: string;
}

export class FaxUploadCallbackRequest {
    @IsNotEmpty()
    @IsString()
    public fileName: string;

    @IsNotEmpty()
    @IsString()
    public originalFileName: string;

    @IsNotEmpty()
    @IsNumber()
    public partnerId: number;

    @IsNotEmpty()
    @IsString()
    public fileUrl: string;

    @IsNotEmpty()
    @IsString()
    public bucketName: string;

    @IsNotEmpty()
    @IsString()
    public bucketFilePath: string;

    @IsNotEmpty()
    @IsString()
    public fileExtension: string;

    @IsNotEmpty()
    @IsString()
    public documentId: string;

    @IsString()
    @IsOptional()
    public recipientFaxNumber: string;

    @IsString()
    @IsOptional()
    public fromFaxNumber: string;
}

export class FaxDetail {

    @IsString()
    @IsOptional()
    public id: number;

    @IsNumber()
    @IsOptional()
    public partnerId: number;

    @IsString()
    @IsOptional()
    public FileName: string;

    @IsString()
    @IsOptional()
    public ReceiveStatus: string;

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
    public User_FaxNumber: string;

    @IsString()
    @IsOptional()
    public pdf_document_id: string;

    @IsString()
    @IsOptional()
    public tif_document_id: string;

    @IsOptional()
    @IsEnum(ProcessingStatus)
    public processingStatus: ProcessingStatus;

    @IsOptional()
    @IsEnum(FaxStatus)
    public faxStatus: FaxStatus;

    @IsOptional()
    @IsArray()
    public processingError: string[];

    @IsOptional()
    public documentType: string;

    @IsOptional()
    public documentTypeConfidence: string;

    @IsOptional()
    public patientName: string;

    @IsOptional()
    public patientMatchStatus: PatientMatchStatus;

    @IsOptional()
    public priority: string;

    @IsOptional()
    public fromUser: string;

    @IsOptional()
    public ohip: string;

}

export enum FaxProvider {
    SRFAX = 'SRFAX',
    RING_CENTRAL = 'RING_CENTRAL',
    UNITE_FAX = 'UNITE_FAX',
    OTHER = 'OTHER',
}

export class FaxSyncRequestModel {
    @IsString()
    public startDate: string;

    @IsString()
    public endDate: string;

    @IsEnum(FaxProvider)
    public faxProvider: FaxProvider;
}

export class FaxDelete {
    @IsArray()
    public id: number[];
    @IsString()
    public status: FaxStatus;
}
