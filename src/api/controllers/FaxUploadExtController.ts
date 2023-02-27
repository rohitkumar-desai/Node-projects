import { Post, HttpCode, JsonController, Res, UploadedFile, HeaderParam,Body, UseBefore } from 'routing-controllers';
import { StatusCodes } from 'http-status-codes';
import { FaxUploadService } from '../services/FaxUploadService';
import { Logger, LoggerInterface } from '../../decorators/Logger';
import { FaxUpdate } from '../models/FaxDetails';
import express from 'express';
import { AuthenticationMiddleware } from 'security-util';
@JsonController('/ext/upload')
@UseBefore(AuthenticationMiddleware)
export class FaxUploadController {

    constructor(@Logger(__filename) private logger: LoggerInterface,
                private faxUploadService: FaxUploadService) { }

    // Convert file and save into GCS
    @Post('/fax-upload')
    @HttpCode(StatusCodes.OK)
    public async faxUpload(@HeaderParam('x-partner-id', { required: true }) partnerId: number,
                           @UploadedFile('document') file: any,
                           @Body() request: FaxUpdate,
                           @Res() response: express.Response): Promise<express.Response> {
        this.logger.info(`Received fax upload request for partner Id ${partnerId}`);
        const newResult = await this.faxUploadService.faxUpload(file, partnerId, request);
        return response.status(StatusCodes.OK).json(newResult);
    }
}
