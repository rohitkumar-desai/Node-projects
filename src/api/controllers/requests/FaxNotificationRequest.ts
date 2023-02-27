import { IsNumber, IsOptional, IsString } from 'class-validator';

export class FaxNotificationRequest {
    @IsNumber()
    @IsOptional()
    public groupId: number;
    @IsString()
    @IsOptional()
    public faxId: string;
    @IsString()
    @IsOptional()
    public action: string;
    @IsString()
    @IsOptional()
    public userName: string;
    @IsString()
    public topicName: string;
}
