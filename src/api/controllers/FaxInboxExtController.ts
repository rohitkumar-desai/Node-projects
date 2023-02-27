import { StatusCodes } from 'http-status-codes';
import { HttpCode, JsonController, HeaderParam, Res, Get, Delete, Param, QueryParams, UseBefore } from 'routing-controllers';
import express from 'express';
import { PaginationParams } from './requests/SrFaxConfig';
import { FaxClient } from '../services/FaxClient';
import { AuthenticationMiddleware } from 'security-util';
import { FaxStatus, FaxDelete } from '../models/FaxDetails';
@JsonController('/ext/inbox')
@UseBefore(AuthenticationMiddleware)
export class FaxInboxController {

    constructor(
        private faxClient: FaxClient) { }

    // Delete Fax By ID
    @Delete('/:id/:status')
    @HttpCode(StatusCodes.OK)
    public async deleteFaxByID(
        @Param('id') id: number,
        @Param('status') status: FaxStatus,
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Res() response: express.Response): Promise<express.Response> {
        return response.status(200).send(await this.faxClient.deleteFax(partnerId, id, status));
    }
    // Get fax list
    @Get('/list')
    @HttpCode(StatusCodes.OK)
    public async getFaxes(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @QueryParams() query: PaginationParams,
        @Res() response: express.Response): Promise<express.Response> {
        return response.status(StatusCodes.OK).json(await this.faxClient.getFaxList(partnerId, query));
    }
    // Delete Fax
    @Delete('/v2')
    @HttpCode(StatusCodes.OK)
    public async deleteFaxes(
        @QueryParams() query: FaxDelete,
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Res() response: express.Response): Promise<express.Response> {
        await this.faxClient.deleteFaxes(partnerId, query)
        return response.status(StatusCodes.OK).send();
    }

}
