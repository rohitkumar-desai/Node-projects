import { Body, HeaderParam, HttpCode, JsonController, Post, Get, Res, Param } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { Response } from 'express';
import { SaveFaxRequest } from './requests/SaveFaxRequest';
import { FaxUploadService } from '../services/FaxUploadService';
import { FaxClient } from '../services/FaxClient';
import express from 'express';
@JsonController()
export class FaxController {

    constructor(private faxUploadService: FaxUploadService, private faxClient: FaxClient) { }

    @Post('/save')
    @HttpCode(StatusCodes.CREATED)
    public async createFax(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() faxTemplate: SaveFaxRequest,
        @Res() response: express.Response): Promise<express.Response> {
        await this.faxUploadService.saveFax(faxTemplate, partnerId);
        return response.status(StatusCodes.CREATED).send();
    }

    // retry fax
    @Get('/retry/:id')
    @HttpCode(StatusCodes.OK)
    public async retryFax(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Param('id') id: number,
        @Res() response: Response): Promise<any> {
        await this.faxClient.retryFax(partnerId, id);
        return response.status(StatusCodes.OK).send();
    }

    // retry fax
    @Get('/auto-retry')
    @HttpCode(StatusCodes.OK)
    public async autoRetryFax(): Promise<void> {
        return this.faxClient.autoRetryFax();
    }

}
