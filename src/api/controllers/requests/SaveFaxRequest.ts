import {IsString, ValidateNested} from 'class-validator';
import { FaxData } from '../../models/FaxOutbound';

export class SaveFaxRequest {
    @ValidateNested()
    public faxData: FaxData;

    @IsString()
    public patientId: string;

    @IsString()
    public referralId: string;
}
