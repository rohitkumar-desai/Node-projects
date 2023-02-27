import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn, Index} from 'typeorm';
import { FaxStatus, ProcessingStatus, PatientMatchStatus } from '../models/FaxDetails';

@Entity({ name: 'FAX_DETAIL' })
export class FaxDetailEntity {

    @PrimaryGeneratedColumn()
    public id: number;

    @Column({ name: 'FAX_ID', nullable: true })
    public faxId: string;

    @Column({ name: 'SYNC_ID', nullable: true })
    public syncId: string;

    @Index()
    @Column({ name: 'PARTNER_ID' })
    public partnerId: number;

    @Column({ name: 'FROM_FAX_NUMBER', nullable: true })
    public fromFaxNumber: string;

    @Column({ name: 'Pages', nullable: true })
    public pages: string;

    @Column({ name: 'RECIPIENT_FAX_NUMBER', nullable: true })
    public recipientFaxNumber: string;

    @Column({ name: 'PDF_Document_name', nullable: true })
    public pdfDocumentName: string;

    @Index()
    @Column({ name: 'PDF_Document_Id', nullable: true })
    public pdfDocumentId: string;

    @Index()
    @Column({ name: 'Tif_Document_Id', nullable: true })
    public tifDocumentId: string;

    @Column({ name: 'TIF_Document_name', nullable: true })
    public tifDocumentName: string;

    @Column({ name: 'PROCESSING_STATUS', enum: ProcessingStatus, type: 'enum', default: 'FAIL' })
    public processingStatus: ProcessingStatus;

    @Column({ name: 'IS_ACTIVE', nullable: true, default: true })
    public isActive: boolean;

    @Column({ name: 'PROCESSING_ERRORS', nullable: true, type: 'mediumtext' })
    public processingError: string[];

    @CreateDateColumn({ name: 'FAX_CREATED_AT', nullable: true })
    public faxCreatedAt: Date;

    @CreateDateColumn({ name: 'CREATED_AT' })
    public createdAt: Date;

    @UpdateDateColumn({ name: 'UPDATED_AT' })
    public updatedAt: Date;

    @Column({ name: 'FAX_STATUS', enum: FaxStatus, type: 'enum', nullable: true })
    public faxStatus: FaxStatus;

    @UpdateDateColumn({ name: 'FAX_STATUS_DATE', nullable: true })
    public faxStatusDate: Date;

    @Column({name: 'DOCUMENT_TYPE', nullable: true})
    public documentType: string;

    @Index()
    @Column({name: 'PATIENT_NAME', nullable: true})
    public patientName: string;

    @Index()
    @Column({ name: 'PATIENT_MATCH_STATUS', enum: PatientMatchStatus, type: 'enum', nullable: true })
    public patientMatchStatus: PatientMatchStatus;

    @Column({name: 'PRIORITY', nullable: true})
    public priority: string;

    @Column({name: 'FROM_USER', nullable: true})
    public fromUser: string;

    @Column({name: 'DOCUMENT_TYPE_CONFIDENCE', nullable: true})
    public documentTypeConfidence: string;

    @Column({name: 'TRASHED',  nullable: true, default: false})
    public trashed: boolean;

    @Column({name: 'OHIP', nullable: true})
    public ohip: string;

}
