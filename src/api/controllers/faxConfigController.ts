import { StatusCodes } from 'http-status-codes';
import { HttpCode, JsonController, Get, HeaderParam, Res } from 'routing-controllers';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import express from 'express';
import { FaxClient } from '../services/FaxClient';
@JsonController('/srfax')
export class FaxConfigController {

    constructor(
        private faxClient: FaxClient,
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
}
