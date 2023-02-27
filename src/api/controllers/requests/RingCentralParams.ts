import { IsBoolean, IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
export class RingQueryParams {
    @IsString()
    @IsOptional()
    public availability: string;

    @IsNumber()
    @IsOptional()
    public conversationId: number;

    @IsDate()
    @IsOptional()
    public dateFrom: Date;

    @IsDate()
    @IsOptional()
    public dateTo: Date;

    @IsString()
    @IsOptional()
    public direction: string;

    @IsBoolean()
    @IsOptional()
    public distinctConversations: boolean;

    @IsString()
    @IsOptional()
    public messageType: string;

    @IsString()
    @IsOptional()
    public readStatus: string;

    @IsNumber()
    @IsOptional()
    public page: number;

    @IsNumber()
    @IsOptional()
    public perPage: number;

    @IsString()
    @IsOptional()
    public phoneNumber: string;
}

export class MessageListParam {
    @IsString()
    @IsOptional()
    public accountId: string;

    @IsNumber()
    @IsOptional()
    public extensionId: number;
}

export class BodyParamValues {
    @IsNumber()
    @IsOptional()
    public to: number;

    @IsString()
    @IsOptional()
    public faxResolution: string;
}

export class RingCentralConfig {
    @IsOptional()
    @IsString()
    public ringCentralToken: string;
    @IsOptional()
    @IsString()
    public ringCentralRefreshToken: string;
}
