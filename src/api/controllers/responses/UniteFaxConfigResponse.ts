import { IsNumber, IsString } from 'class-validator';

export class UniteFaxPartnerResponse {
    @IsNumber()
    public id: number;
    @IsString()
    public username: string;
    @IsString()
    public password: string;
    @IsString()
    public url: string;
}