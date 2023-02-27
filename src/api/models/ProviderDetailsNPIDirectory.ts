export interface ProviderDetailsNPIDirectory {
    is_success: boolean;
    counts: number;
    limit: number;
    offset: number;
    data: Data[];
}

export interface Data {
    physician_id: number;
    EntityType: string;
    ProviderBillingNo: string;
    ProviderCode: string;
    ProviderLastName: string;
    ProviderFirstName: string;
    ProviderName: string;
    ProviderLocationInfo: ProviderLocationInfo[];
}

export interface ProviderLocationInfo {
    location_id: number;
    ProviderPracticeAddress1: string;
    ProviderPracticeAddress2: string;
    ProviderPracticeCity: string;
    ProviderPracticeState: string;
    ProviderPracticeCountry: string;
    ProviderPracticeZip: string;
    ProviderPracticeTelephone: string;
    ProviderPracticeFax: string;
}
