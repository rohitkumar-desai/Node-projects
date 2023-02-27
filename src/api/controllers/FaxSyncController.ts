import { HeaderParam, HttpCode, JsonController, Res, Body, Post, Get } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import express from 'express';
import { FaxOneTimeSyncService } from '../services/FaxOneTimeSyncService';
import { FaxSyncRequestModel } from '../models/FaxDetails';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FaxRealTimeSyncService } from '../services/FaxRealTimeSyncService';

@JsonController('/sync')
export class FaxController {

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private faxOneTimeSyncService: FaxOneTimeSyncService,
        private faxRealTimeSyncService: FaxRealTimeSyncService
    ) { }

    // Get Fax from SRFAX,RING-CENTRAL using cron job
    @Get()
    @HttpCode(StatusCodes.OK)
    public async getFaxDetails(): Promise<void> {
        return this.faxRealTimeSyncService.fetchFaxDetails();
    }

    // Sync Fax from Fax Provider in given time range
    @Post('/one-time')
    @HttpCode(StatusCodes.OK)
    public async syncFaxesByTimeRange(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() faxSyncRequest: FaxSyncRequestModel,
        @Res() response: express.Response
    ): Promise<express.Response> {
        this.logger.info(`Syncing faxes for partnerId: ${partnerId} with request ${JSON.stringify(faxSyncRequest)}`);
        return response.send(await this.faxOneTimeSyncService.syncFaxesByTimeRange(partnerId, faxSyncRequest));
    }

}
