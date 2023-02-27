import { Storage } from '@google-cloud/storage';
import axios, { AxiosError } from 'axios';
import { StatusCodes } from 'http-status-codes';
import mustache from 'mustache';
import { HttpError } from 'routing-controllers';
import { Service } from 'typedi';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { env } from '../../env';
import {  FaxTemplateDataForNoShow, FaxTemplateData } from '../models/FaxTemplateData';
import { DocumentManagementServiceClient } from './DocumentManagementServiceClient';
import { FileProcessorServiceClient } from './FileProcessorServiceClient';
@Service()
export class FileService {

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private documentClientService: DocumentManagementServiceClient,
        private fileProcessingServiceClient: FileProcessorServiceClient) { }

    /**
     *  Fetch the HTML file template and populate the dynamic data using mustache.
     *
     * @param data dynamic data to populate
     * @returns html template content as string
     */
    public async getHtmlFile(data: FaxTemplateData, gcpFilePath: string): Promise<any> {
        try {
            const bucketName = env.storageBucketConfig.bucketName;
            const templateFileBuffer = await this.getGcpFile(bucketName, gcpFilePath);
            return mustache.render(templateFileBuffer.toString('utf8'), data);
        } catch (err) {
            this.logger.error(`Error while generating Html file ${(err as AxiosError).message}`);
            throw new Error('Unable to generate the HTML file from Fax Template.');
        }
    }

    public async getHtmlFileForNoShow(data: FaxTemplateDataForNoShow, partnerId?: number): Promise<any> {
        try {
            const bucketName = env.storageBucketConfig.bucketName;
            const gcpFilePath = env.storageBucketConfig.faxNoShowTemplatePath;
            const templateFileBuffer = await this.getGcpFile(bucketName, gcpFilePath);
            const htmlData = Buffer.from(templateFileBuffer);
            const d1 = mustache.render(htmlData.toString('utf8'), data);
            return d1;
        } catch (err) {
            this.logger.error(`Error while generating Html file ${(err as AxiosError).message}`);
            throw new Error('Unable to generate the HTML file from Fax Template.');
        }
    }

    /**
     * Fetches the file as buffer at the given gcpFilePath and bucketName.
     *
     * @param bucketName GCP bucket name
     * @param gcpFilePath File complete path
     * @returns string representation of the file
     */
    public async getGcpFile(bucketName: string, gcpFilePath: string): Promise<any> {
        this.logger.info(`Bucket name: ${bucketName},  gcp path: ${gcpFilePath}`);
        try {
            const file = await new Storage()
                .bucket(bucketName)
                .file(gcpFilePath)
                .download();

            if (file[0] === undefined) { throw new Error(`No file found at the given path ${gcpFilePath}.`); }

            return file[0];
        } catch (err) {
            this.logger.error(`Unable to fetch file from gcp path ${gcpFilePath} and bucket: ${bucketName}.`, err);
            throw new Error('Unable to fetch the file from GCP.');
        }
    }

    /**
     * Creates a pdf file and returns its buffer
     *
     * @param htmlContent convert to pdf
     * @returns Buffer
     */
    public async generatePdfFileBuffer(htmlContent: string): Promise<any> {
        try {
            try {
                // Generate the pdf file from html file.
                const fileProcessingRes = await this.fileProcessingServiceClient.generatePdfFromHtml(Buffer.from(htmlContent));
                this.logger.info(`Successfully generated PDF file at URL ${fileProcessingRes.documents[0].url}`);

                const url = fileProcessingRes.documents[0].url;
                const res = await axios({
                    url,
                    method: 'GET',
                    responseType: 'arraybuffer',
                });

                return Buffer.from(res.data);
            } catch (err) {
                this.logger.error(`Error while creating PDF ${(err as AxiosError).message}`);
                throw new Error('Unable to generate and send fax.');
            }

        } catch (err) {
            this.logger.error(`Error while creating PDF. ${(err as AxiosError).message} `);
            throw new Error('Unable to generate and send fax.');
        }
    }

    /**
     * Fetches a document file and generates a file buffer
     *
     * @param partnerId
     * @param patientId
     * @param documentId
     * @returns
     */
    public async getDocumentFileBuffer(partnerId: number, patientId: number, documentId: string): Promise<any> {
        this.logger.info(`Fetching the document file and generating buffer for patientId: ${patientId} and documentId: ${documentId}`);

        try {
            const documentResponse = await this.documentClientService.getDocument(partnerId, documentId, patientId);
            return this.getFileBuffer(documentResponse.result.file);
        } catch (error) {
            this.logger.error(`Error occured while fetching and generating the file buffer: ${JSON.stringify(error)}`);
            throw new HttpError(StatusCodes.INTERNAL_SERVER_ERROR, (error as Error).message);
        }
    }

    /**
     * Generate the file buffer for a given file url
     *
     * @param fileUrl
     * @returns
     */
    public async getFileBuffer(fileUrl: string): Promise<any> {
        this.logger.info(`Generating the file buffer`);
        try {
            const res = await axios({
                url: fileUrl,
                method: 'GET',
                responseType: 'arraybuffer',
            });

            return Buffer.from(res.data);
        } catch (ex: any) {
            this.logger.error(`Error occured while generating the file buffer: ${JSON.stringify(ex)}`);
            throw Error(`Error occured while generating the file buffer`);
        }
    }

}
