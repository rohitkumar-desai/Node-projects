import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { FaxProvider, ProcessingStatus } from '../models/FaxDetails';
import { FaxTemplate } from '../models/FaxOutbound';

@Entity({ name: 'FAX_OUTBOUND_DETAIL' })
export class FaxOutboundDetailEntity {

    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: 'PARTNER_ID' })
    public partnerId: number;

    @Column({ name: 'APPOINTMENT_ID', nullable: true })
    public appointmentId: number;

    @Column({ name: 'PATIENT_ID', nullable: true })
    public patientId: number;

    @Column({ name: 'REFERRAL_ID', nullable: true })
    public referralId: number;

    @Column({ name: 'SENDER_FAX_NUMBER', nullable: true })
    public senderFaxNumber: string;

    @Column({ name: 'FAX_PROVIDER', type: 'enum', enum: FaxProvider, default: FaxProvider.OTHER })
    public faxProvider: FaxProvider;

    @Column({ name: 'FAX_TEMPLATE_TYPE', enum: FaxTemplate, type: 'enum' })
    public faxTemplateType: FaxTemplate;

    @Column({ name: 'RECIPIENT_FAX_NUMBER' })
    public recipientFaxNumber: string;

    @Column({ name: 'FAX_SEND_STATUS', enum: ProcessingStatus, type: 'enum' })
    public faxSendStatus: ProcessingStatus;

    @Column({ name: 'FAX_SEND_ERROR', nullable: true, type: 'longtext' })
    public faxSendError: string;

    @CreateDateColumn({ name: 'CREATED_AT' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'UPDATED_AT' })
    public updatedAt: Date;
}
