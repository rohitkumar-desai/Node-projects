import { Response } from 'express';
import { StatusCodes } from 'http-status-codes';
import {Body, HeaderParam, HttpCode, JsonController, Post, Res} from 'routing-controllers';

import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FaxNotificationService } from '../services/FaxNotificationService';
import { FaxNotificationRequest } from './requests/FaxNotificationRequest';

@JsonController()
export class FaxNotificationController {
    constructor(@Logger(__filename) private logger: LoggerInterface,
                private faxNotificationService: FaxNotificationService) { }

    @Post('/notification')
    @HttpCode(StatusCodes.ACCEPTED)
    public async broadcastNotification(
        @HeaderParam('x-partner-id') partnerId: string,
        @HeaderParam('authorization') token: string,
        @Body() requestBody: FaxNotificationRequest,
        @Res() response: Response
    ): Promise<Response> {
        this.logger.info(`Partner id :  ${partnerId}`);
        return response.status(StatusCodes.CREATED).send(await this.faxNotificationService.broadcastNotificationByTopics(partnerId, requestBody, token));
    }

    @Post('/subscription')
    @HttpCode(StatusCodes.ACCEPTED)
    public async subscribeUser(
        @HeaderParam('x-partner-id') partnerId: number,
        @HeaderParam('authorization') token: string,
        @Body() requestBody: FaxNotificationRequest,
        @Res() response: Response
    ): Promise<Response> {
        return response.status(StatusCodes.CREATED).send(await this.faxNotificationService.subscribeUser(token, partnerId, requestBody));
    }

    @Post('/unsubscribe')
    @HttpCode(StatusCodes.ACCEPTED)
    public async unsubscribeUser(
        @HeaderParam('x-partner-id') partnerId: number,
        @HeaderParam('authorization') token: string,
        @Body() requestBody: FaxNotificationRequest,
        @Res() response: Response
    ): Promise<Response> {
        return response.status(StatusCodes.CREATED).send(await this.faxNotificationService.unsubscribeUser(token, partnerId, requestBody));
    }

}
