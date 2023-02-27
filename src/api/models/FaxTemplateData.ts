import { IsArray, IsOptional, IsString } from 'class-validator';

export class FaxTemplateData {

    @IsString()
    @IsOptional()
    public toName: string;

    @IsString()
    @IsOptional()
    public toAddress: string;

    @IsString()
    @IsOptional()
    public fromName: string;

    @IsString()
    @IsOptional()
    public fromAddress: string;

    @IsString()
    @IsOptional()
    public providerId: string;

    @IsString()
    @IsOptional()
    public content: string;

    @IsString()
    @IsOptional()
    patientName: string;

    @IsString()
    @IsOptional()
    patientDOB: string;

    @IsString()
    @IsOptional()
    hcn: string;

    @IsString()
    @IsOptional()
    physicianName: string;

    @IsString()
    @IsOptional()
    dateReferralReceived: string

    @IsString()
    @IsOptional()
    reason: string;

    @IsString()
    @IsOptional()
    clinicName: string;

    @IsString()
    @IsOptional()
    address: string;

    @IsString()
    @IsOptional()
    faxNumber: string;

    @IsArray()
    @IsOptional()
    missingItems: string[];

    @IsString()
    @IsOptional()
    providerNote: string;
}

export class FaxTemplateDataForNoShow {

    @IsString()
    @IsOptional()
    public referral_sent_date: string;

    @IsString()
    @IsOptional()
    public appointment_booked_date: string;

    @IsString()
    @IsOptional()
    public book_date: string;

    @IsString()
    @IsOptional()
    public book_address: string;

    @IsString()
    @IsOptional()
    public book_time: string;

    @IsString()
    @IsOptional()
    public pat_fname: string;

    @IsString()
    @IsOptional()
    public pat_lname: string;

    @IsString()
    @IsOptional()
    public pat_dob: string;

    @IsString()
    @IsOptional()
    public pat_hcn: string;

    @IsString()
    @IsOptional()
    public fax_number: string;

    @IsString()
    @IsOptional()
    public address: string;

    @IsString()
    @IsOptional()
    public clinic_name: string;

    @IsString()
    @IsOptional()
    public no_show_date: string;

    @IsString()
    @IsOptional()
    public providerId: string;

}
