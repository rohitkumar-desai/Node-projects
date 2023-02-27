
export interface ProviderDetailsByNPI {
    id: number;
    emrId: string;
    premierGroup?: null;
    premierLocationId?: null;
    emrLocationId: number;
    type: string;
    firstName: string;
    lastName: string;
    emailId?: null;
    instructions?: null;
    visitMinutes?: null;
    phoneNumber: string;
    faxNumber?: null;
    password?: null;
    cpsoNumber?: null;
    officeId?: null;
    partnerId: number;
    webPhysicianId: number;
    status: string;
    loginKey?: null;
    active: boolean;
    preferredTemplateCode: string;
    createdAt: string;
    updatedAt: string;
    vwrPositionMessageToggle: boolean;
    vwrPatientMovedMessageToggle: boolean;
}
