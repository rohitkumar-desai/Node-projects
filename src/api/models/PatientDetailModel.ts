import { IsPositive, IsString, IsOptional } from 'class-validator';

export class PatientDetailModel {
    @IsPositive()
    @IsOptional()
    public patientId: number;

    @IsString()
    @IsOptional()
    public firstName: string;

    @IsString()
    @IsOptional()
    public lastName: string;

    @IsString()
    @IsOptional()
    public hcnType: string;

    @IsString()
    @IsOptional()
    public hcnVersion: string;

    @IsOptional()
    public dob: string;

    @IsOptional()
    @IsString()
    public gender: string ;

}
