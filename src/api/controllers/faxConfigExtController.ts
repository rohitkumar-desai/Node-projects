import { StatusCodes } from 'http-status-codes';
import { HttpCode, JsonController, Get, HeaderParam, Res, UseBefore } from 'routing-controllers';
import express from 'express';
import { FaxClient } from '../services/FaxClient';
import { AuthenticationMiddleware } from 'security-util';
@JsonController('/ext/srfax')
@UseBefore(AuthenticationMiddleware)
export class FaxConfigController {

    constructor(
        private faxClient: FaxClient) { }

    // Get All Files
    @Get('/files')
    @HttpCode(StatusCodes.OK)
    public async getAllDocument(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Res() response: express.Response): Promise<express.Response> {
        return response.status(200).json(await this.faxClient.findAllFaxes(partnerId));
    }

}
