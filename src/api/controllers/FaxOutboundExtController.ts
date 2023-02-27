import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { Body, HeaderParam, HttpCode, JsonController, Post, Res, UseBefore } from 'routing-controllers';
import { AuthenticationMiddleware } from 'security-util';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FaxOutboundForNoShow, FaxSendReferral } from '../models/FaxOutbound';
import { FaxOutboundService } from '../services/FaxOutboundService';
@JsonController('/ext')
@UseBefore(AuthenticationMiddleware)
export class FaxUploadController {

    constructor(@Logger(__filename) private logger: LoggerInterface,
        private faxOutBoundService: FaxOutboundService,) { }


    @Post('/no-show')
    @HttpCode(StatusCodes.ACCEPTED)
    public async sendFaxForNoShow(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() faxOutBound: FaxOutboundForNoShow,
        @Res() response: express.Response
    ): Promise<express.Response> {
        this.logger.info(`Processing request for PartnerId: ${partnerId} and faxOutbound object ${JSON.stringify(faxOutBound)}`);
        const sendResult = await this.faxOutBoundService.sendOutboundFaxForNoShow(partnerId, faxOutBound);
        return response.status(StatusCodes.ACCEPTED).send(sendResult);
    }
    //To decline a referral
    @Post('/referral/declined')
    @HttpCode(StatusCodes.ACCEPTED)
    public async referralDeclined(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() faxOutBound: FaxSendReferral,
        @Res() response: express.Response
    ): Promise<express.Response> {
        await this.faxOutBoundService.referralDeclined(partnerId, faxOutBound);
        return response.status(StatusCodes.ACCEPTED).send();
    }
}
