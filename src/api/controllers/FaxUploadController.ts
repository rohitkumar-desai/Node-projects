import { Post, HttpCode, JsonController, Res, UploadedFile, HeaderParam, QueryParam, Get, Body, Patch } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { FaxUploadService } from '../services/FaxUploadService';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FaxDetail, FaxUpdate, FaxUploadCallbackRequest } from '../models/FaxDetails';
import express, { Response } from 'express';
@JsonController('/upload')
export class FaxUploadController {

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private faxUploadService: FaxUploadService) { }

    @Post('/files')
    @HttpCode(StatusCodes.OK)
    public async saveFile(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @UploadedFile('document') file: any, @QueryParam('id') id: string,
        @Res() response: express.Response): Promise<express.Response> {
        this.logger.info(`partnerId  `, partnerId);
        const newResult = await this.faxUploadService.uploadFaxesFile(file, partnerId, id);
        return response.status(StatusCodes.OK).json(newResult);
    }

    // Get fax by ID
    @Get('/id')
    @HttpCode(StatusCodes.OK)
    public async getAllDocument(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @QueryParam('id') id: string,
        @Res() response: express.Response): Promise<express.Response> {
        this.logger.info(`parnter ID  :  ${partnerId}`);
        return response.status(200).json(await this.faxUploadService.findFaxbyid(partnerId, id));
    }

    // Convert file and save into GCS
    @Post('/fax-upload')
    @HttpCode(StatusCodes.OK)
    public async faxUpload(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @UploadedFile('document') file: any,
        @Body() request: FaxUpdate,
        @Res() response: express.Response): Promise<express.Response> {
        this.logger.info(`partnerId  `, partnerId);
        const newResult = await this.faxUploadService.faxUpload(file, partnerId, request);
        return response.status(StatusCodes.OK).json(newResult);
    }

    @Post('/callback')
    @HttpCode(StatusCodes.ACCEPTED)
    public async faxUploadCallback(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() request: FaxUploadCallbackRequest,
        @Res() response: Response): Promise<Response> {

        const processing_status = await this.faxUploadService.faxUploadFromGcpUrl(partnerId, request);
        if (!processing_status) {
            return response.status(StatusCodes.NOT_FOUND).send();
        }
        return response.status(StatusCodes.ACCEPTED).send();
    }

    // To change Fax Upload processing status.
    @Patch('/processing-status')
    @HttpCode(StatusCodes.ACCEPTED)
    public async updateFaxUploadProcessingStatus(
        @HeaderParam('x-partner-id', { required: true }) partnerId: string,
        @Body() request: FaxDetail, @Res() response: Response): Promise<Response> {
        await this.faxUploadService.updateFaxUploadProcessingStatus(partnerId, request);
        return response.status(StatusCodes.ACCEPTED).send();
    }

    // To count number of Uploaded Faxes according to partner.
    @Get('/fax-count')
    @HttpCode(StatusCodes.OK)
    public async getFaxCount(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number, @Res() response: Response): Promise<express.Response> {
        return response.status(StatusCodes.OK).json(await this.faxUploadService.getFaxCount(partnerId));
    }
}
