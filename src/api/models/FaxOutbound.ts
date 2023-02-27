import { Type } from 'class-transformer';
import { ArrayNotEmpty, IsBoolean, IsDate, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';
import { UploadedFile } from 'routing-controllers';
import { AppointmentDetailModel } from './AppointmentDetail';
import { PatientDetailModel } from './PatientDetailModel';

export class ProviderDetails {
    @IsString()
    public name: string;
    @IsString()
    public faxNumber: string;
    @IsString()
    public npi: string;
}

export enum FaxTemplate {
    APPOINTMENT_BOOKING = 'APPOINTMENT_BOOKING',
    MISSING_ITEM = 'MISSING_ITEM',
    REFERRAL_RECEIVED = 'REFERRAL_RECEIVED',
}
export class FaxData {

    @IsString()
    public toName: string;

    @IsString()
    public toAddress: number;

    @IsString()
    @IsOptional()
    public content: string;

}

export class FaxOutbound {

    @IsString()
    public appointmentId: string;

    @ValidateNested()
    public providerDetail: ProviderDetails;

    @ValidateNested()
    public faxData: FaxData;

    @IsString()
    public patientId: string;

    @IsString()
    public referralId: string;

}

export class FaxOutboundV2 {

    @IsString()
    public phoneNumber: string;

    @IsString()
    public faxNumber: string;

    @IsString()
    public fileType: FaxFileType;

    @IsOptional()
    public referralId: string;

    @IsString()
    public patientId: string;

    @UploadedFile('document')
    public file: any;

}

export enum FaxFileType {
    HTML = 'HTML',
    PDF = 'PDF',
}

export class FaxOutboundNotification {

    @IsString()
    public appointmentId: string;

    @IsString()
    public providerId: string; // NPI

    @IsString()
    public referralId: string;

    @IsString()
    public patientId: string; // NPI

    @IsBoolean()
    public isFaxSent: boolean;

    @IsNumber()
    public partnerId: number;

    @IsString()
    public docId: string;
}

export class Document {
    @IsString()
    public documentId: string;

    @IsNumber()
    public patientId: number;
}

export class FaxOutboundExt {

    @IsNumber({}, { each: true })
    @ArrayNotEmpty()
    public faxNumbers: number[];

    @ArrayNotEmpty()
    @ValidateNested({ each: true })
    @Type(() => Document)
    public documents: Document[];
}

export class FaxOutboundForNoShow {
    public referralSentDate: string;
    public appointmentBookedDate: string;
    public bookTime: string;
    public patientNoShowDate: string;
    public patientDetail: PatientDetailModel;
    public appointmentDetail: AppointmentDetailModel;
}

export class FaxSendReferral {
    @IsNumber()
    @IsOptional()
    public patientId: number;

    @IsNumber()
    @IsOptional()
    public referralId: number;

    @IsNumber()
    public toFaxNumber: number;

    @IsOptional()
    public replaceData: any;
}

export class AppointmentBookFaxData {
    @IsString()
    @IsOptional()
    public appointmentDate: string;

    @IsString()
    @IsOptional()
    public appointmentAddress: string;

    @IsString()
    @IsOptional()
    public appointmentTime: string;

    @IsString()
    @IsOptional()
    public patientFirstName: string;

    @IsString()
    @IsOptional()
    public patientLastName: string;

    @IsDate()
    @IsOptional()
    public patientDOB: Date;

    @IsString()
    @IsOptional()
    public patientHCN: string;

    @IsString()
    @IsOptional()
    public physicianFirstName: string;

    @IsString()
    @IsOptional()
    public physicianLastName: string;
}

export class FaxSendData {
    @IsNumber()
    @IsOptional()
    public appointmentId: number;

    @IsNumber()
    @IsOptional()
    public patientId: number;

    @IsNumber()
    @IsOptional()
    public referralId: number;

    @IsString()
    @IsOptional()
    public partnerName: string;

    @IsString()
    @IsOptional()
    public partnerAddress: string;

    @IsString()
    @IsOptional()
    public partnerFaxNumber: string;

    @IsString()
    public recipientFaxNumber: string;

    @IsEnum(FaxTemplate)
    public faxTemplateType: FaxTemplate;

    // Data used in fax on booking appointment.
    @IsOptional()
    public appointmentBookFaxData: AppointmentBookFaxData;

    @IsOptional()
    public replaceData: any;
}
