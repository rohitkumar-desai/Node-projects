import express from 'express';
import { StatusCodes } from 'http-status-codes';
import { Body, HeaderParam, HttpCode, JsonController, Post, Res, UploadedFile } from 'routing-controllers';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FaxOutbound, FaxOutboundExt, FaxOutboundForNoShow, FaxOutboundV2 } from '../models/FaxOutbound';
import { FaxOutboundService } from '../services/FaxOutboundService';
import { FaxOutboundV2Service } from '../services/FaxOutboundV2Service';

@JsonController()
export class FaxOutboundController {

    constructor(
        @Logger(__filename) private logger: LoggerInterface,
        private faxOutBoundService: FaxOutboundService,
        private faxOutboundV2Service: FaxOutboundV2Service
    ) { }

    @Post('/outbound')
    @HttpCode(StatusCodes.ACCEPTED)
    public async sendOutboundFax(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() faxOutBound: FaxOutbound,
        @Res() response: express.Response
    ): Promise<express.Response> {
        this.logger.info(`Processing request for PartnerId: ${partnerId} and faxOutbound object ${JSON.stringify(faxOutBound)}`);
        await this.faxOutBoundService.sendOutboundFax(partnerId, faxOutBound);
        return response.status(StatusCodes.ACCEPTED).send();
    }

    @Post('/v2/outbound')
    @HttpCode(StatusCodes.ACCEPTED)
    public async sendFaxPostAppointment(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @UploadedFile('document') file: any,
        @Body() faxOutBound: FaxOutboundV2,
        @Res() response: express.Response
    ): Promise<express.Response> {
        this.logger.info(`Processing request for PartnerId: ${partnerId} and faxOutbound object ${JSON.stringify(faxOutBound)}`);
        await this.faxOutBoundService.sendOutboundFaxV2(partnerId, file, faxOutBound);
        return response.status(StatusCodes.ACCEPTED).send();
    }

    @Post('/v3/outbound')
    @HttpCode(StatusCodes.ACCEPTED)
    public async sendFaxExt(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() faxOutBound: FaxOutboundExt,
        @Res() response: express.Response
    ): Promise<express.Response> {
        this.logger.info(`Processing request for PartnerId: ${partnerId} and faxOutbound object ${JSON.stringify(faxOutBound)}`);
        const sendResult = await this.faxOutBoundService.sendOutboundFaxExt(partnerId, faxOutBound);
        return response.status(StatusCodes.ACCEPTED).send(sendResult);
    }

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

    // This is common endpoint to send fax for Appt booking, decline referral, no show, etc. through SRFAX, Unite-Fax or Ring-Central
    @Post('/send')
    @HttpCode(StatusCodes.ACCEPTED)
    // Keeping faxSendData as any, because faxParam can be different as per template.
    public async sendFax(
        @HeaderParam('x-partner-id', { required: true }) partnerId: number,
        @Body() faxSendData: any,
        @Res() response: express.Response
    ): Promise<express.Response> {
        return response.status(StatusCodes.ACCEPTED).send(await this.faxOutboundV2Service.sendFax(faxSendData, partnerId));
    }
}
