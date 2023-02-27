import axios from 'axios';
import FormData from 'form-data';
import { Service } from 'typedi';
import { v4 as uuidv4 } from 'uuid';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import { DocumentFetchResponse, DocumentServiceResponse } from '../controllers/responses/FaxOutboundResponse';

@Service()
export class DocumentManagementServiceClient {

    constructor(
        @Logger(__filename) private logger: LoggerInterface) { }

    /**
     * Save the pdf report file against the patient id in the document service.
     *
     */
    public async saveFile(file: any, partnerId: number, referralId: string, patientId: string, clinicalReports?: string[]): Promise<DocumentServiceResponse> {

        const fileName = uuidv4() + '.pdf';
        try {
            const data = new FormData();
            data.append('document', file, fileName);
            data.append('patientId', patientId);
            if (clinicalReports && clinicalReports.length) {
                data.append('clinicalReports', JSON.stringify(clinicalReports));
            }
            if (referralId) {
                data.append('referralId', referralId);
            }
            data.append('documentClassification', fileName);

            const config = {
                method: 'post',
                url: `${env.serviceMesh.documentService.baseUrl}/internal/patient/file`,
                headers: {
                    'x-partner-id': partnerId,
                    'x-client-name': env.serviceMesh.partner.clientName,
                    'x-client-secret': env.serviceMesh.partner.clientSecret,
                    'apikey': env.serviceMesh.apiKey,
                    ...data.getHeaders(),
                },
                data,
            };

            const response = await axios(config as any);
            this.logger.info(`Successfully saved the report file to document service. ${JSON.stringify(response.data)}`);

            return response.data;
        } catch (ex: any) {
            this.logger.error(`Error occured while saving the Report File to Document service. ${JSON.stringify(ex.message)}`);
            throw Error(`Unable to save the Report file to Document Service.`);
        }
    }

    /**
     * Fetch the pdf report file against the patient id from the document service.
     *
     */
    public async getDocument(partnerId: number, documentId: string, patientId: number): Promise<DocumentFetchResponse> {
        try {
            const config = {
                method: 'get',
                url: `${env.serviceMesh.documentService.baseUrl}/internal/patient/file?patientId=${patientId}&documentId=${documentId}`,
                headers: {
                    'x-partner-id': partnerId,
                    'x-client-name': env.serviceMesh.partner.clientName,
                    'x-client-secret': env.serviceMesh.partner.clientSecret,
                    'apikey': env.serviceMesh.apiKey,
                },
            };

            const response = await axios(config as any);
            this.logger.info(`Successfully fetched the file from the document service. ${JSON.stringify(response.data)}`);

            return response.data;
        } catch (ex: any) {
            this.logger.error(`Error occured while fetching the report file from the document service. ${JSON.stringify(ex)}`);
            throw Error(`Unable to fetch the document file from the document service.`);
        }
    }

}
