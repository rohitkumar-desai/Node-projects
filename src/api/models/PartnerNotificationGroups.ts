import { IsOptional, IsString, IsArray, ValidateNested } from 'class-validator';

export class PartnerNotificationTopic {
    @IsOptional()
    public id: number;

    @IsString()
    public topicName: string;

}
export class PartnerNotificationGroup {
    @IsOptional()
    public id: number;

    @IsString()
    public groupName: string;

    @IsOptional()
    @IsArray()
    public userIds: string[];

    @IsOptional()
    @ValidateNested({each: true})
    public topics: PartnerNotificationTopic[];
}
