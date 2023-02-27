
import { IsBoolean, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, ValidateNested } from 'class-validator';

export enum ScheduleManagedBy {
    ROOM = 'ROOM',
    PHYSICIAN = 'PHYSICIAN',
}

export class PartnerFormConfig {
    @IsBoolean()
    public useReferralForm: boolean;
    @IsBoolean()
    public useCustomField: boolean;
    @IsBoolean()
    public useReferralCheckboxForm: boolean;
    @IsBoolean()
    public useBookingForm: boolean;
}

export class PartnerFaxConfig {
    @IsBoolean()
    public referralReceivedFax: boolean;
    @IsBoolean()
    public faxTriageActive: boolean;
    @IsBoolean()
    public pullFaxEnable: boolean;
    @IsString()
    public inboxIntegrationType: string;
}

export class PartnerFeatureToggles {
    @IsBoolean()
    public patientIntegrationEnable: boolean;
    @IsBoolean()
    public virtualMeetingRoomEnable: boolean;
    @IsBoolean()
    public wayFindingSMSEnable: boolean;
    @IsBoolean()
    public integrationCheckInEnable: boolean;
    @IsBoolean()
    public autoBookEnable: boolean;
    @IsBoolean()
    public visitFlowEnable: boolean;
    @IsBoolean()
    public insuranceEligibiltyCheckEnable: boolean;
    @IsBoolean()
    public recondoAuthIntegrationEnable: boolean;
    @IsBoolean()
    public priorAuthEnable: boolean;
    @IsBoolean()
    public saveAnalytics: boolean;
    @IsEnum(ScheduleManagedBy)
    public scheduleManagedBy: ScheduleManagedBy;
}

export class PartnerContact {
    @IsString()
    public phoneNumber: string;
    @IsString()
    public faxNumber: string;
    @IsString()
    public address: string;
    @IsString()
    public country: string;
    @IsString()
    public callAddress: string;
    @IsString()
    public emailAddress: string;
}

export class PartnerOSCARConfig {
    @IsOptional()
    @IsString()
    public username: string;
    @IsString()
    @IsOptional()
    public password: string;
    @IsString()
    public baseUrl: string;
    @IsString()
    public consumerKey: string;
    @IsString()
    public clientSecret: string;
    @IsString()
    public callBackUrl: string;
    @IsString()
    public verifier: string;
    @IsString()
    public token: string;
    @IsString()
    public tokenSecret: string;
    @IsBoolean()
    @IsOptional()
    public enablePull: boolean;
    @IsBoolean()
    @IsOptional()
    public enablePush: boolean;
}

export class PartnerACCUROConfig {
    @IsOptional()
    @IsString()
    public username: string;
    @IsString()
    @IsOptional()
    public password: string;
    @IsString()
    public baseUrl: string;
    @IsString()
    public clientId: string;
    @IsString()
    public clientSecret: string;
    @IsString()
    public callBackUrl: string;
    @IsString()
    public uuId: string;
    @IsString()
    public accessTokenUrl: string;
    @IsString()
    public token: string;
    @IsString()
    public refreshToken: string;
    @IsString()
    public expireIn: string;
    @IsBoolean()
    @IsOptional()
    public enablePull: boolean;
    @IsBoolean()
    @IsOptional()
    public enablePush: boolean;
    @IsString()
    public scope: string;
    @IsNumber()
    @IsOptional()
    public id: number;
}

export class PartnerInfinittConfig {
    @IsString()
    public baseUrl: string;
    @IsString()
    public userName: string;
    @IsString()
    public password: string;
}

export class PartnerRingCentralConfig {
    @IsNumber()
    public id: number;
    @IsOptional()
    @IsString()
    public ringCentralClientId: string;
    @IsOptional()
    @IsString()
    public ringCentralClientSecret: string;
    @IsOptional()
    @IsString()
    public ringCentralToken: string;
    @IsOptional()
    @IsString()
    public ringCentralRefreshToken: string;
}

export class PartnerSRFaxConfig {
    @IsNumber()
    public id: number;
    @IsString()
    public number: string;
    @IsString()
    public email: string;
    @IsString()
    public password: string;
    @IsString()
    public accountNumber: string;
    @IsBoolean()
    public pullFax: boolean;
    @IsBoolean()
    public isActive: boolean;
}

export class PartnerOtherConfig {
    @IsBoolean()
    public selfReferral: boolean;
    @IsString()
    public selfReferralLink: string;
    @IsBoolean()
    public locationProviderDependency: boolean;
    @IsBoolean()
    public procedureCodes: boolean;
    @IsBoolean()
    public insurance: boolean;
    @IsString()
    public verificationCode: string;
    @IsNumber()
    public authDelay: number;
}

export class PartnerUniteFaxConfig {
    @IsNumber()
    public id: number;
    @IsOptional()
    @IsString()
    public username: string;
    @IsOptional()
    @IsString()
    public password: string;
    @IsOptional()
    @IsString()
    public url: string;
    @IsOptional()
    @IsString()
    public isActive: boolean;
    @IsOptional()
    @IsBoolean()
    public pullFax: boolean;

}
export class PartnerDetails {
    @IsNumber()
    @IsNotEmpty({ message: 'Id should not be empty' })
    public id: number;
    @IsString()
    @IsNotEmpty({ message: 'name should not be empty' })
    public name: string;
    @IsString()
    @IsNotEmpty({ message: 'type should not be empty' })
    public type: string;
    @IsString()
    public key: string;
    @IsString()
    @IsOptional()
    public group: string;
    @IsString()
    public fullName: string;
    @IsBoolean()
    public active: boolean;
    @IsString()
    public region: string;
    @IsString()
    @IsOptional()
    public timezone: string;
    @IsString()
    public emrPathWay: string;
    @ValidateNested({
        each: true,
    })
    @ValidateNested()
    public formConfig: PartnerFormConfig;
    @ValidateNested()
    public faxConfig: PartnerFaxConfig;
    @ValidateNested()
    public featureToggles: PartnerFeatureToggles;
    @ValidateNested()
    public contactDetail: PartnerContact;
    @ValidateNested()
    public oscarConfig: PartnerOSCARConfig;
    @ValidateNested()
    public accuroConfig: PartnerACCUROConfig;
    @ValidateNested()
    public infinittConfig: PartnerInfinittConfig;
    @ValidateNested()
    public ringCentralConfig: PartnerRingCentralConfig[];
    @ValidateNested()
    public srFaxConfig: PartnerSRFaxConfig[];
    @ValidateNested()
    public otherConfig: PartnerOtherConfig;
    @ValidateNested()
    public uniteFaxConfig: PartnerUniteFaxConfig[];
    @IsString()
    @IsOptional()
    public outgoingFaxType: string;
    @IsNumber()
    @IsOptional()
    public outgoingFaxId: number;
    @IsOptional()
    public partnerPriority: Priority[];
}

export class PartnerLocation {
    public id: number;
    public region: string;
    public name: string;
    public address: string;
    public payerGroup: string;
    public facilityId: string;
    public state: string;
    public country: string;
    public city: string;
    public isDefault: boolean;
    public active: boolean;
    public timezone: string;
    public latitude: string;
    public longitude: string;
    public createdAt: Date;
    public updatedAt: Date;
    public webAppLocationId: number;
    public vwrPositionMessageToggle: boolean;
    public vwrPatientMovedMessageToggle: boolean;
    public registrationFormName: string;
    public registrationFormLink: string;
    public paymentFormName: string;
    public paymentFormLink: string;

}

export class Priority {

    @IsOptional()
    @IsNumber()
    public id: number;

    @IsOptional()
    @IsString()
    public priority: string;

    @IsOptional()
    @IsBoolean()
    public defaultPriority: boolean;

    @IsOptional()
    @IsNumber()
    public order: number;

}
