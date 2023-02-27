export interface RingCentralSendFaxResponse {
    uri: string;
    id: number;
    to: To[];
    type: string;
    creationTime: string;
    readStatus: string;
    priority: string;
    attachments: Attachment[];
    direction: string;
    availability: string;
    messageStatus: string;
    faxResolution: string;
    faxPageCount: number;
    lastModifiedTime: string;
    coverIndex: number;
}

export interface To {
    phoneNumber: string;
    name: string;
    messageStatus: string;
}

export interface Attachment {
    id: number;
    uri: string;
    type: string;
    contentType: string;
}
