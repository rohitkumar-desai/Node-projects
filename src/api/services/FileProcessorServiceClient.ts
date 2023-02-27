import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import { FileProcessing } from '../models/FileProcessing';
import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import FormData from 'form-data';
import { v4 as uuidv4 } from 'uuid';

/**
 * File Processing Service Client class to create Pdf files.
 */
@Service()
export class FileProcessorServiceClient {

    constructor(@Logger(__filename) private logger: LoggerInterface) { }

    /**
     * Convert Html file buffer to Pdf.
     * @param fileBuffer hmtl file buffer to convert
     * @returns FileProcessing
     */
    public async generatePdfFromHtml(fileBuffer: Buffer): Promise<FileProcessing> {
        this.logger.info(`Generating PDF file from the FileProcessor Service.`);

        const fileName = uuidv4() + '.html';
        try {
            const data = new FormData();
            data.append('file', fileBuffer, fileName);

            const config = {
                method: 'post',
                url: `${env.serviceMesh.fileProcesing.baseUrl}/convert_to_pdf`,
                headers: {
                    'Content-Type': 'multipart/form-data',
                    ...data.getHeaders(),
                },
                data,
            };

            const response = await axios(config as any);
            return response.data;
        } catch (err) {
            this.logger.error((err as AxiosError).response.data.message);
            throw new Error('Unable to create Pdf from the File Processing service.');
        }

    }

    public async extractClinicalNoteFromReportPdf(fileBuffer: Buffer, filename?: string): Promise<string[]> {

        let clinicalNotes: string[];
        try {
            const data = new FormData();
            data.append('file', fileBuffer, filename || 'fileName');
            const config: AxiosRequestConfig = {
                method: 'post',
                url: `${env.serviceMesh.docAIService.clinical_report}`,
                headers: {
                    accept: 'application/json',
                    ...data.getHeaders(),
                },
                data,
            };
            const response = await axios(config);
            clinicalNotes = response.data && response.data.data.map(notes => notes.clinical_note.note && notes.clinical_note.note.raw_text) || [];

            return clinicalNotes;
        } catch (err) {
            this.logger.warn(`Unable to extract clinical reports ${(err as Error).message}`);
            return [];
        }
    }
}
