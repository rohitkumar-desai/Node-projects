export interface FileProcessing {
    success: boolean;
    documents: Document[];
}

export interface Document {
    index: number;
    url: string;
}
