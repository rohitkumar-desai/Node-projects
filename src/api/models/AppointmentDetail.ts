import { IsNumber, IsOptional, IsString  } from 'class-validator';

export enum PHELIX_APPOINTMENT_STATUS {
    IMAGES_READY = 'Images ready',
    IN_ROOM = 'In-Room',
    OUT = 'Out',
    VWR = 'VWR',
    CHECKED_IN = 'Checked-In',
}

export class AppointmentDetail {

    public id: number;
    public patientId: number;
    public claimId: number;
    public patientName: string;
    public clinicAddress: string;
    public currentRoomStatus: string;
    public patientPhone: string;
    public patientWebId: number;
    public cancellationReason: string;
    public patientEMRId: string;
    public webAppointmentId: number;
    public emrAppointmentId: number;
    public emrApptStatusCode: string;
    public webApptStatus: string;
    public notes: string;
    public reason: string;
    public notifyType: string;
    public notifyStatus: string;
    public notifyStatusIcon: string;
    public referralId: number;
    public isActive: string;
    public entryType: string;
    public priority: string;
    public assignedPhysician: number;
    public providerId: number;
    public emrPhysicianId: string;
    public roomId: number;
    public roomName: string;
    public startTime: Date;
    public endTime: Date;
    public duration: number;
    public location: string;
    public webLocationId: number;
    public locationId: number;
    public status: string;
    public slot: string;
    public confirmed: string;
    public arrived: string;
    public arrivedTime: Date;
    public registered: string;
    public invoiceId: number;
    public type: string;
    public officeId: number;
    public source: string;
    public confirmationStatus: string;
    public createdAt: Date;
    public updatedAt: Date;
    public paymentAmount: string;
    public registrationFormLink: string;
    public registrationFormName: string;
    public paymentFormLink: string;
    public paymentFormName: string;
    public checkIn: boolean;
    public registrationFormSent: boolean;
    public paymentFormSent: boolean;
    public physicianName: string;
    public priorityId: number;
    public updateSource: string;
    public authRequired: boolean;
    public isEligible: boolean;
    public orderId: number;
    public isReserved = false;
    public lineItemId: number;
    public phelixAppointmentStatus: PHELIX_APPOINTMENT_STATUS;
    public reportStatuses: ReportStatusEntity[] = [];
}

export class ReportStatusEntity {

    public id: number;
    public documentId: string;
    public status: ReportStatus;
    public sendingResult: string;
    public createdAt: Date;
    public updatedAt: Date;

}

export enum ReportStatus {
    NA = 'NA', // Default
    PENDING = 'PENDING', // Neither Infinitt has sent an image nor Ikonopedia/Nuance has sent a report
    IMAGE_RECEIVED = 'IMAGE_RECEIVED', // Infinitt has sent an image
    REPORT_RECEIVED = 'REPORT_RECEIVED', // Ikonopedia/Nuance has sent a report
    REPORT_SENT = 'REPORT_SENT', // Outbound Fax Report has been sent
    REPORT_SENT_FAILED = 'REPORT_SENT_FAILED', // Outbound Fax Report sending failed
}

export class AppointmentDetailModel {

    @IsNumber()
    @IsOptional()
    public id: number;

    @IsNumber()
    @IsOptional()
    public patientId: number;

    @IsOptional()
    @IsNumber()
    public referralId: number;

    @IsString()
    @IsOptional()
    public clinicAddress: string;
    @IsString()
    @IsOptional()
    public cancellationReason: string;

    @IsString()
    public startTime: string;

    @IsString()
    public endTime: string;

    @IsString()
    public location: string;

    @IsOptional()
    public arrivedTime: string;

    @IsOptional()
    public createdAt: string;

    @IsString()
    @IsOptional()
    public providerFaxNo: string;

    @IsString()
    @IsOptional()
    public providerNpi: string;


}
