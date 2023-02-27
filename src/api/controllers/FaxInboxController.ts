import { StatusCodes } from 'http-status-codes';
import { HttpCode, JsonController, Get, HeaderParam, Res, Delete, Param, QueryParams, Body, Post } from 'routing-controllers';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import express from 'express';
import { PaginationParams, SerchDateParams } from './requests/SrFaxConfig';
import { FaxClient } from '../services/FaxClient';
import { FaxStatus } from '../models/FaxDetails';
import { FaxUploadService } from '../services/FaxUploadService';
import { SaveFaxRequest } from './requests/SaveFaxRequest';
import { Response } from 'express';

@JsonController('/inbox')
export class FaxInboxController {

    constructor(
        private faxClient: FaxClient,
        private faxUploadService: FaxUploadService,
        @Logger(__filename) private logger: LoggerInterface) { }

    // Get All Files
    @Get('/files')
    @HttpCode(StatusCodes.OK)
    public async getAllDocument(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Res() response: express.Response): Promise<express.Response> {
        this.logger.info(`partner ID  :  ${partnerId}`);
        return response.status(200).json(await this.faxClient.findAllFaxes(partnerId));
    }

    // Delete Fax By ID
    @Delete('/:id/:status')
    @HttpCode(StatusCodes.OK)
    public async deleteFaxByID(
        @Param('id') id: number,
        @Param('status') status: FaxStatus,
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Res() response: express.Response): Promise<express.Response> {
        this.logger.info(`partner ID nd doc ID for delete fax :  ${partnerId},${id},${status}`);
        return response.status(200).send(await this.faxClient.deleteFax(partnerId, id, status));
    }

    // Get All Fax data including pagination
    @Get('/list')
    @HttpCode(StatusCodes.OK)
    public async getAllDocuments(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @QueryParams() query: PaginationParams,
        @Res() response: express.Response): Promise<express.Response> {
        this.logger.info(`query params:  ${JSON.stringify(query)} for partner ${partnerId}`);
        const page = query.page;
        const limit = query.limit;
        const result = await this.faxClient.findAll(partnerId, page, limit);
        return response.status(StatusCodes.OK).json({ result });
    }

    // Get Fax, referral, save, delete count
    @Get('/analytics')
    @HttpCode(StatusCodes.OK)
    public async getFaxCountByDate(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @QueryParams() query: SerchDateParams,
        @Res() response: express.Response): Promise<express.Response> {
        const startDate = query.startDate;
        const endDate = query.endDate;
        return response.status(StatusCodes.OK).json(await this.faxClient.faxCountByDate(partnerId, startDate, endDate));
    }

    @Post('/save')
    @HttpCode(StatusCodes.CREATED)
    public async createFax(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() faxTemplate: SaveFaxRequest,
        @Res() response: Response): Promise<any> {
        await this.faxUploadService.saveFax(faxTemplate, partnerId);
        return response.status(StatusCodes.CREATED).send();
    }
}
