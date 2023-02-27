import { IsEnum, IsOptional, IsString } from 'class-validator';

export class InboxHL7Message {
    public data: InboxHL7MessageData[];
    public count: number;
}

export class InboxHL7MessageData {
    public id: number;
    public uuid: string;

    public status: string;
    public messageType: string;

    public from: string;
    public to: string;

    public referralId: string;
    public partnerId: number;
}

export enum InboundMessageStatus {
    NEW = 'NEW',
    OPEN = 'OPEN',
    REPORT_SENT = 'REPORT_SENT',
}

export class InboxHL7Patch {
    @IsString()
    public uuid: string;

    @IsEnum(InboundMessageStatus)
    @IsOptional()
    public inboxMessageStatus: InboundMessageStatus;

    @IsOptional()
    public referralId: number;
}
